import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    console.log('[Daily Cleanup] Starting scheduled cleanup at 6 AM Philippine time...');

    // Get current time in Philippines (UTC+8)
    const now = new Date();
    const philippinesTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    const currentHour = philippinesTime.getHours();

    // Only run at 6 AM Philippines time
    if (currentHour !== 6) {
      console.log(`[Daily Cleanup] Not 6 AM yet (current hour: ${currentHour}), skipping...`);
      return NextResponse.json({ 
        success: true, 
        message: 'Not scheduled time yet',
        currentHour: currentHour,
        philippinesTime: philippinesTime.toISOString()
      });
    }

    console.log('[Daily Cleanup] It is 6 AM Philippines time - proceeding with group cleanup...');

    // Delete all group memberships first (foreign key constraint)
    const { error: membersError } = await supabaseServer
      .from('group_members')
      .delete()
      .neq('player_id', ''); // Delete all records

    if (membersError) {
      console.error('[Daily Cleanup] Error deleting group members:', membersError);
      throw membersError;
    }

    // Then delete all groups
    const { error: groupsError } = await supabaseServer
      .from('groups')
      .delete()
      .neq('id', ''); // Delete all records

    if (groupsError) {
      console.error('[Daily Cleanup] Error deleting groups:', groupsError);
      throw groupsError;
    }

    // Also clear any queue entries that have group_id (orphaned references)
    const { error: queueError } = await supabaseServer
      .from('queue')
      .update({ group_id: null })
      .not('group_id', 'is', null);

    if (queueError) {
      console.error('[Daily Cleanup] Error clearing queue group references:', queueError);
      throw queueError;
    }

    console.log('[Daily Cleanup] Successfully deleted all groups and all memberships');

    return NextResponse.json({ 
      success: true, 
      message: 'Daily cleanup completed successfully',
      groupsDeleted: 'All groups',
      timestamp: new Date().toISOString(),
      philippinesTime: philippinesTime.toISOString()
    });

  } catch (error) {
    console.error('[Daily Cleanup] Error during cleanup:', error);
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message 
    }, { status: 500 });
  }
}

// Also support GET requests for manual testing
export async function GET(request: NextRequest) {
  return POST(request);
}
