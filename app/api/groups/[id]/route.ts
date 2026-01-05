import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

// GET /api/groups/[id] - Get a specific group with members
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const { data: group, error } = await supabaseServer
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
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!group) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    // Transform to include member_count
    const groupWithCount = {
      ...group,
      member_count: group.members?.length || 0,
    };

    return NextResponse.json(groupWithCount);
  } catch (error) {
    console.error('Error fetching group:', error);
    return NextResponse.json(
      { error: 'Failed to fetch group' },
      { status: 500 }
    );
  }
}

// PUT /api/groups/[id] - Update a group (name only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const { data: group, error } = await supabaseServer
      .from('groups')
      .update({ name })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(group);
  } catch (error) {
    console.error('Error updating group:', error);
    return NextResponse.json(
      { error: 'Failed to update group' },
      { status: 500 }
    );
  }
}

// DELETE /api/groups/[id] - Delete a group
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check if group is currently in queue
    const { data: queueEntries } = await supabaseServer
      .from('queue')
      .select('id')
      .eq('group_id', id)
      .eq('status', 'waiting');

    if (queueEntries && queueEntries.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete group while it is in the queue' },
        { status: 400 }
      );
    }

    // Clear group_id from any queue entries (in case of completed/expired entries)
    await supabaseServer
      .from('queue')
      .update({ group_id: null })
      .eq('group_id', id);

    const { error } = await supabaseServer
      .from('groups')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting group:', error);
    return NextResponse.json(
      { error: 'Failed to delete group' },
      { status: 500 }
    );
  }
}
