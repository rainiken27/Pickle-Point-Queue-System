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

    // Recalculate positions - moved group should go to BOTTOM of waiting queue
    const movedEntryIds = updatedEntries?.map((entry: any) => entry.id) || [];
    const positionError = await recalculatePositions(supabaseServer, movedEntryIds);

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

async function recalculatePositions(supabase: any, movedEntryIds: string[] = []) {
  // Get all waiting entries (excluding newly moved ones for now)
  const { data: existingWaitingEntries, error: fetchError } = await supabase
    .from('queue')
    .select('*')
    .eq('status', 'waiting')
    .not('id', 'in', movedEntryIds.length > 0 ? movedEntryIds : [''])
    .order('position', { ascending: true });

  if (fetchError) return fetchError;

  // Get the newly moved entries
  const { data: newlyMovedEntries, error: movedError } = await supabase
    .from('queue')
    .select('*')
    .eq('status', 'waiting')
    .in('id', movedEntryIds)
    .order('created_at', { ascending: true });

  if (movedError) return movedError;

  // Get all waitlist entries
  const { data: waitlistEntries, error: waitlistError } = await supabase
    .from('queue')
    .select('*')
    .eq('status', 'waitlist')
    .order('position', { ascending: true });

  if (waitlistError) return waitlistError;

  // Calculate new positions
  let newPosition = 1;

  // Assign positions to existing waiting entries first (maintain their order)
  for (const entry of existingWaitingEntries || []) {
    const { error: updateError } = await supabase
      .from('queue')
      .update({ position: newPosition })
      .eq('id', entry.id);
    
    if (updateError) return updateError;
    newPosition++;
  }

  // Assign positions to newly moved entries at the BOTTOM of waiting queue
  for (const entry of newlyMovedEntries || []) {
    const { error: updateError } = await supabase
      .from('queue')
      .update({ position: newPosition })
      .eq('id', entry.id);
    
    if (updateError) return updateError;
    newPosition++;
  }

  // Assign positions to waitlist entries
  for (const entry of waitlistEntries || []) {
    const { error: updateError } = await supabase
      .from('queue')
      .update({ position: newPosition })
      .eq('id', entry.id);
    
    if (updateError) return updateError;
    newPosition++;
  }

  return null;
}
