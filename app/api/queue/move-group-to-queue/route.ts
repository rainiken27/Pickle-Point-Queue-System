import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Check Supabase connection first
    if (!supabaseServer) {
      throw new Error('Supabase client not initialized');
    }

    const { group_id } = await request.json();

    if (!group_id) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
    }

    // Get all waitlist entries for this group
    const { data: waitlistEntries, error: fetchError } = await supabaseServer
      .from('queue')
      .select('*')
      .eq('group_id', group_id)
      .eq('status', 'waitlist');

    if (fetchError) {
      console.error('Error fetching waitlist entries:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch waitlist entries' }, { status: 500 });
    }

    if (!waitlistEntries || waitlistEntries.length === 0) {
      return NextResponse.json({ error: 'No waitlist entries found for this group' }, { status: 404 });
    }

    // Update all group entries from waitlist to waiting status
    const { data: updatedEntries, error: updateError } = await supabaseServer
      .from('queue')
      .update({ status: 'waiting' })
      .eq('group_id', group_id)
      .eq('status', 'waitlist')
      .select();

    if (updateError) {
      console.error('Error updating queue entries:', updateError);
      return NextResponse.json({ error: 'Failed to update queue entries' }, { status: 500 });
    }

    // Recalculate positions for all queue entries
    const positionError = await recalculatePositions(supabaseServer);

    if (positionError) {
      console.error('Error recalculating positions:', positionError);
      return NextResponse.json({ error: 'Failed to recalculate positions' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Moved group ${group_id} with ${updatedEntries?.length || 0} members back to queue`,
      updatedEntries
    });

  } catch (error) {
    console.error('Error in move-group-to-queue:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function recalculatePositions(supabase: any) {
  // Get all queue entries sorted by their current position
  const { data: allEntries, error: fetchError } = await supabase
    .from('queue')
    .select('*')
    .order('position', { ascending: true });

  if (fetchError) return fetchError;

  // Separate waiting and waitlist entries
  const waitingEntries = allEntries?.filter((entry: any) => entry.status === 'waiting') || [];
  const waitlistEntries = allEntries?.filter((entry: any) => entry.status === 'waitlist') || [];

  // Calculate new positions
  let newPosition = 1;

  // Assign positions to waiting entries first
  for (const entry of waitingEntries) {
    const { error: updateError } = await supabase
      .from('queue')
      .update({ position: newPosition })
      .eq('id', entry.id);
    
    if (updateError) return updateError;
    newPosition++;
  }

  // Assign positions to waitlist entries
  for (const entry of waitlistEntries) {
    const { error: updateError } = await supabase
      .from('queue')
      .update({ position: newPosition })
      .eq('id', entry.id);
    
    if (updateError) return updateError;
    newPosition++;
  }

  return null;
}
