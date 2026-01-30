"use client";

import React, { useEffect, useState } from 'react';
import { useRealtime } from '@/hooks/useRealtime';
import { useQueue, useCourts } from '@/store';
import { Clock, Users } from 'lucide-react';
import { Court, QueueEntryWithPlayer } from '@/types';
import { getSkillLevelLabel } from '@/lib/utils/skillLevel';
import { formatCountdown, formatCountdownMs } from '@/lib/session/timer';
import { getCourtRemainingMs } from '@/lib/session/courtTimer';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';

// Types for display grouping
interface DisplayUnit {
  type: 'group' | 'solo_stack';
  players: QueueEntryWithPlayer[];
  placeholderCount: number;
  isComplete: boolean;
  groupName?: string;
}

// Mirrors the matchmaking algorithm's logic so the display order matches who gets called next.
// Groups can jump ahead if there are enough courts for the solos ahead of them.
function createDisplayUnits(queueEntries: QueueEntryWithPlayer[], availableCourtCount: number): DisplayUnit[] {
  const units: DisplayUnit[] = [];
  let remainingQueue = [...queueEntries]
    .filter(entry => entry.status === 'waiting')
    .sort((a, b) => a.position - b.position);

  let courtsLeft = availableCourtCount;

  // Generate display units in the same order the matchmaking algorithm would
  while (remainingQueue.length >= 4 && courtsLeft > 0) {
    const match = findNextDisplayMatch(remainingQueue, courtsLeft);
    if (!match) break;

    const groupPlayers = match.filter(p => p.group_id);
    let groupName: string | undefined;
    if (groupPlayers.length > 0) {
      groupName = (groupPlayers[0] as any).group?.name || `Group ${groupPlayers.length}`;
    }

    units.push({
      type: groupName ? 'group' : 'solo_stack',
      players: match,
      placeholderCount: 0,
      isComplete: true,
      groupName
    });

    const matchedIds = new Set(match.map(p => p.player_id));
    remainingQueue = remainingQueue.filter(e => !matchedIds.has(e.player_id));
    courtsLeft--;
  }

  // Show remaining players as incomplete units in queue order
  if (remainingQueue.length > 0) {
    const leftover = buildLeftoverDisplayUnits(remainingQueue);
    units.push(...leftover);
  }

  return units;
}

// Mirrors generateSingleMatch from algorithm (skips time urgency since that's server-side)
function findNextDisplayMatch(
  queueEntries: QueueEntryWithPlayer[],
  remainingCourts: number
): QueueEntryWithPlayer[] | null {
  if (queueEntries.length < 4) return null;

  // Priority 1: Group optimization — can a group play early without delaying solos?
  const groupMatch = findGroupOptimizedDisplayMatch(queueEntries, remainingCourts);
  if (groupMatch) return groupMatch;

  // Priority 2: Strict queue order, respecting group integrity
  return findGroupAwareDisplayMatch(queueEntries);
}

function findGroupOptimizedDisplayMatch(
  queueEntries: QueueEntryWithPlayer[],
  remainingCourts: number
): QueueEntryWithPlayer[] | null {
  const groups: { groupId: string; members: QueueEntryWithPlayer[]; startPosition: number }[] = [];
  const solos: QueueEntryWithPlayer[] = [];
  const groupMap = new Map<string, QueueEntryWithPlayer[]>();

  for (const entry of queueEntries) {
    if (entry.group_id) {
      if (!groupMap.has(entry.group_id)) groupMap.set(entry.group_id, []);
      groupMap.get(entry.group_id)!.push(entry);
    } else {
      solos.push(entry);
    }
  }

  for (const [groupId, members] of groupMap) {
    const sorted = members.sort((a, b) => a.position - b.position);
    groups.push({ groupId, members: sorted, startPosition: sorted[0].position });
  }
  groups.sort((a, b) => a.startPosition - b.startPosition);

  for (const group of groups) {
    const solosAhead = solos.filter(s => s.position < group.startPosition);
    const courtsNeededForSolos = Math.ceil(solosAhead.length / 4);
    const courtsAfterGroup = remainingCourts - 1;

    if (courtsAfterGroup >= courtsNeededForSolos) {
      const match = [...group.members];
      if (match.length === 4) return match;
      if (match.length < 4) {
        const groupPlayerIds = new Set(group.members.map(m => m.player_id));
        const available = queueEntries
          .filter(e => !groupPlayerIds.has(e.player_id))
          .sort((a, b) => a.position - b.position);
        match.push(...available.slice(0, 4 - match.length));
      }
      if (match.length === 4) return match;
    }
  }

  return null;
}

