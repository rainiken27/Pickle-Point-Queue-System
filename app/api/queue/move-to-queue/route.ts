import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Check Supabase connection first
    if (!supabaseServer) {
      throw new Error('Supabase client not initialized');
    }

    const { queue_entry_ids } = await request.json();

    if (!queue_entry_ids || !Array.isArray(queue_entry_ids) || queue_entry_ids.length === 0) {
      return NextResponse.json({ error: 'Queue entry IDs are required' }, { status: 400 });
    }

    // Get current queue entries to determine new positions
    console.log('[Move to Queue API] Fetching entries for IDs:', queue_entry_ids);
    const { data: allEntries, error: fetchError } = await supabaseServer
      .from('queue')
      .select('*')
      .in('id', queue_entry_ids);

    console.log('[Move to Queue API] Fetch result:', { data: allEntries, error: fetchError });

    if (fetchError) {
      console.error('Error fetching queue entries:', fetchError);
      return NextResponse.json({ error: `Failed to fetch queue entries: ${fetchError.message}` }, { status: 500 });
    }

    // Validate that all entries exist and are in 'waitlist' status
    const invalidEntries = allEntries?.filter((entry: any) => entry.status !== 'waitlist');
    if (invalidEntries && invalidEntries.length > 0) {
      return NextResponse.json({ 
        error: 'Some entries are not eligible for queue (must be in waitlist status)',
        invalidEntries 
      }, { status: 400 });
    }

    // Update the specified entries to waiting status
    const { data: updatedEntries, error: updateError } = await supabaseServer
      .from('queue')
      .update({ status: 'waiting' })
      .in('id', queue_entry_ids)
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
      message: `Moved ${updatedEntries?.length || 0} entries back to queue`,
      updatedEntries
    });

  } catch (error) {
    console.error('[Move to Queue API] Full error details:', {
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
