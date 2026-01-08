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

// Function to create display units (matchable groups for visual display)
function createDisplayUnits(queueEntries: QueueEntryWithPlayer[]): DisplayUnit[] {
  const units: DisplayUnit[] = [];
  const processedPlayerIds = new Set<string>();
  
  // Sort by position to process in queue order
  const sortedEntries = [...queueEntries].sort((a, b) => a.position - b.position);
  
  let i = 0;
  while (i < sortedEntries.length) {
    const entry = sortedEntries[i];
    
    if (processedPlayerIds.has(entry.player_id)) {
      i++;
      continue;
    }
    
    if (entry.group_id) {
      // Process group
      const groupMembers = queueEntries
        .filter(e => e.group_id === entry.group_id)
        .sort((a, b) => a.position - b.position);

      // Get group name from the first member's group data
      const groupName = (entry as any).group?.name || `Group ${groupMembers.length}`;

      units.push({
        type: 'group',
        players: groupMembers,
        placeholderCount: Math.max(0, 4 - groupMembers.length),
        isComplete: groupMembers.length === 4,
        groupName: groupName
      });
      
      groupMembers.forEach(member => processedPlayerIds.add(member.player_id));
      i++;
    } else {
      // Solo player - find the earliest solo stack that has room, or create new one
      let addedToExistingStack = false;
      
      // Check if we can add to an existing solo stack
      for (const unit of units) {
        if (unit.type === 'solo_stack' && unit.players.length < 4) {
          unit.players.push(entry);
          unit.placeholderCount = Math.max(0, 4 - unit.players.length);
          unit.isComplete = unit.players.length === 4;
          processedPlayerIds.add(entry.player_id);
          addedToExistingStack = true;
          break;
        }
      }
      
      // If no existing stack has room, create a new one
      if (!addedToExistingStack) {
        units.push({
          type: 'solo_stack',
          players: [entry],
          placeholderCount: 3,
          isComplete: false
        });
        processedPlayerIds.add(entry.player_id);
      }
      
      i++;
    }
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
          .select('*')
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
      <div className="grid grid-cols-3 gap-4 flex-1 min-h-0">
        {/* Courts - Takes 2/3 width */}
        <div className="col-span-2 bg-black/25 backdrop-blur-md p-4 rounded-lg border border-white/10">
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
                    <div className="text-lg text-white/90 text-center">Reserved</div>
                  )}

                  {court.status === 'occupied' && (
                    <>
                      {/* Court Timer */}
                      {courtTimerMs !== null && (
                        <div className={`text-center mb-2 ${
                          courtTimerMs < 5 * 60 * 1000 ? 'text-yellow-300 font-bold' : 'text-white/90'
                        }`}>
                          <Clock className="w-5 h-5 inline mr-1" />
                          {formatCountdownMs(courtTimerMs)}
                        </div>
                      )}

                      {/* 4 Player Photos (horizontal line, centered) */}
                      {courtPlayers.length > 0 && (
                        <div className="flex justify-center items-center gap-2 mt-2">
                          {courtPlayers.map((entry) => (
                            <PlayerAvatar
                              key={entry.id}
                              name={entry.player.name}
                              photo_url={entry.player.photo_url}
                              display_photo={(entry as any).session?.display_photo}
                              size="lg"
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

        {/* Queue - Takes 1/3 width */}
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
                const displayUnits = createDisplayUnits(waitingQueue);
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
                        <span className="text-sm font-bold px-2 py-1 rounded bg-gray-600 text-white">
                          {unit.players.length === 1 
                            ? 'Needs 3 More Players'
                            : unit.players.length === 2
                            ? 'Needs 2 More Players' 
                            : unit.players.length === 3
                            ? 'Needs 1 More Player'
                            : 'Solo Stack (Ready!)'
                          }
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
                              size="lg"
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
