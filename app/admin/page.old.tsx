"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCourts, useQueue } from '@/store';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { BuildingType, CourtStatus, MatchSuggestion } from '@/types';
import { PlayCircle, CheckCircle, Users, Clock, TrendingUp, BarChart3, UserX, AlertTriangle } from 'lucide-react';
import { skillLevelToPreferenceGroup } from '@/lib/utils/skillLevel';

export default function AdminDashboard() {
  const router = useRouter();
  const { courts, fetchCourts, assignSession, completeSession, subscribeToCourts } = useCourts();
  const { queueEntries, fetchQueue, subscribeToQueue } = useQueue();
  const [matchSuggestions, setMatchSuggestions] = useState<Record<string, MatchSuggestion | null>>({});
  const [verifiedPlayers, setVerifiedPlayers] = useState<Record<string, Set<string>>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [verifyingCourtId, setVerifyingCourtId] = useState<string | null>(null); // Track which court is being verified
  const [groupRemovalModal, setGroupRemovalModal] = useState<{
    isOpen: boolean;
    groupMembers: any[];
    selectedIds: Set<string>;
  }>({
    isOpen: false,
    groupMembers: [],
    selectedIds: new Set(),
  });

  // Hydrate store on mount (required when skipHydration is true)
  useEffect(() => {
    const { useStore } = require('@/store');
    useStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    fetchCourts();
    fetchQueue();

    // Check for expired sessions every 2 minutes
    const checkExpiredSessions = async () => {
      try {
        const response = await fetch('/api/sessions/expire', {
          method: 'POST',
        });
        const data = await response.json();

        if (data.expired > 0) {
          console.log(`[Auto-Expire] ${data.expired} session(s) expired:`, data.players);
          // Refresh queue to reflect changes
          await fetchQueue();
        }
      } catch (error) {
        console.error('[Auto-Expire] Error checking expired sessions:', error);
      }
    };

    // Run immediately on mount
    checkExpiredSessions();

    // Then run every 2 minutes
    const expirationInterval = setInterval(checkExpiredSessions, 2 * 60 * 1000);

    // Temporarily disable real-time subscriptions to fix infinite loop
    // const unsubCourts = subscribeToCourts();
    // const unsubQueue = subscribeToQueue();

    return () => {
      clearInterval(expirationInterval);
      // unsubCourts();
      // unsubQueue();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCallNext = async (courtId: string, building: BuildingType) => {
    setLoading({ ...loading, [courtId]: true });

    try {
      // STAGE 1: Generate match suggestion (players stay in 'waiting')
      const response = await fetch('/api/matchmaking/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ court_id: courtId, building }),
      });

      const data = await response.json();

      if (data.match) {
        setMatchSuggestions({ ...matchSuggestions, [courtId]: data.match });
        // Initialize all players as verified (court officer can uncheck no-shows)
        const playerIds = new Set<string>(data.match.players.map((p: any) => p.id));
        setVerifiedPlayers({ ...verifiedPlayers, [courtId]: playerIds });
        // Lock this court for verification (prevents other courts from calling next)
        setVerifyingCourtId(courtId);
      } else {
        alert(data.reason || 'No players available in queue');
      }
    } catch (error) {
      alert('Failed to generate match: ' + (error as Error).message);
    } finally {
      setLoading({ ...loading, [courtId]: false });
    }
  };

  const togglePlayerVerification = (courtId: string, playerId: string) => {
    const verified = verifiedPlayers[courtId] || new Set();
    const newVerified = new Set(verified);

    if (newVerified.has(playerId)) {
      newVerified.delete(playerId);
    } else {
      newVerified.add(playerId);
    }

    setVerifiedPlayers({ ...verifiedPlayers, [courtId]: newVerified });
  };

  const handleCancelVerification = (courtId: string) => {
    setMatchSuggestions({ ...matchSuggestions, [courtId]: null });
    setVerifiedPlayers({ ...verifiedPlayers, [courtId]: new Set() });
    setVerifyingCourtId(null);
  };

  const handleReplaceNoShows = async (courtId: string, building: BuildingType) => {
    const match = matchSuggestions[courtId];
    const verified = verifiedPlayers[courtId];

    if (!match || !verified) return;

    const noShows = match.players.filter(p => !verified.has(p.id));

    if (noShows.length === 0) {
      alert('All players are verified as present. Use "Start Match" instead.');
      return;
    }

    const confirmed = confirm(
      `${noShows.length} player(s) didn't show up:\n${noShows.map(p => `- ${p.name}`).join('\n')}\n\nRemove them and call replacements?`
    );

    if (!confirmed) return;

    try {
      // Remove no-shows from queue
      for (const player of noShows) {
        const queueEntry = queueEntries.find(e => e.player_id === player.id);
        if (queueEntry) {
          await fetch('/api/queue/remove', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              queue_id: queueEntry.id,
              reason: 'no_show',
            }),
          });
        }
      }

      // Refresh queue to get updated list
      await fetchQueue();

      // Clear the match suggestion so court officer can call next again
      setMatchSuggestions({ ...matchSuggestions, [courtId]: null });
      setVerifiedPlayers({ ...verifiedPlayers, [courtId]: new Set() });

      alert(`${noShows.length} no-show(s) removed. Click "Call Next" again to get ${noShows.length} replacement(s).`);
    } catch (error) {
      alert('Failed to replace no-shows: ' + (error as Error).message);
    }
  };

  const handleStartMatch = async (courtId: string, match: MatchSuggestion) => {
    const verified = verifiedPlayers[courtId];

    if (!verified || verified.size !== 4) {
      alert(`Please verify all 4 players are present (currently ${verified?.size || 0}/4 verified)`);
      return;
    }

    try {
      // STAGE 2: All players verified - assign to court
      console.log('Match data:', match);

      if (!match.players || match.players.length !== 4) {
        throw new Error(`Invalid match: Expected 4 players, got ${match.players?.length || 0}`);
      }

      // Check all players are valid
      const invalidPlayers = match.players.filter(p => !p || !p.id);
      if (invalidPlayers.length > 0) {
        console.error('Invalid players in match:', { match, invalidPlayers });
        throw new Error(`Invalid match data: ${invalidPlayers.length} player(s) missing ID`);
      }

      // Get the first player's active session (should already exist from check-in)
      const { data: existingSession } = await (await import('@/lib/supabase/client')).supabase
        .from('sessions')
        .select('id')
        .eq('player_id', match.players[0].id)
        .eq('status', 'active')
        .single();

      if (!existingSession) {
        throw new Error(`Player ${match.players[0].name} doesn't have an active session. Check them in first at /cashier.`);
      }

      // Assign existing session to court
      await assignSession(courtId, existingSession.id);

      // Create match history records for all 4 players
      try {
        await fetch('/api/match-history/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: existingSession.id,
            player_ids: match.players.map(p => p.id),
          }),
        });
      } catch (historyError) {
        console.error('Failed to create match history:', historyError);
        // Don't fail the match start if history recording fails
      }

      // Remove players from queue
      for (const player of match.players) {
        if (!player || !player.id) {
          console.warn('Skipping invalid player:', player);
          continue;
        }

        const queueEntry = queueEntries.find(e => e.player_id === player.id);
        if (queueEntry) {
          const { error } = await (await import('@/lib/supabase/client')).supabase
            .from('queue')
            .update({ status: 'playing', court_id: courtId })
            .eq('id', queueEntry.id);

          if (error) {
            console.error('Error updating queue for player', player.id, error);
          }
        } else {
          console.warn('Queue entry not found for player:', player);
        }
      }

      // Clear suggestion and verification
      setMatchSuggestions({ ...matchSuggestions, [courtId]: null });
      setVerifiedPlayers({ ...verifiedPlayers, [courtId]: new Set() });
      setVerifyingCourtId(null); // Unlock courts for verification

      alert('Match started successfully! Players are now on court.');
    } catch (error) {
      console.error('Match assignment error:', error);
      alert('Failed to start match: ' + (error as Error).message);
    }
  };

  const handleCompleteSession = async (courtId: string, sessionId: string) => {
    const team1Score = prompt('Enter Team 1 score (optional):');
    const team2Score = prompt('Enter Team 2 score (optional):');

    try {
      // NOTE: We don't complete player sessions here because sessions represent
      // facility check-ins, not individual matches. Players can play multiple matches
      // during their session. Sessions are only completed when players leave.

      // Complete match history records (calculate and store match duration)
      try {
        await fetch('/api/match-history/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ court_id: courtId }),
        });
      } catch (historyError) {
        console.error('Failed to complete match history:', historyError);
        // Don't fail the match completion if history update fails
      }

      // Update court status to available
      await completeSession(courtId);

      // Auto-rejoin players to queue with smart building assignment
      const rejoinResponse = await fetch('/api/queue/rejoin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ court_id: courtId }),
      });

      const rejoinData = await rejoinResponse.json();

      if (rejoinData.rejoined > 0) {
        alert(`Session completed! ${rejoinData.rejoined} player(s) automatically rejoined the queue.`);
      } else {
        alert('Session completed successfully!');
      }

      // Refresh queue and courts
      await fetchQueue();
      await fetchCourts();
    } catch (error) {
      alert('Failed to complete session: ' + (error as Error).message);
    }
  };

  const handleRemoveFromQueue = async (queueId: string, playerName: string) => {
    // Check if player is in a group
    const queueEntry = queueEntries.find(e => e.id === queueId);

    if (queueEntry?.group_id) {
      // Player is in a group - show group removal modal
      const groupMembers = queueEntries.filter(e => e.group_id === queueEntry.group_id);

      setGroupRemovalModal({
        isOpen: true,
        groupMembers,
        selectedIds: new Set([queueId]), // Pre-select the clicked player
      });
      return;
    }

    // Solo player - ask for removal type
    const removalType = confirm(
      `Remove ${playerName} from queue?\n\n` +
      `Click OK if they LEFT or NO-SHOW (ends their session)\n` +
      `Click Cancel if they're just TAKING A BREAK (keeps session active)`
    );

    if (removalType === null) return; // User cancelled completely

    const reason = removalType ? 'left_facility' : 'temporary_break';
    const shouldEndSession = removalType;

    try {
      const response = await fetch('/api/queue/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queue_id: queueId,
          reason,
          end_session: shouldEndSession,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove player');
      }

      if (shouldEndSession) {
        alert(`${data.player_name} removed from queue. Session ended.`);
      } else {
        alert(`${data.player_name} removed from queue. Session still active - they can rejoin when back.`);
      }

      // Refresh queue
      await fetchQueue();
    } catch (error) {
      alert('Failed to remove player: ' + (error as Error).message);
    }
  };

  const handleGroupRemovalToggle = (queueId: string) => {
    const newSelectedIds = new Set(groupRemovalModal.selectedIds);
    if (newSelectedIds.has(queueId)) {
      newSelectedIds.delete(queueId);
    } else {
      newSelectedIds.add(queueId);
    }
    setGroupRemovalModal({ ...groupRemovalModal, selectedIds: newSelectedIds });
  };

  const handleConfirmGroupRemoval = async () => {
    const selectedCount = groupRemovalModal.selectedIds.size;

    if (selectedCount === 0) {
      alert('Please select at least one player to remove');
      return;
    }

    const confirmed = confirm(
      `Remove ${selectedCount} player(s) from the group?\n\nReason: Player(s) left or no-show`
    );

    if (!confirmed) return;

    try {
      // Remove all selected players
      for (const queueId of Array.from(groupRemovalModal.selectedIds)) {
        await fetch('/api/queue/remove', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            queue_id: queueId,
            reason: 'group_manual_removal',
          }),
        });
      }

      alert(`${selectedCount} player(s) removed from queue`);

      // Close modal and refresh
      setGroupRemovalModal({ isOpen: false, groupMembers: [], selectedIds: new Set() });
      await fetchQueue();
    } catch (error) {
      alert('Failed to remove players: ' + (error as Error).message);
    }
  };

  const courtsByBuilding = {
    building_a: courts.filter(c => c.building === 'building_a'),
    building_b: courts.filter(c => c.building === 'building_b'),
    building_c: courts.filter(c => c.building === 'building_c'),
  };

  const renderCourt = (court: any) => {
    const isAvailable = court.status === 'available';
    const suggestion = matchSuggestions[court.id];
    const verified = verifiedPlayers[court.id] || new Set();

    return (
      <Card key={court.id} className={isAvailable ? 'border-green-500' : 'border-red-500'}>
        <CardHeader className={isAvailable ? 'bg-green-50' : 'bg-red-50'}>
          <div className="flex items-center justify-between">
            <h3 className="font-bold">Court {court.court_number}</h3>
            <span className={`px-2 py-1 rounded text-sm ${isAvailable ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
              {isAvailable ? 'Available' : 'Occupied'}
            </span>
          </div>
        </CardHeader>
        <CardBody>
          {isAvailable ? (
            <div className="space-y-3">
              {suggestion ? (
                <div className="space-y-3">
                  <div className="bg-blue-50 border border-blue-200 rounded p-2">
                    <p className="font-semibold text-sm mb-2">Verify Players Present:</p>
                    <div className="space-y-1">
                      {suggestion.players.map((p, i) => (
                        <label
                          key={i}
                          className="flex items-center gap-2 p-2 rounded hover:bg-blue-100 cursor-pointer transition"
                        >
                          <input
                            type="checkbox"
                            checked={verified.has(p.id)}
                            onChange={() => togglePlayerVerification(court.id, p.id)}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span className="text-sm flex-1">
                            {i + 1}. {p.name}
                          </span>
                          {!verified.has(p.id) && (
                            <span className="text-xs text-red-600 font-medium">No-show</span>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                    <div>Priority: {suggestion.priority_score}</div>
                    {suggestion.factors.is_friend_group && <div>• Friend Group</div>}
                    {suggestion.factors.has_time_urgent_players && <div>• Time Urgent</div>}
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                    <p className="text-xs text-yellow-800">
                      ✓ <strong>{verified.size}/4</strong> players verified
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleStartMatch(court.id, suggestion)}
                      disabled={verified.size !== 4}
                      className="w-full"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Start Match ({verified.size}/4)
                    </Button>

                    {verified.size < 4 && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleReplaceNoShows(court.id, court.building)}
                        className="w-full"
                      >
                        <UserX className="w-4 h-4 mr-2" />
                        Replace No-Shows
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleCancelVerification(court.id)}
                      className="w-full"
                    >
                      Cancel Match
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  size="sm"
                  onClick={() => handleCallNext(court.id, court.building)}
                  disabled={loading[court.id] || (verifyingCourtId !== null && verifyingCourtId !== court.id)}
                  className="w-full"
                >
                  <PlayCircle className="w-4 h-4 mr-2" />
                  {loading[court.id] ? 'Loading...' : verifyingCourtId && verifyingCourtId !== court.id ? 'Verifying Other Court...' : 'Call Next'}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4" />
                <span>Session in progress...</span>
              </div>
              <Button
                size="sm"
                variant="success"
                onClick={() => court.current_session_id && handleCompleteSession(court.id, court.current_session_id)}
                className="w-full"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Complete Session
              </Button>
            </div>
          )}
        </CardBody>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Court Officer Dashboard</h1>
          <div className="flex gap-4">
            <Button
              variant="secondary"
              onClick={() => router.push('/admin/analytics')}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              View Analytics
            </Button>
            <Button
              variant="secondary"
              onClick={() => router.push('/admin/groups')}
            >
              <Users className="w-4 h-4 mr-2" />
              Manage Groups
            </Button>
            <div className="bg-white px-4 py-2 rounded-lg shadow">
              <span className="text-sm text-gray-600">Queue:</span>
              <span className="ml-2 font-bold">{queueEntries.filter(e => e.status === 'waiting').length}</span>
            </div>
            <div className="bg-white px-4 py-2 rounded-lg shadow">
              <span className="text-sm text-gray-600">Active Courts:</span>
              <span className="ml-2 font-bold">{courts.filter(c => c.status === 'occupied').length}/12</span>
            </div>
          </div>
        </div>

        {/* Building A */}
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            Building A - Courts 1-4
          </h2>
          <div className="grid grid-cols-4 gap-4">
            {courtsByBuilding.building_a.map(renderCourt)}
          </div>
        </div>

        {/* Building B */}
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            Building B - Courts 5-8
          </h2>
          <div className="grid grid-cols-4 gap-4">
            {courtsByBuilding.building_b.map(renderCourt)}
          </div>
        </div>

        {/* Building C */}
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            Building C - Courts 9-12
          </h2>
          <div className="grid grid-cols-4 gap-4">
            {courtsByBuilding.building_c.map(renderCourt)}
          </div>
        </div>

        {/* Queue Management Section */}
        <div className="mt-12 border-t-4 border-gray-300 pt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Users className="w-6 h-6" />
              Queue Management
            </h2>
            <div className="bg-yellow-50 border border-yellow-200 px-4 py-2 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <span className="text-sm text-yellow-800">
                Remove players who left or didn't show up
              </span>
            </div>
          </div>

          {queueEntries.filter(e => e.status === 'waiting').length === 0 ? (
            <Card>
              <CardBody>
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-lg">No players in queue</p>
                </div>
              </CardBody>
            </Card>
          ) : (
            <div className="grid grid-cols-3 gap-6">
              {/* Building A Queue */}
              <div>
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  Building A ({queueEntries.filter(e => e.building === 'building_a' && e.status === 'waiting').length})
                </h3>
                <div className="space-y-2">
                  {queueEntries
                    .filter(e => e.building === 'building_a' && e.status === 'waiting')
                    .sort((a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime())
                    .map((entry, index) => (
                      <Card key={entry.id}>
                        <CardBody className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-lg">#{index + 1}</span>
                              <div>
                                <p className="font-semibold">{entry.player.name}</p>
                                <p className="text-xs text-gray-600">
                                  {skillLevelToPreferenceGroup(entry.player.skill_level) === 'beginner' ? 'Beginner/Novice' : 'Intermediate/Advanced'}
                                  {entry.group_id && ' • Group'}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleRemoveFromQueue(entry.id, entry.player.name)}
                            >
                              <UserX className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardBody>
                      </Card>
                    ))}
                  {queueEntries.filter(e => e.building === 'building_a' && e.status === 'waiting').length === 0 && (
                    <div className="text-center py-4 text-gray-400 text-sm">
                      No players waiting
                    </div>
                  )}
                </div>
              </div>

              {/* Building B Queue */}
              <div>
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  Building B ({queueEntries.filter(e => e.building === 'building_b' && e.status === 'waiting').length})
                </h3>
                <div className="space-y-2">
                  {queueEntries
                    .filter(e => e.building === 'building_b' && e.status === 'waiting')
                    .sort((a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime())
                    .map((entry, index) => (
                      <Card key={entry.id}>
                        <CardBody className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-lg">#{index + 1}</span>
                              <div>
                                <p className="font-semibold">{entry.player.name}</p>
                                <p className="text-xs text-gray-600">
                                  {skillLevelToPreferenceGroup(entry.player.skill_level) === 'beginner' ? 'Beginner/Novice' : 'Intermediate/Advanced'}
                                  {entry.group_id && ' • Group'}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleRemoveFromQueue(entry.id, entry.player.name)}
                            >
                              <UserX className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardBody>
                      </Card>
                    ))}
                  {queueEntries.filter(e => e.building === 'building_b' && e.status === 'waiting').length === 0 && (
                    <div className="text-center py-4 text-gray-400 text-sm">
                      No players waiting
                    </div>
                  )}
                </div>
              </div>

              {/* Building C Queue */}
              <div>
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  Building C ({queueEntries.filter(e => e.building === 'building_c' && e.status === 'waiting').length})
                </h3>
                <div className="space-y-2">
                  {queueEntries
                    .filter(e => e.building === 'building_c' && e.status === 'waiting')
                    .sort((a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime())
                    .map((entry, index) => (
                      <Card key={entry.id}>
                        <CardBody className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-lg">#{index + 1}</span>
                              <div>
                                <p className="font-semibold">{entry.player.name}</p>
                                <p className="text-xs text-gray-600">
                                  {skillLevelToPreferenceGroup(entry.player.skill_level) === 'beginner' ? 'Beginner/Novice' : 'Intermediate/Advanced'}
                                  {entry.group_id && ' • Group'}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleRemoveFromQueue(entry.id, entry.player.name)}
                            >
                              <UserX className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardBody>
                      </Card>
                    ))}
                  {queueEntries.filter(e => e.building === 'building_c' && e.status === 'waiting').length === 0 && (
                    <div className="text-center py-4 text-gray-400 text-sm">
                      No players waiting
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Group Removal Modal */}
      {groupRemovalModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-xl font-bold mb-2">Remove Group Members?</h3>
              <p className="text-gray-600 text-sm mb-4">
                This player is part of a {groupRemovalModal.groupMembers.length}-person friend group.
                Select who to remove:
              </p>

              <div className="space-y-2 mb-6 max-h-64 overflow-y-auto">
                {groupRemovalModal.groupMembers.map((member) => (
                  <label
                    key={member.id}
                    className="flex items-center gap-3 p-3 rounded-lg border-2 hover:bg-gray-50 cursor-pointer transition"
                    style={{
                      borderColor: groupRemovalModal.selectedIds.has(member.id) ? '#3b82f6' : '#e5e7eb'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={groupRemovalModal.selectedIds.has(member.id)}
                      onChange={() => handleGroupRemovalToggle(member.id)}
                      className="w-5 h-5 text-blue-600"
                    />
                    <div className="flex-1">
                      <p className="font-semibold">{member.player.name}</p>
                      <p className="text-xs text-gray-600">
                        {skillLevelToPreferenceGroup(member.player.skill_level) === 'beginner' ? 'Beginner/Novice' : 'Intermediate/Advanced'}
                      </p>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <Button
                  variant="secondary"
                  onClick={() => setGroupRemovalModal({ isOpen: false, groupMembers: [], selectedIds: new Set() })}
                >
                  Cancel
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      const allIds = new Set(groupRemovalModal.groupMembers.map(m => m.id));
                      setGroupRemovalModal({ ...groupRemovalModal, selectedIds: allIds });
                    }}
                    size="sm"
                  >
                    Select All
                  </Button>
                  <Button
                    variant="danger"
                    onClick={handleConfirmGroupRemoval}
                    disabled={groupRemovalModal.selectedIds.size === 0}
                  >
                    <UserX className="w-4 h-4 mr-2" />
                    Remove Selected ({groupRemovalModal.selectedIds.size})
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