function findGroupAwareDisplayMatch(queueEntries: QueueEntryWithPlayer[]): QueueEntryWithPlayer[] | null {
  const units = buildMatchableUnits(queueEntries);
  const result: QueueEntryWithPlayer[] = [];

  for (let i = 0; i < units.length && result.length < 4; i++) {
    const unit = units[i];

    if (unit.isGroup && unit.players.length === 4) {
      if (result.length === 0) return unit.players;
      continue;
    }

    if (result.length + unit.players.length <= 4) {
      result.push(...unit.players);
      if (result.length === 4) return result;
    } else {
      break;
    }
  }

  return null;
}

function buildMatchableUnits(queueEntries: QueueEntryWithPlayer[]) {
  const units: { players: QueueEntryWithPlayer[]; startPosition: number; isGroup: boolean; groupName?: string }[] = [];
  const processed = new Set<string>();
  const sorted = [...queueEntries].sort((a, b) => a.position - b.position);

  for (const entry of sorted) {
    if (processed.has(entry.player_id)) continue;

    if (entry.group_id) {
      const members = queueEntries
        .filter(e => e.group_id === entry.group_id)
        .sort((a, b) => a.position - b.position);
      units.push({
        players: members,
        startPosition: members[0].position,
        isGroup: true,
        groupName: (members[0] as any).group?.name || `Group ${members.length}`
      });
      members.forEach(m => processed.add(m.player_id));
    } else {
      units.push({ players: [entry], startPosition: entry.position, isGroup: false });
      processed.add(entry.player_id);
    }
  }

  return units.sort((a, b) => a.startPosition - b.startPosition);
}

function buildLeftoverDisplayUnits(remaining: QueueEntryWithPlayer[]): DisplayUnit[] {
  const units: DisplayUnit[] = [];
  const matchableUnits = buildMatchableUnits(remaining);
  const processed = new Set<string>();

  for (const mu of matchableUnits) {
    if (mu.players.every(p => processed.has(p.player_id))) continue;

    const match: QueueEntryWithPlayer[] = [...mu.players];
    mu.players.forEach(p => processed.add(p.player_id));
    let groupName = mu.groupName;

    // Try to fill to 4
    for (const nextMu of matchableUnits) {
      if (match.length >= 4) break;
      if (nextMu.players.every(p => processed.has(p.player_id))) continue;
      if (nextMu.isGroup && nextMu.players.length === 4) continue;

      if (match.length + nextMu.players.length <= 4) {
        match.push(...nextMu.players);
        nextMu.players.forEach(p => processed.add(p.player_id));
        if (!groupName && nextMu.groupName) groupName = nextMu.groupName;
      }
    }

    units.push({
      type: groupName ? 'group' : 'solo_stack',
      players: match,
      placeholderCount: Math.max(0, 4 - match.length),
      isComplete: match.length === 4,
      groupName
    });
  }

  return units;
}

