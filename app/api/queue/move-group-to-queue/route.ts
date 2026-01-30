import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    console.log('[Move Group to Queue API] Starting request...');
    
    // Check Supabase connection first
    if (!supabaseServer) {
      throw new Error('Supabase client not initialized');
    }

    const { group_id } = await request.json();
    console.log('[Move Group to Queue API] Group ID:', group_id);

    if (!group_id) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
    }

    // Get all waitlist entries for this group
    console.log('[Move Group to Queue API] Fetching waitlist entries for group:', group_id);
    const { data: waitlistEntries, error: fetchError } = await supabaseServer
      .from('queue')
      .select('*')
      .eq('group_id', group_id)
      .eq('status', 'waitlist');

    console.log('[Move Group to Queue API] Waitlist entries found:', waitlistEntries?.length || 0);
    console.log('[Move Group to Queue API] Fetch error:', fetchError);

    if (fetchError) {
      console.error('Error fetching waitlist entries:', fetchError);
      return NextResponse.json({ error: `Failed to fetch waitlist entries: ${fetchError.message}` }, { status: 500 });
    }

    if (!waitlistEntries || waitlistEntries.length === 0) {
      return NextResponse.json({ error: 'No waitlist entries found for this group' }, { status: 404 });
    }

    // Update all group entries from waitlist to waiting status
    console.log('[Move Group to Queue API] Updating entries to waiting status...');
    const { data: updatedEntries, error: updateError } = await supabaseServer
      .from('queue')
      .update({ status: 'waiting' })
      .eq('group_id', group_id)
      .eq('status', 'waitlist')
      .select();

    console.log('[Move Group to Queue API] Updated entries:', updatedEntries?.length || 0);
    console.log('[Move Group to Queue API] Update error:', updateError);

    if (updateError) {
      console.error('Error updating queue entries:', updateError);
      return NextResponse.json({ error: `Failed to update queue entries: ${updateError.message}` }, { status: 500 });
    }

    // Recalculate positions - moved group should go to BOTTOM of waiting queue
    const movedEntryIds = updatedEntries?.map((entry: any) => entry.id) || [];
    console.log('[Move Group to Queue API] Recalculating positions for moved entries:', movedEntryIds);
    const positionError = await recalculatePositions(supabaseServer, movedEntryIds);

    if (positionError) {
      console.error('[Move Group to Queue API] Error recalculating positions:', positionError);
      return NextResponse.json({ error: `Failed to recalculate positions: ${positionError.message}` }, { status: 500 });
    }

    console.log('[Move Group to Queue API] Success! Group moved to queue.');
    return NextResponse.json({
      success: true,
      message: `Moved group ${group_id} with ${updatedEntries?.length || 0} members back to queue`,
      updatedEntries
    });

  } catch (error) {
    console.error('[Move Group to Queue API] Full error details:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function recalculatePositions(supabase: any, movedEntryIds: string[] = []) {
  // Get all waiting entries (excluding newly moved ones for now)
  let existingWaitingQuery = supabase
    .from('queue')
    .select('*')
    .eq('status', 'waiting')
    .order('position', { ascending: true });

  // Only exclude moved entries if there are any
  if (movedEntryIds.length > 0) {
    existingWaitingQuery = existingWaitingQuery.not('id', 'in', movedEntryIds);
  }

  const { data: existingWaitingEntries, error: fetchError } = await existingWaitingQuery;

  if (fetchError) {
    console.error('Error fetching existing waiting entries:', fetchError);
    return fetchError;
  }

  // Get the newly moved entries
  let newlyMovedEntries: any[] = [];
  if (movedEntryIds.length > 0) {
    const { data: movedData, error: movedError } = await supabase
      .from('queue')
      .select('*')
      .eq('status', 'waiting')
      .in('id', movedEntryIds)
      .order('created_at', { ascending: true });

    if (movedError) {
      console.error('Error fetching newly moved entries:', movedError);
      return movedError;
    }
    newlyMovedEntries = movedData || [];
  }

  // Get all waitlist entries
  const { data: waitlistEntries, error: waitlistError } = await supabase
    .from('queue')
    .select('*')
    .eq('status', 'waitlist')
    .order('position', { ascending: true });

  if (waitlistError) {
    console.error('Error fetching waitlist entries:', waitlistError);
    return waitlistError;
  }

  // Calculate new positions
  let newPosition = 1;

  // Assign positions to existing waiting entries first (maintain their order)
  for (const entry of existingWaitingEntries || []) {
    const { error: updateError } = await supabase
      .from('queue')
      .update({ position: newPosition })
      .eq('id', entry.id);
    
    if (updateError) {
      console.error('Error updating existing waiting entry:', updateError);
      return updateError;
    }
    newPosition++;
  }

  // Assign positions to newly moved entries at the BOTTOM of waiting queue
  for (const entry of newlyMovedEntries) {
    const { error: updateError } = await supabase
      .from('queue')
      .update({ position: newPosition })
      .eq('id', entry.id);
    
    if (updateError) {
      console.error('Error updating newly moved entry:', updateError);
      return updateError;
    }
    newPosition++;
  }

  // Assign positions to waitlist entries
  for (const entry of waitlistEntries || []) {
    const { error: updateError } = await supabase
      .from('queue')
      .update({ position: newPosition })
      .eq('id', entry.id);
    
    if (updateError) {
      console.error('Error updating waitlist entry:', updateError);
      return updateError;
    }
    newPosition++;
  }

  console.log(`[Recalculate Positions] Updated ${existingWaitingEntries?.length || 0} existing, ${newlyMovedEntries?.length || 0} moved, ${waitlistEntries?.length || 0} waitlist entries`);
  return null;
}
