"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCourts, useQueue, useStore } from '@/store';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { CourtStatus, MatchSuggestion } from '@/types';
import {
  PlayCircle, CheckCircle, Users, Clock, TrendingUp, BarChart3,
  UserX, AlertTriangle, ChevronDown, ChevronRight, Zap, Activity, Search, Lock, Unlock, GripVertical, UserPlus
} from 'lucide-react';
import { getSkillLevelLabel } from '@/lib/utils/skillLevel';
import { QRScanner } from '@/components/QRScanner';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { PlayerReplacement } from '@/components/PlayerReplacement';
import { ImageWithFallback } from '@/components/ui/ImageWithFallback';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable Queue Item Component
function SortableQueueItem({ entry, countdown, onRemove }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <GripVertical className="w-4 h-4 text-gray-400" />
          <span className="font-bold text-sm text-blue-600">#{entry.position}</span>
          
          {/* Player Photo */}
          <PlayerAvatar
            name={entry.player.name}
            photo_url={entry.player.photo_url}
            display_photo={(entry as any).session?.display_photo}
            size="sm"
            className="shrink-0"
          />
          
          <div className="flex-1 min-w-0 max-w-[120px]">
            <p className="font-semibold text-sm truncate" title={entry.player.name}>{entry.player.name}</p>
            <p className="text-xs text-gray-500">
              {getSkillLevelLabel(entry.player.skill_level)}
              {entry.group_id ? ` • ${(entry as any).group?.name || 'Group'}` : ' • Solo'}
            </p>
            {countdown && (
              <p className={`text-xs font-mono mt-0.5 ${
                countdown === '∞'
                  ? 'text-green-600 font-bold'
                  : 'text-orange-600'
              }`}>
                <Clock className="w-3 h-3 inline mr-1" />
                {countdown === '∞' ? 'Unlimited Time' : countdown}
              </p>
            )}
          </div>
        </div>
        <Button
          variant="danger"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(entry.id, entry.player.name);
          }}
          className="pointer-events-auto"
        >
          <UserX className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

