import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

// POST /api/groups/[id]/members - Add a member to a group
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { player_id } = body;

    if (!player_id) {
      return NextResponse.json(
        { error: 'player_id is required' },
        { status: 400 }
      );
    }

    // Check if group exists
    const { data: group } = await supabaseServer
      .from('groups')
      .select('id')
      .eq('id', id)
      .single();

    if (!group) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    // Check current member count
    const { count } = await supabaseServer
      .from('group_members')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', id);

    if (count !== null && count >= 4) {
      return NextResponse.json(
        { error: 'Group is full (maximum 4 members)' },
        { status: 400 }
      );
    }

    // Check if player already in group
    const { data: existing } = await supabaseServer
      .from('group_members')
      .select('id')
      .eq('group_id', id)
      .eq('player_id', player_id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Player is already in this group' },
        { status: 400 }
      );
    }

    // Add member
    const { data: member, error } = await supabaseServer
      .from('group_members')
      .insert({
        group_id: id,
        player_id,
      })
      .select(`
        *,
        player:players(*)
      `)
      .single();

    if (error) throw error;

    // Update queue entry for this player if they're in the queue
    const { error: queueUpdateError } = await supabaseServer
      .from('queue')
      .update({ group_id: id })
      .eq('player_id', player_id)
      .eq('status', 'waiting');

    if (queueUpdateError) {
      console.error('Error updating queue with group_id:', queueUpdateError);
      // Don't fail the member addition, just log the error
    }

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    console.error('Error adding group member:', error);
    return NextResponse.json(
      { error: 'Failed to add member to group' },
      { status: 500 }
    );
  }
}

// DELETE /api/groups/[id]/members/[playerId] - Remove a member from a group
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const playerId = url.searchParams.get('playerId');

    if (!playerId) {
      return NextResponse.json(
        { error: 'playerId query parameter is required' },
        { status: 400 }
      );
    }

    // Check current member count
    const { count } = await supabaseServer
      .from('group_members')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', id);

    if (count !== null && count <= 2) {
      return NextResponse.json(
        { error: 'Cannot remove member - groups must have at least 2 members' },
        { status: 400 }
      );
    }

    // Remove member
    const { error } = await supabaseServer
      .from('group_members')
      .delete()
      .eq('group_id', id)
      .eq('player_id', playerId);

    if (error) throw error;

    // Clear group_id from queue entry for this player
    const { error: queueUpdateError } = await supabaseServer
      .from('queue')
      .update({ group_id: null })
      .eq('player_id', playerId)
      .eq('status', 'waiting');

    if (queueUpdateError) {
      console.error('Error clearing group_id from queue:', queueUpdateError);
      // Don't fail the member removal, just log the error
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing group member:', error);
    return NextResponse.json(
      { error: 'Failed to remove member from group' },
      { status: 500 }
    );
  }
}
