"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { QRScanner } from '@/components/QRScanner';
import { useStore } from '@/store';
import { Player, PlayerPreferences, BuildingType } from '@/types';
import { Scan, Users, Clock, Keyboard, UserPlus, X, Check, MapPin } from 'lucide-react';
import { assignBuildingForPlayers } from '@/lib/matchmaking/buildingAssignment';
import { getSkillLevelLabel } from '@/lib/utils/skillLevel';

interface GroupMember extends Player {
  qr_uuid_used: string;
}

export default function CashierPage() {
  // Mode selection
  const [isGroupMode, setIsGroupMode] = useState(false);

  // Solo mode state
  const [qrCode, setQrCode] = useState('');
  const [player, setPlayer] = useState<Player | null>(null);

  // Helper function to get valid gender preference options based on player gender
  const getGenderPreferenceOptions = (playerGender: 'male' | 'female' | 'other') => {
    if (playerGender === 'male') {
      return [
        { value: 'random', label: 'Random' },
        { value: 'mens', label: "Men's" },
        { value: 'mixed', label: 'Mixed' },
      ];
    } else if (playerGender === 'female') {
      return [
        { value: 'random', label: 'Random' },
        { value: 'womens', label: "Women's" },
        { value: 'mixed', label: 'Mixed' },
      ];
    } else {
      // For 'other' gender, show mixed and random only
      return [
        { value: 'random', label: 'Random' },
        { value: 'mixed', label: 'Mixed' },
      ];
    }
  };

  // Helper function for group mode - determine valid options based on group composition
  const getGroupGenderPreferenceOptions = (members: GroupMember[]) => {
    if (members.length === 0) {
      return [
        { value: 'random', label: 'Random' },
        { value: 'mens', label: "Men's" },
        { value: 'womens', label: "Women's" },
        { value: 'mixed', label: 'Mixed' },
      ];
    }

    const genders = members.map(m => m.gender);
    const allMale = genders.every(g => g === 'male');
    const allFemale = genders.every(g => g === 'female');
    const isMixed = !allMale && !allFemale;

    if (allMale) {
      return [
        { value: 'random', label: 'Random' },
        { value: 'mens', label: "Men's" },
        { value: 'mixed', label: 'Mixed' },
      ];
    } else if (allFemale) {
      return [
        { value: 'random', label: 'Random' },
        { value: 'womens', label: "Women's" },
        { value: 'mixed', label: 'Mixed' },
      ];
    } else {
      // Mixed group - can only play Mixed or Random
      return [
        { value: 'random', label: 'Random' },
        { value: 'mixed', label: 'Mixed' },
      ];
    }
  };

  // Group mode state
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [currentScanQr, setCurrentScanQr] = useState('');

  // Shared state
  const [preferences, setPreferences] = useState<Partial<PlayerPreferences>>({
    skill_level_pref: 'beginner',
    gender_pref: 'random',
    match_type: 'solo',
  });
  const [assignedBuilding, setAssignedBuilding] = useState<{ building: BuildingType; reason: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isRejoining, setIsRejoining] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  const { addToQueue, queueEntries, courts } = useStore();
  const { buildings, fetchBuildings } = useStore();

  // Fetch buildings on mount
  useEffect(() => {
    fetchBuildings();
  }, [fetchBuildings]);

  // Validate gender preference when group composition changes
  useEffect(() => {
    if (isGroupMode && groupMembers.length > 0) {
      const validOptions = getGroupGenderPreferenceOptions(groupMembers);
      const isValidGenderPref = validOptions.some(opt => opt.value === preferences.gender_pref);

      if (!isValidGenderPref) {
        // Reset to 'random' if current preference is no longer valid
        setPreferences({ ...preferences, gender_pref: 'random' });
      }
    }
  }, [groupMembers, isGroupMode]);

  // Solo mode: Validate and set single player
  const validateQRCodeSolo = async (qrCodeValue: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/players/validate-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_uuid: qrCodeValue }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Invalid QR code');
        return;
      }

      // Check if player already has an active session and is in queue
      if (data.player.active_session) {
        const isInQueue = queueEntries.some(
          entry => entry.player_id === data.player.id && entry.status === 'waiting'
        );

        if (isInQueue) {
          alert(`${data.player.name} already has an active session and is in the queue! Cannot check in again.`);
          setQrCode('');
          return;
        }
      }

      setPlayer(data.player);
      setQrCode(qrCodeValue);

      // Load previous preferences if they exist
      if (data.player.preferences?.length > 0) {
        const prefs = data.player.preferences[0];

        // Validate gender_pref against player's gender
        const validOptions = getGenderPreferenceOptions(data.player.gender);
        const isValidGenderPref = validOptions.some(opt => opt.value === prefs.gender_pref);

        setPreferences({
          skill_level_pref: prefs.skill_level_pref,
          gender_pref: isValidGenderPref ? prefs.gender_pref : 'random', // Reset to 'random' if invalid
          match_type: prefs.match_type,
        });
      }
    } catch (error) {
      alert('Failed to validate QR code: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Group mode: Add player to group
  const addPlayerToGroup = async (qrCodeValue: string) => {
    // Check if already in group
    if (groupMembers.some(m => m.qr_uuid === qrCodeValue)) {
      alert('This player is already in the group!');
      setCurrentScanQr('');
      return;
    }

    // Max 4 players in a group
    if (groupMembers.length >= 4) {
      alert('Maximum 4 players per group!');
      setCurrentScanQr('');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/players/validate-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_uuid: qrCodeValue }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Invalid QR code');
        return;
      }

      // Check if player already has an active session and is in queue
      if (data.player.active_session) {
        const isInQueue = queueEntries.some(
          entry => entry.player_id === data.player.id && entry.status === 'waiting'
        );

        if (isInQueue) {
          alert(`${data.player.name} already has an active session and is in the queue! Cannot add to group.`);
          setCurrentScanQr('');
          return;
        }
      }

      setGroupMembers([...groupMembers, { ...data.player, qr_uuid_used: qrCodeValue }]);
      setCurrentScanQr('');
    } catch (error) {
      alert('Failed to validate QR code: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const removePlayerFromGroup = (playerId: string) => {
    setGroupMembers(groupMembers.filter(m => m.id !== playerId));
  };

  const handleCameraScan = (qrCodeValue: string) => {
    if (isGroupMode) {
      addPlayerToGroup(qrCodeValue);
    } else {
      validateQRCodeSolo(qrCodeValue);
    }
  };

  const handleManualScan = async () => {
    const scanValue = isGroupMode ? currentScanQr : qrCode;
    if (!scanValue.trim()) return;

    if (isGroupMode) {
      addPlayerToGroup(scanValue);
    } else {
      validateQRCodeSolo(scanValue);
    }
  };

  // Solo mode: Start session for one player
  const handleStartSession = async () => {
    if (!player) return;

    setLoading(true);
    try {
      // Smart building assignment (only to active buildings)
      const assignment = assignBuildingForPlayers([player], false, queueEntries, courts, buildings);
      setAssignedBuilding(assignment);

      // Start 5-hour session (or rejoin existing session)
      const sessionResponse = await fetch('/api/sessions/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_id: player.id,
          building: assignment.building,
        }),
      });

      if (!sessionResponse.ok) {
        const error = await sessionResponse.json();
        alert(error.error || 'Failed to start session');
        return;
      }

      const sessionData = await sessionResponse.json();
      const rejoining = sessionData.rejoining || false;
      const timeRemainingFormatted = sessionData.time_remaining?.formatted || '';

      setIsRejoining(rejoining);
      setTimeRemaining(timeRemainingFormatted);

      // Save/update preferences
      const { error: prefsError } = await (await import('@/lib/supabase/client')).supabase
        .from('player_preferences')
        .upsert({
          player_id: player.id,
          ...preferences,
        });

      if (prefsError) throw prefsError;

      // Add to queue (no group_id for solo)
      await addToQueue({
        player_id: player.id,
        building: assignment.building,
      });

      if (rejoining) {
        setSuccessMessage(`Welcome back, ${player.name}!`);
      } else {
        setSuccessMessage(`${player.name} checked in!`);
      }
      setSessionStarted(true);

      // Reset after 3 seconds
      setTimeout(() => {
        setQrCode('');
        setPlayer(null);
        setSessionStarted(false);
        setSuccessMessage('');
        setAssignedBuilding(null);
        setIsRejoining(false);
        setTimeRemaining('');
        setPreferences({
          skill_level_pref: 'beginner',
          gender_pref: 'random',
          match_type: 'solo',
        });
      }, 3000);
    } catch (error) {
      alert('Failed to start session: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Group mode: Start sessions for all group members
  const handleStartGroupSession = async () => {
    if (groupMembers.length < 2) {
      alert('Need at least 2 players for a group!');
      return;
    }

    setLoading(true);
    try {
      // Smart building assignment for the group (only to active buildings)
      const assignment = assignBuildingForPlayers(groupMembers, true, queueEntries, courts, buildings);
      setAssignedBuilding(assignment);

      // Generate shared group_id
      const groupId = crypto.randomUUID();

      let anyRejoining = false;
      let minTimeRemaining = '';

      // Start sessions and add to queue for each member
      for (const member of groupMembers) {
        // Start 5-hour session (or rejoin existing session)
        const sessionResponse = await fetch('/api/sessions/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            player_id: member.id,
            building: assignment.building,
          }),
        });

        if (!sessionResponse.ok) {
          const error = await sessionResponse.json();
          throw new Error(`Failed to start session for ${member.name}: ${error.error}`);
        }

        const sessionData = await sessionResponse.json();
        if (sessionData.rejoining) {
          anyRejoining = true;
          if (!minTimeRemaining || sessionData.time_remaining.ms < parseInt(minTimeRemaining)) {
            minTimeRemaining = sessionData.time_remaining.formatted;
          }
        }

        // Save/update preferences (mark as group)
        const { error: prefsError } = await (await import('@/lib/supabase/client')).supabase
          .from('player_preferences')
          .upsert({
            player_id: member.id,
            ...preferences,
            match_type: 'group', // Force group mode
          });

        if (prefsError) throw prefsError;

        // Add to queue with shared group_id
        await addToQueue({
          player_id: member.id,
          building: assignment.building,
          group_id: groupId,
        });
      }

      setIsRejoining(anyRejoining);
      setTimeRemaining(minTimeRemaining);

      if (anyRejoining) {
        setSuccessMessage(`Welcome back, group of ${groupMembers.length}!`);
      } else {
        setSuccessMessage(`Group of ${groupMembers.length} checked in!`);
      }
      setSessionStarted(true);

      // Reset after 3 seconds
      setTimeout(() => {
        setGroupMembers([]);
        setCurrentScanQr('');
        setSessionStarted(false);
        setSuccessMessage('');
        setAssignedBuilding(null);
        setIsRejoining(false);
        setTimeRemaining('');
        setPreferences({
          skill_level_pref: 'beginner',
          gender_pref: 'random',
          match_type: 'solo',
        });
      }, 3000);
    } catch (error) {
      alert('Failed to start group session: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (sessionStarted && assignedBuilding) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardBody>
            <div className="text-center space-y-4">
              <div className="text-green-600 text-6xl">✓</div>
              <h2 className="text-2xl font-bold text-green-600">Check-In Complete!</h2>
              <p className="text-lg font-semibold">{successMessage}</p>
              {isRejoining && timeRemaining ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-blue-900 font-semibold">Time Remaining: {timeRemaining}</p>
                  <p className="text-sm text-blue-700 mt-1">Your session is still active</p>
                </div>
              ) : (
                <p className="text-gray-600">5-hour session{isGroupMode ? 's' : ''} started</p>
              )}

              {/* Building Assignment Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  <p className="font-bold text-blue-900">
                    Assigned to {assignedBuilding.building.replace('_', ' ').toUpperCase()}
                  </p>
                </div>
                <p className="text-sm text-blue-700">{assignedBuilding.reason}</p>
              </div>

              {isGroupMode && groupMembers.length > 0 && (
                <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-sm font-medium text-purple-900">Friend Group Priority Enabled! 🎾</p>
                  <p className="text-xs text-purple-700 mt-1">These players will be matched together</p>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Mode Selection */}
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Check-In Mode</h2>
                <p className="text-sm text-gray-600">Select how players want to queue</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={!isGroupMode ? 'primary' : 'secondary'}
                  onClick={() => {
                    setIsGroupMode(false);
                    setGroupMembers([]);
                    setCurrentScanQr('');
                  }}
                >
                  <Scan className="w-4 h-4 mr-2" />
                  Solo
                </Button>
                <Button
                  variant={isGroupMode ? 'primary' : 'secondary'}
                  onClick={() => {
                    setIsGroupMode(true);
                    setPlayer(null);
                    setQrCode('');
                  }}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Group (2-4 players)
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Scanning Interface */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              {isGroupMode ? <Users className="w-8 h-8 text-blue-600" /> : <Scan className="w-8 h-8 text-blue-600" />}
              <div>
                <h1 className="text-2xl font-bold">
                  {isGroupMode ? 'Group Check-In' : 'Solo Check-In'}
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  {isGroupMode
                    ? `Scan ${groupMembers.length}/4 players • Friends will be matched together!`
                    : 'Scan player QR code'}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-6">
              {/* Camera Scanner */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Scan className="w-4 h-4" />
                  Scan QR Code with Camera
                </label>
                <QRScanner onScan={handleCameraScan} />
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">OR</span>
                </div>
              </div>

              {/* Manual Entry */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Keyboard className="w-4 h-4" />
                  Enter QR UUID Manually
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Paste QR UUID here (e.g., from seed script)"
                    value={isGroupMode ? currentScanQr : qrCode}
                    onChange={(e) => isGroupMode ? setCurrentScanQr(e.target.value) : setQrCode(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleManualScan()}
                  />
                  <Button onClick={handleManualScan} disabled={loading}>
                    {loading ? 'Validating...' : isGroupMode ? 'Add' : 'Scan'}
                  </Button>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Group Members List (Group Mode Only) */}
        {isGroupMode && groupMembers.length > 0 && (
          <Card>
            <CardHeader>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Users className="w-6 h-6" />
                Group Members ({groupMembers.length}/4)
              </h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                {groupMembers.map((member, index) => (
                  <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">
                        {index + 1}
                      </div>
                      {member.photo_url && (
                        <img
                          src={member.photo_url}
                          alt={member.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      )}
                      <div>
                        <p className="font-semibold">{member.name}</p>
                        <p className="text-sm text-gray-600">
                          {getSkillLevelLabel(member.skill_level)} • {member.gender}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => removePlayerFromGroup(member.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {groupMembers.length < 4 && (
                  <div className="p-3 border-2 border-dashed border-gray-300 rounded-lg text-center text-gray-500">
                    <UserPlus className="w-6 h-6 mx-auto mb-2" />
                    <p className="text-sm">Scan {4 - groupMembers.length} more player{4 - groupMembers.length > 1 ? 's' : ''} (optional)</p>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        )}

        {/* Solo Mode: Player Info & Preferences */}
        {!isGroupMode && player && (
          <Card>
            <CardHeader>
              <h2 className="text-xl font-bold">Player Information</h2>
            </CardHeader>
            <CardBody className="space-y-6">
              <div className="flex items-center gap-4">
                {player.photo_url && (
                  <img
                    src={player.photo_url}
                    alt={player.name}
                    className="w-20 h-20 rounded-full object-cover"
                  />
                )}
                <div>
                  <p className="text-2xl font-bold">{player.name}</p>
                  <p className="text-gray-600">
                    {getSkillLevelLabel(player.skill_level)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Skill Preference"
                  value={preferences.skill_level_pref}
                  onChange={(e) => setPreferences({ ...preferences, skill_level_pref: e.target.value as any })}
                  options={[
                    { value: 'beginner', label: 'Beginner/Novice' },
                    { value: 'intermediate_advanced', label: 'Intermediate/Advanced' },
                  ]}
                />

                <Select
                  label="Gender Preference"
                  value={preferences.gender_pref}
                  onChange={(e) => setPreferences({ ...preferences, gender_pref: e.target.value as any })}
                  options={getGenderPreferenceOptions(player.gender)}
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Smart Building Assignment</p>
                    <p className="text-xs text-blue-700 mt-1">
                      We'll automatically assign you to the best building based on queue status and skill matching
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleStartSession}
                disabled={loading}
                className="w-full"
                size="lg"
              >
                <Clock className="w-5 h-5 mr-2" />
                {loading ? 'Starting...' : 'Start 5-Hour Session & Add to Queue'}
              </Button>
            </CardBody>
          </Card>
        )}

        {/* Group Mode: Preferences & Start Button */}
        {isGroupMode && groupMembers.length >= 2 && (
          <Card>
            <CardHeader>
              <h2 className="text-xl font-bold">Group Preferences</h2>
              <p className="text-sm text-gray-600 mt-1">These preferences will apply to all group members</p>
            </CardHeader>
            <CardBody className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Skill Preference"
                  value={preferences.skill_level_pref}
                  onChange={(e) => setPreferences({ ...preferences, skill_level_pref: e.target.value as any })}
                  options={[
                    { value: 'beginner', label: 'Beginner/Novice' },
                    { value: 'intermediate_advanced', label: 'Intermediate/Advanced' },
                  ]}
                />

                <Select
                  label="Gender Preference"
                  value={preferences.gender_pref}
                  onChange={(e) => setPreferences({ ...preferences, gender_pref: e.target.value as any })}
                  options={getGroupGenderPreferenceOptions(groupMembers)}
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Smart Building Assignment</p>
                    <p className="text-xs text-blue-700 mt-1">
                      Your group will be automatically assigned to the best building for quick matching
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-purple-900">Friend Group Priority Enabled</p>
                    <p className="text-sm text-purple-700 mt-1">
                      These {groupMembers.length} players will receive highest priority to be matched together when courts become available.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleStartGroupSession}
                disabled={loading}
                className="w-full"
                size="lg"
              >
                <Users className="w-5 h-5 mr-2" />
                {loading ? 'Starting...' : `Start Sessions for ${groupMembers.length} Players`}
              </Button>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
