import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { supabase } from '@/lib/supabase/client';
import { assignBuildingForPlayers } from '@/lib/matchmaking/buildingAssignment';
import { Player, QueueEntryWithPlayer, Court } from '@/types';

/**
 * Auto-rejoin players to queue after completing a match
 * This is called when a session is completed
 */
export async function POST(request: NextRequest) {
  try {
    const { court_id } = await request.json();

    if (!court_id) {
      return NextResponse.json(
        { error: 'court_id is required' },
        { status: 400 }
      );
    }

    // Get the court (session_id will be null if match just ended, which is fine)
    const { data: court, error: courtError } = await supabaseServer
      .from('courts')
      .select('*')
      .eq('id', court_id)
      .single();

    if (courtError || !court) {
      return NextResponse.json(
        { error: 'Court not found' },
        { status: 404 }
      );
    }

    // Find all queue entries with status 'playing' for THIS SPECIFIC COURT
    const { data: playingEntries, error: queueError } = await supabaseServer
      .from('queue')
      .select(`
        *,
        player:players(*)
      `)
      .eq('status', 'playing')
      .eq('court_id', court_id);

    if (queueError) throw queueError;

    if (!playingEntries || playingEntries.length === 0) {
      return NextResponse.json(
        { message: 'No players to rejoin', rejoined: 0 },
        { status: 200 }
      );
    }

    // All players with this court_id are the ones who were playing on this court
    const playersToRejoin = playingEntries;

    // Check each player's session status
    const eligiblePlayers: Array<{ queueEntry: any; player: Player; hasActiveSession: boolean }> = [];

    console.log(`[REJOIN] Checking ${playersToRejoin.length} players for eligibility...`);
    for (const entry of playersToRejoin) {
      console.log(`[REJOIN] Checking player: ${entry.player?.name} (${entry.player_id})`);
      
      // Check if player has a session (active or recently completed)
      // We check for both active and completed sessions because this endpoint
      // is called right after session completion
      const { data: session, error: sessionError } = await supabaseServer
        .from('sessions')
        .select('*')
        .eq('player_id', entry.player_id)
        .in('status', ['active', 'completed'])
        .order('start_time', { ascending: false })
        .limit(1)
        .single();

      if (sessionError) {
        console.log(`[REJOIN] Session query error for ${entry.player?.name}:`, sessionError);
        continue;
      }

      if (session) {
        console.log(`[REJOIN] ${entry.player?.name} has session:`, {
          status: session.status,
          start_time: session.start_time,
          end_time: session.end_time
        });

        // For active sessions: check if time remaining
        // For completed sessions: check if just completed (within last 5 minutes)
        const startTime = new Date(session.start_time).getTime();
        const now = Date.now();
        const elapsed = now - startTime;
        const fiveHoursInMs = 5 * 60 * 60 * 1000;
        const remaining = fiveHoursInMs - elapsed;

        // Allow rejoin if:
        // 1. Session is active and has time remaining, OR
        // 2. Session was just completed (within last 5 minutes)
        const justCompleted = session.status === 'completed' &&
          session.end_time &&
          (now - new Date(session.end_time).getTime()) < 5 * 60 * 1000;

        const isEligible = (session.status === 'active' && remaining > 0) || justCompleted;
        
        console.log(`[REJOIN] ${entry.player?.name} eligibility:`, {
          remaining_ms: remaining,
          just_completed: justCompleted,
          eligible: isEligible
        });

        if (isEligible) {
          eligiblePlayers.push({
            queueEntry: entry,
            player: entry.player,
            hasActiveSession: session.status === 'active'
          });
          console.log(`[REJOIN] ✅ ${entry.player?.name} is eligible to rejoin`);
        } else {
          console.log(`[REJOIN] ❌ ${entry.player?.name} is NOT eligible to rejoin`);
        }
      } else {
        console.log(`[REJOIN] ❌ ${entry.player?.name} has no session record`);
      }
    }

    if (eligiblePlayers.length === 0) {
      return NextResponse.json(
        { message: 'No eligible players to rejoin (sessions expired)', rejoined: 0 },
        { status: 200 }
      );
    }

    // Fetch current queue and courts for smart assignment
    const { data: currentQueue } = await supabaseServer
      .from('queue')
      .select(`
        *,
        player:players(*)
      `)
      .eq('status', 'waiting');

    const { data: courts } = await supabaseServer
      .from('courts')
      .select('*');

    const queueEntries: QueueEntryWithPlayer[] = currentQueue || [];
    const allCourts: Court[] = courts || [];

    // Separate friend groups from solo players
    const friendGroups = new Map<string, typeof eligiblePlayers>();
    const soloPlayers: typeof eligiblePlayers = [];

    for (const item of eligiblePlayers) {
      const groupId = item.queueEntry.group_id;
      if (groupId) {
        // This is a friend group member
        if (!friendGroups.has(groupId)) {
          friendGroups.set(groupId, []);
        }
        friendGroups.get(groupId)!.push(item);
      } else {
        // This is a solo player
        soloPlayers.push(item);
      }
    }

    const rejoinedPlayers: string[] = [];

    // Process friend groups first (keep them together)
    for (const [groupId, groupPlayers] of friendGroups.entries()) {
      const players = groupPlayers.map(p => p.player);
      const isGroup = groupPlayers.length > 1;

      // Smart building assignment (keeps group together)
      const assignment = assignBuildingForPlayers(players, isGroup, queueEntries, allCourts);

      // Update queue entries for all group members
      for (const item of groupPlayers) {
        const { error: updateError } = await supabaseServer
          .from('queue')
          .update({
            status: 'waiting',
            building: assignment.building,
            position: await getNextPosition(assignment.building),
            court_id: null,
          })
          .eq('id', item.queueEntry.id);

        if (updateError) {
          console.error('Error rejoining player:', item.player.name, updateError);
        } else {
          rejoinedPlayers.push(item.player.name);
        }
      }
    }

    // Process solo players individually (optimal building assignment for each)
    console.log(`[REJOIN] Processing ${soloPlayers.length} solo players...`);
    for (const item of soloPlayers) {
      // Assign each solo player to their optimal building
      const assignment = assignBuildingForPlayers([item.player], false, queueEntries, allCourts);
      console.log(`[REJOIN] ${item.player.name} → ${assignment.building} (${assignment.reason})`);

      const { error: updateError } = await supabaseServer
        .from('queue')
        .update({
          status: 'waiting',
          building: assignment.building,
          position: await getNextPosition(assignment.building),
          court_id: null,
        })
        .eq('id', item.queueEntry.id);

      if (updateError) {
        console.error(`[REJOIN ERROR] ${item.player.name}:`, updateError);
      } else {
        console.log(`[REJOIN SUCCESS] ${item.player.name} rejoined at position in ${assignment.building}`);
        rejoinedPlayers.push(item.player.name);
      }
    }

    return NextResponse.json(
      {
        message: `${rejoinedPlayers.length} player(s) rejoined the queue`,
        rejoined: rejoinedPlayers.length,
        players: rejoinedPlayers,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Rejoin error:', error);
    return NextResponse.json(
      { error: 'Failed to rejoin players', message: (error as Error).message },
      { status: 500 }
    );
  }
}

async function getNextPosition(building: string): Promise<number> {
  const { data: existingQueue } = await supabaseServer
    .from('queue')
    .select('position')
    .eq('building', building)
    .eq('status', 'waiting')
    .order('position', { ascending: false })
    .limit(1);

  return existingQueue && existingQueue.length > 0
    ? existingQueue[0].position + 1
    : 1;
}