export default function TVDisplay() {
  const { queueEntries, fetchQueue, subscribeToQueue } = useQueue();
  const { courts, fetchCourts, subscribeToCourts } = useCourts();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sessions, setSessions] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchQueue();
    fetchCourts();

    const unsubQueue = subscribeToQueue();
    const unsubCourts = subscribeToCourts();

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    return () => {
      unsubQueue();
      unsubCourts();
      clearInterval(timer);
    };
  }, []);

  const waitingQueue = queueEntries.filter(e => e.status === 'waiting');
  const availableCourts = courts.filter(c => c.status === 'available').length;

  // Fetch sessions for countdown
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const playerIds = waitingQueue.map(e => e.player_id);
        if (playerIds.length === 0) {
          setSessions({});
          return;
        }

        const { supabase } = await import('@/lib/supabase/client');
        const { data } = await supabase
          .from('sessions')
          .select(`
            *,
            players!inner (
              unlimited_time
            )
          `)
          .eq('status', 'active')
          .in('player_id', playerIds);

        if (data) {
          const sessionMap: Record<string, any> = {};
          data.forEach(session => {
            sessionMap[session.player_id] = session;
          });
          setSessions(sessionMap);
        }
      } catch (error) {
        console.error('Error fetching sessions:', error);
      }
    };

    fetchSessions();
  }, [queueEntries]);

  const getSessionCountdown = (playerId: string) => {
    const session = sessions[playerId];
    if (!session) return null;

    // Check if player has unlimited time
    if (session.players?.unlimited_time) {
      return '∞';
    }

    const startTime = new Date(session.start_time).getTime();
    const fiveHoursInMs = 5 * 60 * 60 * 1000;
    const elapsed = currentTime.getTime() - startTime;
    const remaining = fiveHoursInMs - elapsed;

    if (remaining <= 0) return '0:00:00';

    const hours = Math.floor(remaining / (60 * 60 * 1000));
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    const seconds = Math.floor((remaining % (60 * 1000)) / 1000);

    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  // Get players for a specific court
  const getCourtPlayers = (courtId: string) => {
    return queueEntries
      .filter(e => e.status === 'playing' && e.court_id === courtId)
      .slice(0, 4);
  };

  return (
    <div
      className="h-screen overflow-hidden text-white p-4 flex flex-col"
      style={{
        backgroundImage: 'url(/background.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Header */}
      <div className="grid grid-cols-3 items-center mb-4 shrink-0">
        <div className="justify-self-start">
          <img src="/logo.png" alt="PicklePoint Queue" className="h-28 w-auto" />
        </div>
        <div className="text-6xl font-bold justify-self-center" suppressHydrationWarning>
          {currentTime.toLocaleTimeString()}
        </div>
        <div className="flex items-center gap-4 justify-self-end">
          <div className="text-2xl" suppressHydrationWarning>
            {currentTime.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      </div>


      {/* Main Content - Courts and Queue */}
      <div className="grid gap-4 flex-1 min-h-0" style={{ gridTemplateColumns: '55% 45%' }}>
        {/* Courts - Takes 55% width */}
        <div className="bg-black/25 backdrop-blur-md p-4 rounded-lg border border-white/10">
          <h3 className="text-2xl font-semibold text-white/90 mb-4">Courts</h3>
          <div className="grid grid-cols-2 gap-3">
            {courts.slice(0, 6).map(court => {
              const courtPlayers = getCourtPlayers(court.id);
              const courtTimerMs = court.court_timer_started_at
                ? getCourtRemainingMs(court)
                : null;

              return (
                <div
                  key={court.id}
                  className={`p-4 rounded-lg ${
                    court.status === 'available'
                      ? 'bg-amber-500'
                      : court.status === 'reserved'
                      ? 'bg-blue-600'
                      : court.status === 'occupied' && court.court_timer_started_at
                        ? (() => {
                            const elapsed = Date.now() - new Date(court.court_timer_started_at).getTime();
                            const normalTime = 20 * 60 * 1000; // 20 minutes
                            return elapsed > normalTime ? 'bg-red-600' : 'bg-green-600';
                          })()
                        : 'bg-red-600'
                  }`}
                >
                  <div className="text-3xl font-bold text-white text-center mb-2">
                    Court {court.court_number}
                  </div>

                  {court.status === 'available' && (
                    <div className="text-lg text-white/90 text-center">Open</div>
                  )}

                  {court.status === 'reserved' && (
                    <div className="text-lg text-white/90 text-center">{(court as any).reserved_note || 'Reserved'}</div>
                  )}

                  {court.status === 'occupied' && (
                    <>
                      <div className="text-lg text-white/90 text-center">
                        {court.court_timer_started_at && (() => {
                          const elapsed = Date.now() - new Date(court.court_timer_started_at).getTime();
                          const normalTime = 20 * 60 * 1000;
                          const status = elapsed > normalTime ? 'Overtime' : 'In Progress';
                          return (
                            <div className="flex items-center justify-center gap-2">
                              <span>{status}</span>
                              {courtTimerMs !== null && (
                                <>
                                  <span>•</span>
                                  <Clock className="w-4 h-4 inline" />
                                  <span>{formatCountdownMs(courtTimerMs)}</span>
                                </>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      {/* 4 Player Photos (horizontal line, centered) */}
                      {courtPlayers.length > 0 && (
                        <div className="flex justify-center items-center gap-2 mt-2">
                          {courtPlayers.map((entry) => (
                            <PlayerAvatar
                              key={entry.id}
                              name={entry.player.name}
                              photo_url={entry.player.photo_url}
                              display_photo={(entry as any).session?.display_photo}
                              size="md"
                              className="border-2 border-white/40"
                            />
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Queue - Takes 45% width */}
        <div className="bg-black/25 backdrop-blur-md p-4 rounded-lg border border-white/10 flex flex-col min-h-0">
          <h3 className="text-3xl font-semibold text-white mb-4 flex items-center gap-2 shrink-0">
            <Users className="w-10 h-10" />
            Queue ({waitingQueue.length})
          </h3>

          {waitingQueue.length === 0 ? (
            <div className="text-center py-8 flex-1 flex items-center justify-center">
              <p className="text-white/50 text-2xl font-medium">No players waiting</p>
            </div>
          ) : (
            <div className="space-y-4 overflow-y-auto flex-1 pr-2">
              {(() => {
                const displayUnits = createDisplayUnits(waitingQueue, availableCourts);
                let positionCounter = 1;
                
                return displayUnits.map((unit, unitIndex) => (
                  <div
                    key={`unit-${unitIndex}`}
                    className={`p-4 rounded-lg transition-all border-2 ${
                      unit.isComplete
                        ? 'bg-amber-500/20 border-amber-400/60 shadow-lg shadow-amber-500/20' // Gold outline for complete groups
                        : unitIndex === 0
                        ? 'bg-yellow-500/30 border-yellow-400/40'
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    {/* Unit Header */}
                    {unit.type === 'group' && (
                      <div className="text-center mb-2">
                        <span className={`text-sm font-bold px-2 py-1 rounded ${
                          unit.isComplete 
                            ? 'bg-amber-500 text-white' 
                            : 'bg-blue-500 text-white'
                        }`}>
                          {unit.groupName} {unit.isComplete ? '(Ready!)' : `(${unit.players.length}/4)`}
                        </span>
                      </div>
                    )}
                    
                    {unit.type === 'solo_stack' && (
                      <div className="text-center mb-2">
                        <span className={`text-sm font-bold px-2 py-1 rounded ${
                          unit.isComplete
                            ? 'bg-amber-500 text-white'
                            : unit.groupName
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-600 text-white'
                        }`}>
                          {unit.groupName ? (
                            // Mixed unit with group members
                            <>
                              {unit.groupName}
                              {(() => {
                                // Count solo players (those not in the group)
                                const soloCount = unit.players.filter(p => !p.group_id).length;
                                if (soloCount > 0) {
                                  return ` + ${soloCount} Solo`;
                                }
                                return '';
                              })()}
                              {' '}
                              {unit.isComplete ? '(Ready!)' : `(${unit.players.length}/4)`}
                            </>
                          ) : (
                            // Pure solo stack
                            unit.players.length === 1
                              ? 'Needs 3 More Players'
                              : unit.players.length === 2
                              ? 'Needs 2 More Players'
                              : unit.players.length === 3
                              ? 'Needs 1 More Player'
                              : 'Solo Stack (Ready!)'
                          )}
                        </span>
                      </div>
                    )}

                    {/* Players in this unit */}
                    <div className="space-y-2">
                      {unit.players.map((entry) => {
                        const sessionCountdown = getSessionCountdown(entry.player_id);
                        const currentPosition = positionCounter++;
                        
                        return (
                          <div key={entry.id} className="flex items-center gap-2">
                            <span className="font-bold text-white text-xl w-10">#{currentPosition}</span>

                            {/* Player Photo */}
                            <PlayerAvatar
                              name={entry.player.name}
                              photo_url={entry.player.photo_url}
                              display_photo={(entry as any).session?.display_photo}
                              size="md"
                              className="shrink-0 border-2 border-white/20"
                            />

                            <div className="flex-1 min-w-0">
                              {/* Player Name */}
                              <div className="font-bold text-white truncate text-xl">
                                {entry.player.name}
                              </div>
                              {/* Skill Level */}
                              <div className="text-base text-white/80 font-medium">
                                {getSkillLevelLabel(entry.player.skill_level)}
                              </div>
                            </div>

                            {/* Session Countdown */}
                            {sessionCountdown && (
                              <div className="text-base text-white shrink-0 font-mono font-bold">
                                <Clock className="w-4 h-4 inline mr-1" />
                                {sessionCountdown}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      
                      {/* Placeholder spots for incomplete units */}
                      {unit.placeholderCount > 0 && (
                        <div className="space-y-2">
                          {Array.from({ length: unit.placeholderCount }).map((_, i) => {
                            const currentPosition = positionCounter++;
                            return (
                              <div key={`placeholder-${i}`} className="flex items-center gap-2 opacity-50">
                                <span className="font-bold text-white text-xl w-10">#{currentPosition}</span>
                                
                                {/* Empty placeholder circle */}
                                <div className="w-16 h-16 rounded-full border-2 border-dashed border-white/40 shrink-0 flex items-center justify-center">
                                  <span className="text-white/60 text-sm">?</span>
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <div className="text-white/60 text-xl italic">
                                    Waiting for player...
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
