import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

// GET /api/groups - List all groups with member counts
export async function GET() {
  try {
    const { data: groups, error } = await supabaseServer
      .from('groups')
      .select(`
        *,
        members:group_members(
          id,
          player_id,
          joined_at,
          player:players(*)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transform the data to include member_count and keep members
    const groupsWithCounts = groups?.map(group => ({
      ...group,
      member_count: group.members?.length || 0,
    }));

    return NextResponse.json(groupsWithCounts || []);
  } catch (error) {
    console.error('Error fetching groups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch groups' },
      { status: 500 }
    );
  }
}

// POST /api/groups - Create a new group
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, member_ids } = body;

    if (!name || !member_ids || !Array.isArray(member_ids)) {
      return NextResponse.json(
        { error: 'Name and member_ids array are required' },
        { status: 400 }
      );
    }

    if (member_ids.length < 2 || member_ids.length > 4) {
      return NextResponse.json(
        { error: 'Groups must have between 2 and 4 members' },
        { status: 400 }
      );
    }

    // Create the group
    const { data: group, error: groupError } = await supabaseServer
      .from('groups')
      .insert({ name })
      .select()
      .single();

    if (groupError) throw groupError;

    // Add members to the group
    const members = member_ids.map((player_id: string) => ({
      group_id: group.id,
      player_id,
    }));

    const { error: membersError } = await supabaseServer
      .from('group_members')
      .insert(members);

    if (membersError) {
      // Rollback: delete the group if adding members fails
      await supabaseServer.from('groups').delete().eq('id', group.id);
      throw membersError;
    }

    // Update queue entries for these players if they're in the queue
    const { data: queueEntries } = await supabaseServer
      .from('queue')
      .select('id, player_id, position')
      .in('player_id', member_ids)
      .eq('status', 'waiting');

    if (queueEntries && queueEntries.length > 0) {
      // Update all queue entries for these players to have the same group_id
      const { error: queueUpdateError } = await supabaseServer
        .from('queue')
        .update({ group_id: group.id })
        .in('player_id', member_ids)
        .eq('status', 'waiting');

      if (queueUpdateError) {
        console.error('Error updating queue with group_id:', queueUpdateError);
        // Don't fail the group creation, just log the error
      }
    }

    // Fetch the complete group with members
    const { data: completeGroup } = await supabaseServer
      .from('groups')
      .select(`
        *,
        members:group_members(
          id,
          player_id,
          joined_at,
          player:players(*)
        )
      `)
      .eq('id', group.id)
      .single();

    return NextResponse.json(completeGroup, { status: 201 });
  } catch (error) {
    console.error('Error creating group:', error);
    return NextResponse.json(
      { error: 'Failed to create group' },
      { status: 500 }
    );
  }
}

// DELETE /api/groups - Delete all groups
export async function DELETE() {
  try {
    // First, get all group members to update their queue entries
    const { data: groupMembers, error: membersError } = await supabaseServer
      .from('group_members')
      .select('player_id');

    if (membersError) throw membersError;

    // Update queue entries to remove group_id for all group members
    if (groupMembers && groupMembers.length > 0) {
      const playerIds = [...new Set(groupMembers.map(m => m.player_id))];
      
      const { error: queueUpdateError } = await supabaseServer
        .from('queue')
        .update({ group_id: null })
        .in('player_id', playerIds);

      if (queueUpdateError) {
        console.error('Error updating queue entries:', queueUpdateError);
        // Don't fail the deletion, just log the error
      }
    }

    // Delete all group members first (foreign key constraint)
    const { error: deleteMembersError } = await supabaseServer
      .from('group_members')
      .delete()
      .gte('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

    if (deleteMembersError) throw deleteMembersError;

    // Delete all groups
    const { error: deleteGroupsError } = await supabaseServer
      .from('groups')
      .delete()
      .gte('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

    if (deleteGroupsError) throw deleteGroupsError;

    return NextResponse.json({ 
      message: 'All groups deleted successfully',
      deletedMembersCount: groupMembers?.length || 0
    });
  } catch (error) {
    console.error('Error deleting all groups:', error);
    return NextResponse.json(
      { error: 'Failed to delete all groups' },
      { status: 500 }
    );
  }
}