export default function AdminDashboardRedesign() {
  const router = useRouter();
  const { courts, fetchCourts, assignSession, completeSession, subscribeToCourts } = useCourts();
  const { queueEntries, fetchQueue, subscribeToQueue, updateQueuePositions } = useQueue();
  const [matchSuggestions, setMatchSuggestions] = useState<Record<string, MatchSuggestion | null>>({});
  const [verifiedPlayers, setVerifiedPlayers] = useState<Record<string, Set<string>>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [singlesMode, setSinglesMode] = useState<Record<string, boolean>>({});
  const [verifyingCourtId, setVerifyingCourtId] = useState<string | null>(null);
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
  const [soloRemovalModal, setSoloRemovalModal] = useState<{
    isOpen: boolean;
    queueId: string;
    playerName: string;
  }>({
    isOpen: false,
    queueId: '',
    playerName: '',
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sessions, setSessions] = useState<Record<string, any>>({});
  const [scanQrInput, setScanQrInput] = useState('');
  const [scanningQr, setScanningQr] = useState(false);
  const [nameSearchQuery, setNameSearchQuery] = useState('');
  const [nameSearchResults, setNameSearchResults] = useState<any[]>([]);
  const [nameSearchLoading, setNameSearchLoading] = useState(false);
  const [matchCompletionModal, setMatchCompletionModal] = useState<{
    isOpen: boolean;
    courtId: string;
    players: any[];
    matchType: 'singles' | 'doubles';
    teamA: string[];
    teamB: string[];
    teamAScore: number;
    teamBScore: number;
  }>({
    isOpen: false,
    courtId: '',
    players: [],
    matchType: 'doubles',
    teamA: [],
    teamB: [],
    teamAScore: 0,
    teamBScore: 0,
  });
  const [playerReplacementModal, setPlayerReplacementModal] = useState<{
    isOpen: boolean;
    currentPlayerId: string;
    currentPlayerName: string;
    courtId: string;
  }>({
    isOpen: false,
    currentPlayerId: '',
    currentPlayerName: '',
    courtId: '',
  });
  const [autoCompletedCourts, setAutoCompletedCourts] = useState<Set<string>>(new Set());
  
  // Ref to store current courts for timer checking (avoids stale closure)
  const courtsRef = useRef(courts);
  const queueEntriesRef = useRef(queueEntries);

  // Derived state - must be defined early for use in handlers
  const waitingQueue = queueEntries.filter(e => e.status === 'waiting');

  // Update courts ref whenever courts change
  useEffect(() => {
    courtsRef.current = courts;
  }, [courts]);

  // Update queueEntries ref whenever queueEntries change
  useEffect(() => {
    queueEntriesRef.current = queueEntries;
  }, [queueEntries]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px of movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = waitingQueue.findIndex(e => e.id === active.id);
      const newIndex = waitingQueue.findIndex(e => e.id === over.id);

      if (oldIndex === -1 || newIndex === -1) {
        console.error('[Drag] Invalid indices', { oldIndex, newIndex });
        return;
      }

      // Reorder locally first for immediate feedback
      const reordered = arrayMove(waitingQueue, oldIndex, newIndex);

      // Update positions in the database
      const updates = reordered.map((entry, index) => ({
        id: entry.id,
        position: index + 1,
      }));

      try {
        await updateQueuePositions(updates);
      } catch (error) {
        console.error('[Drag] Failed to update queue positions:', error);
        alert('Failed to reorder queue: ' + (error as Error).message);
      }
    }
  };

  // Hydrate store on mount
  useEffect(() => {
    const { useStore } = require('@/store');
    useStore.persist.rehydrate();
    
    // Request notification permission for auto-complete alerts
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    fetchCourts();
    fetchQueue();

    // Update every second for countdowns
    const updateInterval = setInterval(() => {
      const newTime = new Date();
      setCurrentTime(newTime);

      // Check for expired court timers and auto-open match completion modal
      // Use courts ref to get current courts data (avoids stale closure)
      const currentCourts = courtsRef.current;
      if (currentCourts && Array.isArray(currentCourts)) {
        currentCourts.forEach((court: any) => {
        if (court.status === 'occupied' && court.court_timer_started_at) {
          const startTime = new Date(court.court_timer_started_at).getTime();
          const twentyMinutesInMs = 20 * 60 * 1000; // 20 minutes for production
          const elapsed = newTime.getTime() - startTime;
          const remaining = twentyMinutesInMs - elapsed;

          // If timer just expired (within the last second) and modal isn't already open
          if (remaining <= 0 && remaining > -1000 && !matchCompletionModal.isOpen && !autoCompletedCourts.has(court.id)) {
            console.log(`[Auto-Complete] Court ${court.court_number} timer expired, opening match completion modal`);
            
            // Show browser notification if possible
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(`Court ${court.court_number} - Time's Up!`, {
                body: 'Match completion modal opened automatically',
                icon: '/favicon.ico'
              });
            }
            
            setAutoCompletedCourts(prev => new Set([...prev, court.id]));
            
            // Use fresh queue data for the modal
            const freshQueueEntries = queueEntriesRef.current;
            openMatchCompletionModalWithData(court.id, freshQueueEntries);
          }
        }
      });
      } // Close the if (courts && Array.isArray(courts)) check
    }, 1000);

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
      clearInterval(updateInterval);
      clearInterval(expirationInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Remove courts dependency to prevent infinite loop

  // Fetch sessions for countdown
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const waiting = queueEntries.filter(e => e.status === 'waiting');
        const playerIds = waiting.map(e => e.player_id);
        if (playerIds.length === 0) return;

        // Fetch sessions with player unlimited_time flag
        const { data } = await (await import('@/lib/supabase/client')).supabase
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

  const getCourtTimerCountdown = (court: any) => {
    if (!court.court_timer_started_at) return null;

    const startTime = new Date(court.court_timer_started_at).getTime();
    const twentyMinutesInMs = 20 * 60 * 1000; // 20 minutes for production
    const elapsed = currentTime.getTime() - startTime;
    const remaining = twentyMinutesInMs - elapsed;

    if (remaining <= 0) return '0:00';

    const totalSeconds = Math.floor(remaining / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  };

  // Keyboard shortcuts removed for now - kept hint for visual reference

  const handleCallNext = async (courtId: string) => {
    setLoading({ ...loading, [courtId]: true });

    try {
      const response = await fetch('/api/matchmaking/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ court_id: courtId }),
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

  const handleCallNextSingles = async (courtId: string) => {
    setLoading({ ...loading, [courtId]: true });

    try {
      const response = await fetch('/api/matchmaking/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ court_id: courtId, match_type: 'singles' }),
      });

      const data = await response.json();

      if (data.match) {
        setMatchSuggestions({ ...matchSuggestions, [courtId]: data.match });
        const playerIds = new Set<string>(data.match.players.map((p: any) => p.id));
        setVerifiedPlayers({ ...verifiedPlayers, [courtId]: playerIds });
        setSinglesMode({ ...singlesMode, [courtId]: true });
        setVerifyingCourtId(courtId);
      } else {
        alert(data.reason || 'No players available in queue for singles');
      }
    } catch (error) {
      alert('Failed to generate singles match: ' + (error as Error).message);
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
    setSinglesMode({ ...singlesMode, [courtId]: false });
    setVerifyingCourtId(null);
  };

  const handleReplaceNoShows = async (courtId: string) => {
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
    const isSingles = match.match_type === 'singles';
    const expectedPlayers = isSingles ? 2 : 4;

    if (!verified || verified.size !== expectedPlayers) {
      alert(`Please verify all ${expectedPlayers} players are present (currently ${verified?.size || 0}/${expectedPlayers} verified)`);
      return;
    }

    try {
      if (!match.players || match.players.length !== expectedPlayers) {
        throw new Error(`Invalid match: Expected ${expectedPlayers} players, got ${match.players?.length || 0}`);
      }

      const invalidPlayers = match.players.filter(p => !p || !p.id);
      if (invalidPlayers.length > 0) {
        throw new Error(`Invalid match data: ${invalidPlayers.length} player(s) missing ID`);
      }

      // Verify at least one player has an active session
      const { data: existingSession } = await (await import('@/lib/supabase/client')).supabase
        .from('sessions')
        .select('id')
        .eq('player_id', match.players[0].id)
        .eq('status', 'active')
        .single();

      if (!existingSession) {
        throw new Error(`Player ${match.players[0].name} doesn't have an active session. Check them in first at /cashier.`);
      }

      // Assign court and start 20-minute timer with player data
      const playerData = match.players.map((p: any) => ({
        id: p.id,
        name: p.name,
        skill_level: p.skill_level,
        photo_url: p.photo_url || null
      }));
      
      await assignSession(courtId, playerData);

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

      console.log('[MATCH ASSIGNMENT] Starting match assignment for court:', courtId);
      console.log('[MATCH ASSIGNMENT] Players to assign:', match.players.map(p => ({ id: p.id, name: p.name })));

      for (const player of match.players) {
        if (!player || !player.id) {
          console.warn('Skipping invalid player:', player);
          continue;
        }

        const queueEntry = queueEntries.find(e => e.player_id === player.id);
        if (queueEntry) {
          console.log(`[MATCH ASSIGNMENT] Updating queue entry for ${player.name} (${player.id})`);
          
          const { error } = await (await import('@/lib/supabase/client')).supabase
            .from('queue')
            .update({ status: 'playing', court_id: courtId })
            .eq('id', queueEntry.id);

          if (error) {
            console.error('Error updating queue for player', player.id, error);
            throw new Error(`Failed to update queue for ${player.name}: ${error.message}`);
          } else {
            console.log(`[MATCH ASSIGNMENT] Successfully updated queue for ${player.name}`);
          }
        } else {
          console.warn('Queue entry not found for player:', player);
          throw new Error(`Queue entry not found for player ${player.name}`);
        }
      }

      console.log('[MATCH ASSIGNMENT] All queue entries updated, refreshing data...');

      setMatchSuggestions({ ...matchSuggestions, [courtId]: null });
      setVerifiedPlayers({ ...verifiedPlayers, [courtId]: new Set() });
      setSinglesMode({ ...singlesMode, [courtId]: false });
      setVerifyingCourtId(null);

      // Refresh queue to get updated status
      await fetchQueue();
      await fetchCourts();

      console.log('[MATCH ASSIGNMENT] Match assignment completed successfully');
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
    console.log('[Frontend] handleRemoveFromQueue called with:', { queueId, playerName });

    const queueEntry = queueEntries.find(e => e.id === queueId);

    if (queueEntry?.group_id) {
      console.log('[Frontend] Player is in a group, showing group removal modal');
      const groupMembers = queueEntries.filter(e => e.group_id === queueEntry.group_id);

      setGroupRemovalModal({
        isOpen: true,
        groupMembers,
        selectedIds: new Set([queueId]),
      });
      return;
    }

    // Show solo removal modal instead of confusing confirm() dialog
    console.log('[Frontend] Showing solo removal modal');
    setSoloRemovalModal({
      isOpen: true,
      queueId,
      playerName,
    });
  };

  const handleSoloRemovalAction = async (action: 'break' | 'end') => {
    const { queueId, playerName } = soloRemovalModal;
    const reason = action === 'end' ? 'left_facility' : 'temporary_break';
    const shouldEndSession = action === 'end';

    console.log('[Frontend] Solo removal action:', { queueId, playerName, action, reason, shouldEndSession });

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

      console.log('[Frontend] API response status:', response.status);
      const data = await response.json();
      console.log('[Frontend] API response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove player');
      }

      // Close modal first
      setSoloRemovalModal({ isOpen: false, queueId: '', playerName: '' });

      if (shouldEndSession) {
        alert(`${playerName} removed from queue. Session ended - they must check in at cashier again.`);
      } else {
        alert(`${playerName} removed from queue. Session still active - they can scan QR to rejoin.`);
      }

      console.log('[Frontend] About to refresh queue');
      await fetchQueue();
      console.log('[Frontend] Queue refreshed');
    } catch (error) {
      console.error('[Frontend] Error removing player:', error);
      alert('Failed to remove player: ' + (error as Error).message);
      setSoloRemovalModal({ isOpen: false, queueId: '', playerName: '' });
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

  const handleScanToRejoin = async (e?: React.FormEvent, qrCode?: string) => {
    e?.preventDefault();

    const codeToUse = qrCode || scanQrInput.trim();

    if (!codeToUse) {
      alert('Please enter a QR code');
      return;
    }

    setScanningQr(true);
    try {
      const response = await fetch('/api/queue/scan-to-rejoin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_uuid: codeToUse }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Failed to rejoin queue');
        return;
      }

      alert(`✓ Player added to queue at position ${data.queue_position}`);
      setScanQrInput('');
      await fetchQueue();
    } catch (error) {
      alert('Failed to rejoin queue: ' + (error as Error).message);
    } finally {
      setScanningQr(false);
    }
  };

  // Name search functions for adding players to queue
  const handleNameSearch = async (query: string) => {
    setNameSearchQuery(query);

    if (query.trim().length < 2) {
      setNameSearchResults([]);
      return;
    }

    setNameSearchLoading(true);
    try {
      const response = await fetch(`/api/players/search?name=${encodeURIComponent(query)}`);
      const data = await response.json();

      if (response.ok) {
        setNameSearchResults(data);
      } else {
        console.error('Search error:', data.error);
        setNameSearchResults([]);
      }
    } catch (error) {
      console.error('Failed to search:', error);
      setNameSearchResults([]);
    } finally {
      setNameSearchLoading(false);
    }
  };

  const selectPlayerFromNameSearch = async (player: any) => {
    // Use the same logic as handleScanToRejoin but with the player's QR UUID
    setScanningQr(true);
    try {
      const response = await fetch('/api/queue/scan-to-rejoin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_uuid: player.qr_uuid }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Failed to add player to queue');
        return;
      }

      alert(`✓ ${player.name} added to queue at position ${data.queue_position}`);
      setNameSearchQuery('');
      setNameSearchResults([]);
      await fetchQueue();
    } catch (error) {
      alert('Failed to add player to queue: ' + (error as Error).message);
    } finally {
      setScanningQr(false);
    }
  };

  const openMatchCompletionModal = (courtId: string) => {
    openMatchCompletionModalWithData(courtId, queueEntries);
  };

  const openMatchCompletionModalWithData = (courtId: string, entries: any[]) => {
    // First try to get players from court's stored data (handles session expiry)
    const court = courts.find(c => c.id === courtId);
    let playersData = [];

    console.log(`[Match Completion Debug] Court ${courtId}:`, {
      courtFound: !!court,
      courtCurrentPlayers: court ? (court as any).current_players : null,
      queueEntries: entries.length
    });

    if (court && (court as any).current_players && Array.isArray((court as any).current_players)) {
      // Use stored player data from court - convert to expected format
      const storedPlayers = (court as any).current_players;
      playersData = storedPlayers.map((p: any) => ({
        player_id: p.id,
        player: {
          name: p.name,
          skill_level: p.skill_level || 3.5, // Default skill if not stored
          photo_url: p.photo_url
        }
      }));
      console.log(`[Match Completion Debug] Using stored court data for ${courtId}:`, playersData);
    } else {
      // Fallback: Get players currently on this court from queue
      const playingOnCourt = entries.filter(
        e => e.status === 'playing' && e.court_id === courtId
      );

      console.log(`[Match Completion Debug] Court ${courtId} fallback to queue:`, {
        totalEntries: entries.length,
        playingOnCourt: playingOnCourt.length,
        allStatuses: entries.map(e => ({ name: e.player?.name, status: e.status, court_id: e.court_id }))
      });

      playersData = playingOnCourt; // Queue data is already in the right format
    }

    // Determine match type based on player count
    const matchType = playersData.length === 2 ? 'singles' : 'doubles';

    if (playersData.length !== 2 && playersData.length !== 4) {
      alert(`Expected 2 (singles) or 4 (doubles) players on court, found ${playersData.length}. Cannot complete match.`);
      return;
    }

    console.log(`[Match Completion Debug] Final player data:`, playersData, `Match type: ${matchType}`);

    // Auto-assign teams
    const playerIds = playersData.map((p: any) => p.player_id);

    if (matchType === 'singles') {
      // Singles: 1 player per team
      setMatchCompletionModal({
        isOpen: true,
        courtId,
        players: playersData,
        matchType: 'singles',
        teamA: [playerIds[0]],
        teamB: [playerIds[1]],
        teamAScore: 0,
        teamBScore: 0,
      });
    } else {
      // Doubles: 2 players per team
      setMatchCompletionModal({
        isOpen: true,
        courtId,
        players: playersData,
        matchType: 'doubles',
        teamA: [playerIds[0], playerIds[1]],
        teamB: [playerIds[2], playerIds[3]],
        teamAScore: 0,
        teamBScore: 0,
      });
    }
  };

  const movePlayerToTeam = (playerId: string, fromTeam: 'A' | 'B') => {
    const { teamA, teamB } = matchCompletionModal;

    if (fromTeam === 'A') {
      // Move from Team A to Team B
      if (teamB.length >= 2) {
        // If Team B is full, we need to swap - move the first player from Team B to Team A
        const playerToSwap = teamB[0]; // Take the first player from Team B
        const newTeamA = teamA.filter(id => id !== playerId).concat(playerToSwap);
        const newTeamB = teamB.filter(id => id !== playerToSwap).concat(playerId);
        
        setMatchCompletionModal({
          ...matchCompletionModal,
          teamA: newTeamA,
          teamB: newTeamB,
        });
      } else {
        // Team B has space, just move the player
        const newTeamA = teamA.filter(id => id !== playerId);
        const newTeamB = [...teamB, playerId];
        setMatchCompletionModal({
          ...matchCompletionModal,
          teamA: newTeamA,
          teamB: newTeamB,
        });
      }
    } else {
      // Move from Team B to Team A
      if (teamA.length >= 2) {
        // If Team A is full, we need to swap - move the first player from Team A to Team B
        const playerToSwap = teamA[0]; // Take the first player from Team A
        const newTeamB = teamB.filter(id => id !== playerId).concat(playerToSwap);
        const newTeamA = teamA.filter(id => id !== playerToSwap).concat(playerId);
        
        setMatchCompletionModal({
          ...matchCompletionModal,
          teamA: newTeamA,
          teamB: newTeamB,
        });
      } else {
        // Team A has space, just move the player
        const newTeamB = teamB.filter(id => id !== playerId);
        const newTeamA = [...teamA, playerId];
        setMatchCompletionModal({
          ...matchCompletionModal,
          teamA: newTeamA,
          teamB: newTeamB,
        });
      }
    }
  };

  const handleCompleteMatch = async () => {
    const { courtId, matchType, teamA, teamB, teamAScore, teamBScore } = matchCompletionModal;

    // Validate team sizes based on match type
    const expectedSize = matchType === 'singles' ? 1 : 2;
    if (teamA.length !== expectedSize || teamB.length !== expectedSize) {
      alert(`Each team must have exactly ${expectedSize} player(s) for ${matchType}`);
      return;
    }

    try {
      const response = await fetch('/api/match-history/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          court_id: courtId,
          match_type: matchType,
          team_a_player_1_id: teamA[0],
          team_a_player_2_id: teamA[1] || null,
          team_b_player_1_id: teamB[0],
          team_b_player_2_id: teamB[1] || null,
          team_a_score: teamAScore,
          team_b_score: teamBScore,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete match');
      }

      const winner = teamAScore > teamBScore ? 'Team A' : teamBScore > teamAScore ? 'Team B' : 'Tie';
      alert(`✓ Match completed! ${winner} wins (${teamAScore}-${teamBScore})`);

      // Clear the auto-completed flag for this court
      setAutoCompletedCourts(prev => {
        const newSet = new Set(prev);
        newSet.delete(courtId);
        return newSet;
      });

      setMatchCompletionModal({
        isOpen: false,
        courtId: '',
        players: [],
        matchType: 'doubles',
        teamA: [],
        teamB: [],
        teamAScore: 0,
        teamBScore: 0,
      });

      await fetchQueue();
      await fetchCourts();
    } catch (error) {
      alert('Failed to complete match: ' + (error as Error).message);
    }
  };

  // Player replacement handlers
  const openPlayerReplacement = (currentPlayerId: string, currentPlayerName: string, courtId: string) => {
    setPlayerReplacementModal({
      isOpen: true,
      currentPlayerId,
      currentPlayerName,
      courtId,
    });
  };

  const closePlayerReplacement = () => {
    setPlayerReplacementModal({
      isOpen: false,
      currentPlayerId: '',
      currentPlayerName: '',
      courtId: '',
    });
  };

  const handlePlayerReplacement = async (replacementPlayerId: string) => {
    const { currentPlayerId, courtId } = playerReplacementModal;

    try {
      // 1. Take the current player on break (remove from queue but keep session active)
      const currentPlayerQueueEntry = queueEntries.find(e => e.player_id === currentPlayerId && e.status === 'waiting');
      if (currentPlayerQueueEntry) {
        await fetch('/api/queue/remove', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            queueId: currentPlayerQueueEntry.id,
            reason: 'temporary_break',
            shouldEndSession: false,
          }),
        });
      }

      // 2. Add the replacement player to the queue
      await fetch('/api/queue/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: replacementPlayerId,
        }),
      });

      // 3. Update the match suggestion to replace the current player with the replacement
      const suggestion = matchSuggestions[courtId];
      if (suggestion) {
        const updatedPlayers = suggestion.players.map((p: any) => 
          p.id === currentPlayerId 
            ? {
                id: replacementPlayerId,
                name: queueEntries.find(e => e.player_id === replacementPlayerId)?.player?.name || 'Unknown',
                skill_level: queueEntries.find(e => e.player_id === replacementPlayerId)?.player?.skill_level || 'unknown',
                photo_url: queueEntries.find(e => e.player_id === replacementPlayerId)?.player?.photo_url || null
              }
            : p
        );

        // Update the match suggestion
        setMatchSuggestions({
          ...matchSuggestions,
          [courtId]: {
            ...suggestion,
            players: updatedPlayers
          }
        });

        // Update verified players set - remove current player, add replacement
        const verified = verifiedPlayers[courtId] || new Set();
        const newVerified = new Set(verified);
        newVerified.delete(currentPlayerId);
        newVerified.add(replacementPlayerId);
        setVerifiedPlayers({
          ...verifiedPlayers,
          [courtId]: newVerified
        });
      }

      await fetchQueue();

      alert('Player replaced successfully! You can now start the match.');
    } catch (error) {
      console.error('Error replacing player:', error);
      alert('Failed to replace player: ' + (error as Error).message);
    }
  };

  const availableCourts = courts.filter(c => c.status === 'available');
  const occupiedCourts = courts.filter(c => c.status === 'occupied');
  const reservedCourts = courts.filter(c => c.status === 'reserved');

  // Get suggested next court (first available court with enough players in queue)
  const getSuggestedNextCourt = () => {
    if (waitingQueue.length >= 4) {
      return availableCourts[0] || null;
    }
    return null;
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
          onClick={() => handleCallNext(court.id)}
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
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-red-600 font-medium">No-show</span>
                              <button
                                onClick={() => openPlayerReplacement(p.id, p.name, court.id)}
                                className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                                title="Replace Player"
                              >
                                Replace
                              </button>
                            </div>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                    <p className="text-xs text-yellow-800">
                      ✓ <strong>{verified.size}/{suggestion.match_type === 'singles' ? 2 : 4}</strong> players verified
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleStartMatch(court.id, suggestion)}
                      disabled={verified.size !== (suggestion.match_type === 'singles' ? 2 : 4)}
                      className="w-full"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Start Match ({verified.size}/{suggestion.match_type === 'singles' ? 2 : 4})
                    </Button>

                    {verified.size < (suggestion.match_type === 'singles' ? 2 : 4) && (
                      <div className="text-xs text-orange-600 text-center">
                        💡 Individual "Replace" buttons are available for each no-show player above
                      </div>
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
                <div className="space-y-2">
                  <Button
                    size="sm"
                    onClick={() => handleCallNext(court.id)}
                    disabled={loading[court.id] || (verifyingCourtId !== null && verifyingCourtId !== court.id)}
                    className="w-full"
                  >
                    <PlayCircle className="w-4 h-4 mr-2" />
                    {loading[court.id] ? 'Loading...' : verifyingCourtId && verifyingCourtId !== court.id ? 'Verifying Other Court...' : 'Call Doubles'}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleCallNextSingles(court.id)}
                    disabled={loading[court.id] || (verifyingCourtId !== null && verifyingCourtId !== court.id) || queueEntries.length < 2}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <PlayCircle className="w-4 h-4 mr-2" />
                    Call Singles
                  </Button>
                </div>
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
              {(() => {
                const countdown = getCourtTimerCountdown(court);
                const isOvertime = countdown === '0:00';
                return (
                  <>
                    <div className={`flex items-center justify-between p-3 rounded-lg ${
                      isOvertime ? 'bg-red-50 border-2 border-red-300' : 'bg-blue-50 border border-blue-200'
                    }`}>
                      <div className="flex items-center gap-2">
                        <Clock className={`w-5 h-5 ${isOvertime ? 'text-red-600' : 'text-blue-600'}`} />
                        <span className={`text-sm font-medium ${isOvertime ? 'text-red-900' : 'text-blue-900'}`}>
                          {isOvertime ? 'Overtime!' : 'Time Remaining'}
                        </span>
                      </div>
                      <span className={`text-2xl font-bold font-mono ${
                        isOvertime ? 'text-red-600 animate-pulse' : 'text-blue-600'
                      }`}>
                        {countdown || '20:00'}
                      </span>
                    </div>
                  </>
                );
              })()}

              {/* Current Players on Court */}
              {(() => {
                const playingOnCourt = queueEntries.filter(
                  e => e.status === 'playing' && e.court_id === court.id
                );

                if (playingOnCourt.length === 0) {
                  // Try to get players from court's stored data
                  const courtPlayers = (court as any).current_players;
                  if (courtPlayers && Array.isArray(courtPlayers)) {
                    return (
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-gray-700">Current Players:</p>
                        {courtPlayers.map((player: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded border">
                            <PlayerAvatar
                              name={player.name}
                              photo_url={player.photo_url}
                              size="sm"
                              className="shrink-0"
                            />
                            <div className="flex-1">
                              <p className="font-semibold text-sm">{player.name}</p>
                              <p className="text-xs text-gray-600">{getSkillLevelLabel(player.skill_level)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }

                return (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-700">Current Players:</p>
                    {playingOnCourt.map((entry) => (
                      <div key={entry.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded border">
                        <PlayerAvatar
                          name={entry.player.name}
                          photo_url={entry.player.photo_url}
                          display_photo={(entry as any).session?.display_photo}
                          size="sm"
                          className="shrink-0"
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{entry.player.name}</p>
                          <p className="text-xs text-gray-600">{getSkillLevelLabel(entry.player.skill_level)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              <Button
                size="sm"
                variant="success"
                onClick={() => openMatchCompletionModal(court.id)}
                className="w-full"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Complete Match
              </Button>
            </div>
          )}
        </CardBody>
      </Card>
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

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {(() => {
              // Filter and sort queue first to ensure SortableContext and rendered items match
              const filteredQueue = waitingQueue
                .filter(e => queueSearchTerm === '' || e.player.name.toLowerCase().includes(queueSearchTerm.toLowerCase()))
                .sort((a, b) => a.position - b.position);

              return (
                <SortableContext
                  items={filteredQueue.map(e => e.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {filteredQueue.map((entry) => {
                    const countdown = getSessionCountdown(entry.player_id);
                    return (
                      <SortableQueueItem
                        key={entry.id}
                        entry={entry}
                        countdown={countdown}
                        onRemove={handleRemoveFromQueue}
                      />
                    );
                  })}
                </SortableContext>
              );
            })()}
            {waitingQueue.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                No players in queue
              </div>
            )}
          </div>
        </DndContext>
                {/* Scan to Rejoin Queue */}
        <div className="p-3 border-b bg-green-50 border-green-200">
          <label className="text-sm font-semibold text-green-900 flex items-center gap-1 mb-2">
            <Activity className="w-4 h-4" />
            Scan QR to Rejoin Queue
          </label>

          {/* QR Scanner */}
          <QRScanner
            onScan={(qrCode) => {
              handleScanToRejoin(undefined, qrCode);
            }}
          />

          {/* Name Search */}
          <div className="mt-3 relative">
            <label className="text-xs text-green-800 flex items-center gap-1 mb-1">
              <UserPlus className="w-3 h-3" />
              Or search by name:
            </label>

            {/* Search Results Dropdown - positioned above */}
            {nameSearchQuery.length >= 2 && (
              <div className="absolute z-20 w-full bottom-full mb-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {nameSearchLoading ? (
                  <div className="p-3 text-center text-gray-500 text-sm">Searching...</div>
                ) : nameSearchResults.length > 0 ? (
                  <div className="divide-y">
                    {nameSearchResults.map((result) => (
                      <button
                        key={result.id}
                        onClick={() => selectPlayerFromNameSearch(result)}
                        disabled={scanningQr}
                        className="w-full p-2 hover:bg-gray-50 flex items-center gap-2 text-left transition-colors disabled:opacity-50"
                      >
                        <ImageWithFallback
                          src={result.photo_url}
                          alt={result.name}
                          name={result.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{result.name}</p>
                          <p className="text-xs text-gray-600">
                            {getSkillLevelLabel(result.skill_level)}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 text-center text-gray-500 text-sm">No players found</div>
                )}
              </div>
            )}

            <input
              type="text"
              placeholder="Type player name..."
              value={nameSearchQuery}
              onChange={(e) => handleNameSearch(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              disabled={scanningQr}
            />
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
                      Call next for Court {suggestedCourt.court_number}
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => handleCallNext(suggestedCourt.id)}
                  className="bg-yellow-500 hover:bg-yellow-600"
                >
                  <PlayCircle className="w-4 h-4 mr-2" />
                  Call Now
                </Button>
              </div>
            )}
          </div>

          {/* COURTS SECTION */}
          <div className="border rounded-lg overflow-hidden">
            <div className="p-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">All Courts</h2>
                <div className="flex items-center gap-4">
                  <div className="text-sm">
                    <span className="text-green-600 font-bold">{availableCourts.length}</span>
                    <span className="text-gray-500"> available</span>
                    <span className="mx-2">•</span>
                    <span className="text-gray-600 font-bold">{occupiedCourts.length}</span>
                    <span className="text-gray-500"> occupied</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 bg-white">
              <div className="grid grid-cols-3 gap-4">
                {/* Available courts first */}
                {courts
                  .filter(c => c.status === 'available')
                  .map(court => renderCourt(court))}

                {/* Reserved courts second */}
                {courts
                  .filter(c => c.status === 'reserved')
                  .map(court => renderCourt(court))}

                {/* Occupied courts last */}
                {courts
                  .filter(c => c.status === 'occupied')
                  .map(court => renderCourt(court))}
              </div>
            </div>
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
                        {getSkillLevelLabel(member.player.skill_level)}
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

      {/* Solo Removal Modal */}
      {soloRemovalModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-xl font-bold mb-2">Remove {soloRemovalModal.playerName}?</h3>
              <p className="text-gray-600 text-sm mb-6">
                Choose what to do with their session:
              </p>

              <div className="space-y-3">
                {/* Take a Break Option */}
                <button
                  onClick={() => handleSoloRemovalAction('break')}
                  className="w-full p-4 rounded-lg border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-400 transition text-left"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-500 rounded-full">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-blue-900">Take a Break</p>
                      <p className="text-sm text-blue-700 mt-1">
                        Remove from queue but keep session active. They can scan their QR code to rejoin when ready.
                      </p>
                    </div>
                  </div>
                </button>

                {/* End Session Option */}
                <button
                  onClick={() => handleSoloRemovalAction('end')}
                  className="w-full p-4 rounded-lg border-2 border-red-200 bg-red-50 hover:bg-red-100 hover:border-red-400 transition text-left"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-red-500 rounded-full">
                      <UserX className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-red-900">End Session</p>
                      <p className="text-sm text-red-700 mt-1">
                        Player left or no-show. Ends their session completely - they must check in at cashier again.
                      </p>
                    </div>
                  </div>
                </button>
              </div>

              <div className="mt-6 pt-4 border-t">
                <Button
                  variant="secondary"
                  onClick={() => setSoloRemovalModal({ isOpen: false, queueId: '', playerName: '' })}
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Match Completion Modal */}
      {matchCompletionModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="p-6">
              <h3 className="text-2xl font-bold mb-4">Complete Match - Court {courts.find(c => c.id === matchCompletionModal.courtId)?.court_number}</h3>

              {/* Team Assignment */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Team A */}
                <div className="border-2 border-blue-500 rounded-lg p-4 bg-blue-50">
                  <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Team A
                  </h4>
                  <div className="space-y-2">
                    {matchCompletionModal.teamA.map((playerId, idx) => {
                      const entry = matchCompletionModal.players.find(p => p.player_id === playerId);
                      return (
                        <div key={idx} className="bg-white p-2 rounded border border-blue-300 flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-semibold text-sm">{entry?.player?.name || 'Unknown'}</p>
                            <p className="text-xs text-gray-600">{entry?.player?.skill_level}</p>
                          </div>
                          <button
                            onClick={() => movePlayerToTeam(playerId, 'A')}
                            className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
                            title="Move to Team B"
                          >
                            →
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3">
                    <label className="text-sm font-semibold text-blue-900 block mb-1">Score:</label>
                    <input
                      type="number"
                      min="0"
                      value={matchCompletionModal.teamAScore}
                      onChange={(e) => setMatchCompletionModal({
                        ...matchCompletionModal,
                        teamAScore: parseInt(e.target.value) || 0
                      })}
                      className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg text-2xl font-bold text-center"
                    />
                  </div>
                </div>

                {/* Team B */}
                <div className="border-2 border-red-500 rounded-lg p-4 bg-red-50">
                  <h4 className="font-bold text-red-900 mb-3 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Team B
                  </h4>
                  <div className="space-y-2">
                    {matchCompletionModal.teamB.map((playerId, idx) => {
                      const entry = matchCompletionModal.players.find(p => p.player_id === playerId);
                      return (
                        <div key={idx} className="bg-white p-2 rounded border border-red-300 flex items-center justify-between">
                          <button
                            onClick={() => movePlayerToTeam(playerId, 'B')}
                            className="mr-2 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                            title="Move to Team A"
                          >
                            ←
                          </button>
                          <div className="flex-1">
                            <p className="font-semibold text-sm">{entry?.player?.name || 'Unknown'}</p>
                            <p className="text-xs text-gray-600">{entry?.player?.skill_level}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3">
                    <label className="text-sm font-semibold text-red-900 block mb-1">Score:</label>
                    <input
                      type="number"
                      min="0"
                      value={matchCompletionModal.teamBScore}
                      onChange={(e) => setMatchCompletionModal({
                        ...matchCompletionModal,
                        teamBScore: parseInt(e.target.value) || 0
                      })}
                      className="w-full px-3 py-2 border-2 border-red-300 rounded-lg text-2xl font-bold text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Winner Display */}
              {(matchCompletionModal.teamAScore > 0 || matchCompletionModal.teamBScore > 0) && (
                <div className="mb-4 p-3 bg-yellow-50 border-2 border-yellow-400 rounded-lg text-center">
                  <p className="font-bold text-yellow-900">
                    {matchCompletionModal.teamAScore > matchCompletionModal.teamBScore
                      ? '🏆 Team A Wins!'
                      : matchCompletionModal.teamBScore > matchCompletionModal.teamAScore
                      ? '🏆 Team B Wins!'
                      : '🤝 Tie Game'}
                  </p>
                  <p className="text-sm text-yellow-800 mt-1">
                    Final Score: {matchCompletionModal.teamAScore} - {matchCompletionModal.teamBScore}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    // Clear the auto-completed flag for this court when manually cancelled
                    setAutoCompletedCourts(prev => {
                      const newSet = new Set(prev);
                      newSet.delete(matchCompletionModal.courtId);
                      return newSet;
                    });
                    
                    setMatchCompletionModal({
                      isOpen: false,
                      courtId: '',
                      players: [],
                      matchType: 'doubles',
                      teamA: [],
                      teamB: [],
                      teamAScore: 0,
                      teamBScore: 0,
                    });
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="success"
                  onClick={handleCompleteMatch}
                  className="flex-1"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Complete Match & Update Stats
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Player Replacement Modal */}
      <PlayerReplacement
        isOpen={playerReplacementModal.isOpen}
        onClose={closePlayerReplacement}
        onReplace={handlePlayerReplacement}
        currentPlayerName={playerReplacementModal.currentPlayerName}
        currentPlayerId={playerReplacementModal.currentPlayerId}
        courtId={playerReplacementModal.courtId}
      />
    </div>
  );
}
