"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCourts, useQueue } from '@/store';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { BuildingType, CourtStatus, MatchSuggestion } from '@/types';
import {
  PlayCircle, CheckCircle, Users, Clock, TrendingUp, BarChart3,
  UserX, AlertTriangle, ChevronDown, ChevronRight, Zap, Activity, Search, Lock, Unlock
} from 'lucide-react';
import { skillLevelToPreferenceGroup } from '@/lib/utils/skillLevel';

export default function AdminDashboardRedesign() {
  const router = useRouter();
  const { courts, fetchCourts, assignSession, completeSession, subscribeToCourts } = useCourts();
  const { queueEntries, fetchQueue, subscribeToQueue } = useQueue();
  const [matchSuggestions, setMatchSuggestions] = useState<Record<string, MatchSuggestion | null>>({});
  const [verifiedPlayers, setVerifiedPlayers] = useState<Record<string, Set<string>>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [verifyingCourtId, setVerifyingCourtId] = useState<string | null>(null);
  const [collapsedBuildings, setCollapsedBuildings] = useState<Set<string>>(new Set());
  const [queueSearchTerm, setQueueSearchTerm] = useState('');
  const [groupRemovalModal, setGroupRemovalModal] = useState<{
    isOpen: boolean;
    groupMembers: any[];
    selectedIds: Set<string>;
  }>({
    isOpen: false,
    groupMembers: [],
    selectedIds: new Set(),
  });

  // Hydrate store on mount
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
          await fetchQueue();
        }
      } catch (error) {
        console.error('[Auto-Expire] Error checking expired sessions:', error);
      }
    };

    checkExpiredSessions();
    const expirationInterval = setInterval(checkExpiredSessions, 2 * 60 * 1000);

    return () => {
      clearInterval(expirationInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard shortcuts removed for now - kept hint for visual reference

  const handleCallNext = async (courtId: string, building: BuildingType) => {
    setLoading({ ...loading, [courtId]: true });

    try {
      const response = await fetch('/api/matchmaking/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ court_id: courtId, building }),
      });

      const data = await response.json();

      if (data.match) {
        setMatchSuggestions({ ...matchSuggestions, [courtId]: data.match });
        const playerIds = new Set<string>(data.match.players.map((p: any) => p.id));
        setVerifiedPlayers({ ...verifiedPlayers, [courtId]: playerIds });
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

      await fetchQueue();
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
      if (!match.players || match.players.length !== 4) {
        throw new Error(`Invalid match: Expected 4 players, got ${match.players?.length || 0}`);
      }

      const invalidPlayers = match.players.filter(p => !p || !p.id);
      if (invalidPlayers.length > 0) {
        throw new Error(`Invalid match data: ${invalidPlayers.length} player(s) missing ID`);
      }

      const { data: existingSession } = await (await import('@/lib/supabase/client')).supabase
        .from('sessions')
        .select('id')
        .eq('player_id', match.players[0].id)
        .eq('status', 'active')
        .single();

      if (!existingSession) {
        throw new Error(`Player ${match.players[0].name} doesn't have an active session. Check them in first at /cashier.`);
      }

      await assignSession(courtId, existingSession.id);

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
      }

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

      setMatchSuggestions({ ...matchSuggestions, [courtId]: null });
      setVerifiedPlayers({ ...verifiedPlayers, [courtId]: new Set() });
      setVerifyingCourtId(null);

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
      try {
        await fetch('/api/match-history/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ court_id: courtId }),
        });
      } catch (historyError) {
        console.error('Failed to complete match history:', historyError);
      }

      await completeSession(courtId);

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

      await fetchQueue();
      await fetchCourts();
    } catch (error) {
      alert('Failed to complete session: ' + (error as Error).message);
    }
  };

  const handleRemoveFromQueue = async (queueId: string, playerName: string) => {
    const queueEntry = queueEntries.find(e => e.id === queueId);

    if (queueEntry?.group_id) {
      const groupMembers = queueEntries.filter(e => e.group_id === queueEntry.group_id);

      setGroupRemovalModal({
        isOpen: true,
        groupMembers,
        selectedIds: new Set([queueId]),
      });
      return;
    }

    const removalType = confirm(
      `Remove ${playerName} from queue?\n\n` +
      `Click OK if they LEFT or NO-SHOW (ends their session)\n` +
      `Click Cancel if they're just TAKING A BREAK (keeps session active)`
    );

    if (removalType === null) return;

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

      setGroupRemovalModal({ isOpen: false, groupMembers: [], selectedIds: new Set() });
      await fetchQueue();
    } catch (error) {
      alert('Failed to remove players: ' + (error as Error).message);
    }
  };

  const handleReserveCourt = async (courtId: string) => {
    const reservedBy = prompt('Reserved for (name/company):');
    if (!reservedBy) return;

    const hours = prompt('Reserve for how many hours? (leave empty for all day)');
    const reserved_until = hours ? new Date(Date.now() + parseInt(hours) * 60 * 60 * 1000).toISOString() : null;
    const reserved_note = prompt('Optional note (e.g., "Birthday party"):') || '';

    try {
      const response = await fetch('/api/courts/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          court_id: courtId,
          reserved_by: reservedBy,
          reserved_until,
          reserved_note,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reserve court');
      }

      alert(`Court reserved for ${reservedBy}${hours ? ` for ${hours} hours` : ''}`);
      await fetchCourts();
    } catch (error) {
      alert('Failed to reserve court: ' + (error as Error).message);
    }
  };

  const handleUnreserveCourt = async (courtId: string) => {
    const confirmed = confirm('Remove reservation and make court available?');
    if (!confirmed) return;

    try {
      const response = await fetch('/api/courts/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          court_id: courtId,
          action: 'unreserve',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to unreserve court');
      }

      alert('Court is now available');
      await fetchCourts();
    } catch (error) {
      alert('Failed to unreserve court: ' + (error as Error).message);
    }
  };

  const toggleBuildingCollapse = (building: string) => {
    const newCollapsed = new Set(collapsedBuildings);
    if (newCollapsed.has(building)) {
      newCollapsed.delete(building);
    } else {
      newCollapsed.add(building);
    }
    setCollapsedBuildings(newCollapsed);
  };

  const courtsByBuilding = {
    building_a: courts.filter(c => c.building === 'building_a'),
    building_b: courts.filter(c => c.building === 'building_b'),
    building_c: courts.filter(c => c.building === 'building_c'),
  };

  const waitingQueue = queueEntries.filter(e => e.status === 'waiting');
  const availableCourts = courts.filter(c => c.status === 'available');
  const occupiedCourts = courts.filter(c => c.status === 'occupied');
  const reservedCourts = courts.filter(c => c.status === 'reserved');

  // Get suggested next court (highest priority building)
  const getSuggestedNextCourt = () => {
    const buildingPriority = ['building_a', 'building_b', 'building_c'].map(building => {
      const buildingCourts = courts.filter(c => c.building === building);
      const availableCount = buildingCourts.filter(c => c.status === 'available').length;
      const queueCount = waitingQueue.filter(e => e.building === building).length;
      const firstAvailable = buildingCourts.find(c => c.status === 'available');

      return {
        building,
        availableCount,
        queueCount,
        priority: queueCount / Math.max(availableCount, 1), // Queue density
        firstAvailable,
      };
    }).filter(b => b.availableCount > 0 && b.queueCount >= 4)
      .sort((a, b) => b.priority - a.priority);

    return buildingPriority[0]?.firstAvailable || null;
  };

  const suggestedCourt = getSuggestedNextCourt();

  const renderCourt = (court: any, isCompact: boolean = false) => {
    const isAvailable = court.status === 'available';
    const suggestion = matchSuggestions[court.id];
    const verified = verifiedPlayers[court.id] || new Set();
    const isSuggested = suggestedCourt?.id === court.id;

    if (isCompact && isAvailable && !suggestion) {
      return (
        <button
          key={court.id}
          onClick={() => handleCallNext(court.id, court.building)}
          disabled={loading[court.id] || (verifyingCourtId !== null && verifyingCourtId !== court.id)}
          className={`p-3 rounded-lg border-2 text-left transition-all ${
            isSuggested
              ? 'border-yellow-400 bg-yellow-50 hover:bg-yellow-100 shadow-lg'
              : 'border-green-300 bg-green-50 hover:bg-green-100'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-sm">Court {court.court_number}</div>
              <div className="text-xs text-green-700">Available</div>
            </div>
            {isSuggested && <Zap className="w-5 h-5 text-yellow-500" />}
          </div>
        </button>
      );
    }

    const isReserved = court.status === 'reserved';
    const borderColor = isAvailable ? 'border-green-500' : isReserved ? 'border-orange-500' : 'border-gray-300';
    const bgColor = isAvailable ? 'bg-green-50' : isReserved ? 'bg-orange-50' : 'bg-gray-50';
    const badgeColor = isAvailable ? 'bg-green-200 text-green-800' : isReserved ? 'bg-orange-200 text-orange-800' : 'bg-gray-200 text-gray-800';
    const statusText = isAvailable ? 'Available' : isReserved ? 'Reserved' : 'Occupied';

    return (
      <Card key={court.id} className={`${borderColor} ${isSuggested ? 'ring-2 ring-yellow-400 shadow-lg' : ''}`}>
        <CardHeader className={bgColor}>
          <div className="flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2">
              Court {court.court_number}
              {isSuggested && <Zap className="w-4 h-4 text-yellow-500" />}
              {isReserved && <Lock className="w-4 h-4 text-orange-600" />}
            </h3>
            <div className="flex items-center gap-2">
              {isAvailable && !suggestion && (
                <button
                  onClick={() => handleReserveCourt(court.id)}
                  className="text-base border-2 border-gray-400 rounded hover:border-gray-600 hover:bg-gray-50 transition-all"
                  title="Reserve Court"
                >
                  🔒
                </button>
              )}
              <span className={`px-2 py-1 rounded text-sm ${badgeColor}`}>
                {statusText}
              </span>
            </div>
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
          ) : isReserved ? (
            <div className="space-y-3">
              <div className="bg-orange-50 border border-orange-200 rounded p-3">
                <p className="text-sm font-semibold text-orange-900">Reserved by:</p>
                <p className="text-sm text-orange-800">{court.reserved_by || 'Unknown'}</p>
                {court.reserved_until && (
                  <p className="text-xs text-orange-600 mt-1">
                    Until: {new Date(court.reserved_until).toLocaleString()}
                  </p>
                )}
                {court.reserved_note && (
                  <p className="text-xs text-orange-600 mt-1 italic">
                    Note: {court.reserved_note}
                  </p>
                )}
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleUnreserveCourt(court.id)}
                className="w-full"
              >
                <Unlock className="w-4 h-4 mr-2" />
                Remove Reservation
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
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

  const renderBuildingSection = (
    buildingKey: string,
    buildingName: string,
    buildingColor: string,
    buildingCourts: any[]
  ) => {
    const isCollapsed = collapsedBuildings.has(buildingKey);
    const available = buildingCourts.filter(c => c.status === 'available').length;
    const occupied = buildingCourts.filter(c => c.status === 'occupied').length;
    const buildingQueue = waitingQueue.filter(e => e.building === buildingKey);
    const hasAvailableWithSuggestion = buildingCourts.some(c => c.status === 'available' && matchSuggestions[c.id]);

    return (
      <div key={buildingKey} className="border rounded-lg overflow-hidden">
        <button
          onClick={() => toggleBuildingCollapse(buildingKey)}
          className="w-full bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              <div className={`w-3 h-3 rounded-full ${buildingColor}`}></div>
              <h2 className="text-xl font-bold">{buildingName}</h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <span className="text-green-600 font-bold">{available}</span>
                <span className="text-gray-500"> available</span>
                <span className="mx-2">•</span>
                <span className="text-gray-600 font-bold">{occupied}</span>
                <span className="text-gray-500"> occupied</span>
                <span className="mx-2">•</span>
                <span className="text-blue-600 font-bold">{buildingQueue.length}</span>
                <span className="text-gray-500"> waiting</span>
              </div>
              {hasAvailableWithSuggestion && (
                <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                  Verifying Match
                </div>
              )}
            </div>
          </div>
        </button>

        {!isCollapsed && (
          <div className="p-4 bg-white">
            <div className="grid grid-cols-3 gap-4">
              {/* Available courts first */}
              {buildingCourts
                .filter(c => c.status === 'available')
                .map(court => renderCourt(court))}

              {/* Reserved courts second */}
              {buildingCourts
                .filter(c => c.status === 'reserved')
                .map(court => renderCourt(court))}

              {/* Occupied courts last (visually de-emphasized) */}
              {buildingCourts
                .filter(c => c.status === 'occupied')
                .map(court => renderCourt(court))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* LEFT SIDEBAR - QUEUE (STICKY) */}
      <div className="w-80 bg-white shadow-lg flex flex-col h-screen sticky top-0">
        <div className="p-4 border-b bg-gradient-to-r from-blue-600 to-blue-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6" />
            Queue Management
          </h2>
          <div className="text-sm text-blue-100 mt-1">
            {waitingQueue.length} players waiting
          </div>
        </div>

        {/* Search/Filter */}
        <div className="p-3 border-b bg-gray-50">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name..."
              value={queueSearchTerm}
              onChange={(e) => setQueueSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Building A Queue */}
          <div>
            <h3 className="text-sm font-bold mb-2 flex items-center gap-2 text-gray-700">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              Building A ({waitingQueue.filter(e => e.building === 'building_a').length})
            </h3>
            <div className="space-y-2">
              {waitingQueue
                .filter(e => e.building === 'building_a')
                .filter(e => queueSearchTerm === '' || e.player.name.toLowerCase().includes(queueSearchTerm.toLowerCase()))
                .sort((a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime())
                .map((entry, index) => (
                  <Card key={entry.id} className="shadow-sm">
                    <CardBody className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="font-bold text-sm text-blue-600">#{index + 1}</span>
                          <div className="flex-1">
                            <p className="font-semibold text-sm">{entry.player.name}</p>
                            <p className="text-xs text-gray-500">
                              {skillLevelToPreferenceGroup(entry.player.skill_level) === 'beginner' ? 'Beginner' : 'Intermediate+'}
                              {entry.group_id && ' • Group'}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleRemoveFromQueue(entry.id, entry.player.name)}
                        >
                          <UserX className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              {waitingQueue.filter(e => e.building === 'building_a').length === 0 && (
                <div className="text-center py-3 text-gray-400 text-xs">
                  No players waiting
                </div>
              )}
            </div>
          </div>

          {/* Building B Queue */}
          <div>
            <h3 className="text-sm font-bold mb-2 flex items-center gap-2 text-gray-700">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              Building B ({waitingQueue.filter(e => e.building === 'building_b').length})
            </h3>
            <div className="space-y-2">
              {waitingQueue
                .filter(e => e.building === 'building_b')
                .filter(e => queueSearchTerm === '' || e.player.name.toLowerCase().includes(queueSearchTerm.toLowerCase()))
                .sort((a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime())
                .map((entry, index) => (
                  <Card key={entry.id} className="shadow-sm">
                    <CardBody className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="font-bold text-sm text-green-600">#{index + 1}</span>
                          <div className="flex-1">
                            <p className="font-semibold text-sm">{entry.player.name}</p>
                            <p className="text-xs text-gray-500">
                              {skillLevelToPreferenceGroup(entry.player.skill_level) === 'beginner' ? 'Beginner' : 'Intermediate+'}
                              {entry.group_id && ' • Group'}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleRemoveFromQueue(entry.id, entry.player.name)}
                        >
                          <UserX className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              {waitingQueue.filter(e => e.building === 'building_b').length === 0 && (
                <div className="text-center py-3 text-gray-400 text-xs">
                  No players waiting
                </div>
              )}
            </div>
          </div>

          {/* Building C Queue */}
          <div>
            <h3 className="text-sm font-bold mb-2 flex items-center gap-2 text-gray-700">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              Building C ({waitingQueue.filter(e => e.building === 'building_c').length})
            </h3>
            <div className="space-y-2">
              {waitingQueue
                .filter(e => e.building === 'building_c')
                .filter(e => queueSearchTerm === '' || e.player.name.toLowerCase().includes(queueSearchTerm.toLowerCase()))
                .sort((a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime())
                .map((entry, index) => (
                  <Card key={entry.id} className="shadow-sm">
                    <CardBody className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="font-bold text-sm text-purple-600">#{index + 1}</span>
                          <div className="flex-1">
                            <p className="font-semibold text-sm">{entry.player.name}</p>
                            <p className="text-xs text-gray-500">
                              {skillLevelToPreferenceGroup(entry.player.skill_level) === 'beginner' ? 'Beginner' : 'Intermediate+'}
                              {entry.group_id && ' • Group'}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleRemoveFromQueue(entry.id, entry.player.name)}
                        >
                          <UserX className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              {waitingQueue.filter(e => e.building === 'building_c').length === 0 && (
                <div className="text-center py-3 text-gray-400 text-xs">
                  No players waiting
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-8 space-y-6">
          {/* DASHBOARD SUMMARY */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-bold">Court Officer Dashboard</h1>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => router.push('/admin/analytics')}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Analytics
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => router.push('/admin/groups')}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Manage Groups
                </Button>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-sm text-green-700 font-medium">Available Courts</div>
                <div className="text-3xl font-bold text-green-600 mt-1">
                  {availableCourts.length}
                </div>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="text-sm text-gray-700 font-medium">Occupied Courts</div>
                <div className="text-3xl font-bold text-gray-600 mt-1">
                  {occupiedCourts.length}
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-sm text-blue-700 font-medium">Total in Queue</div>
                <div className="text-3xl font-bold text-blue-600 mt-1">
                  {waitingQueue.length}
                </div>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="text-sm text-yellow-700 font-medium">Utilization</div>
                <div className="text-3xl font-bold text-yellow-600 mt-1">
                  {Math.round(((occupiedCourts.length + reservedCourts.length) / courts.length) * 100)}%
                </div>
              </div>
            </div>

            {/* Suggested Action */}
            {suggestedCourt && (
              <div className="mt-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Zap className="w-6 h-6 text-yellow-600" />
                  <div>
                    <div className="font-bold text-yellow-900">Suggested Next Action</div>
                    <div className="text-sm text-yellow-700">
                      Call next for Court {suggestedCourt.court_number} (
                      {suggestedCourt.building === 'building_a' ? 'Building A' :
                       suggestedCourt.building === 'building_b' ? 'Building B' : 'Building C'})
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => handleCallNext(suggestedCourt.id, suggestedCourt.building)}
                  className="bg-yellow-500 hover:bg-yellow-600"
                >
                  <PlayCircle className="w-4 h-4 mr-2" />
                  Call Now
                </Button>
              </div>
            )}
          </div>

          {/* COLLAPSIBLE BUILDING SECTIONS */}
          <div className="space-y-4">
            {renderBuildingSection('building_a', 'Building A', 'bg-blue-500', courtsByBuilding.building_a)}
            {renderBuildingSection('building_b', 'Building B', 'bg-green-500', courtsByBuilding.building_b)}
            {renderBuildingSection('building_c', 'Building C', 'bg-purple-500', courtsByBuilding.building_c)}
          </div>
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
