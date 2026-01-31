"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { QRScanner } from '@/components/QRScanner';
import { ReceiptCapture } from '@/components/ReceiptCapture';
import { useStore } from '@/store';
import { Player, PlayerPreferences } from '@/types';
import { Scan, Users, Clock, Keyboard, UserPlus, X, Check, Receipt, Plus } from 'lucide-react';
import { getSkillLevelLabel } from '@/lib/utils/skillLevel';
import { ImageWithFallback } from '@/components/ui/ImageWithFallback';

interface GroupMember extends Player {
  qr_uuid_used: string;
}

export default function CashierPage() {
  // Mode selection
  const [mode, setMode] = useState<'solo' | 'group' | 'extend'>('solo');

  // Extend mode state
  const [extendPlayer, setExtendPlayer] = useState<Player | null>(null);
  const [extendQrCode, setExtendQrCode] = useState('');
  const [extendFoundViaSearch, setExtendFoundViaSearch] = useState(false);
  const [currentTimeRemaining, setCurrentTimeRemaining] = useState<string>('');
  const [extendLoading, setExtendLoading] = useState(false);
  const [extendSuccess, setExtendSuccess] = useState(false);
  const [extendReceiptImage, setExtendReceiptImage] = useState<string | null>(null);
  const [extendReceiptType, setExtendReceiptType] = useState<'physical' | 'gcash' | 'other'>('physical');
  const [extendUploadingReceipt, setExtendUploadingReceipt] = useState(false);

  // Solo mode state
  const [qrCode, setQrCode] = useState('');
  const [player, setPlayer] = useState<Player | null>(null);
  const [foundViaSearch, setFoundViaSearch] = useState(false); // Track if found by name search

  // Group mode state
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [groupName, setGroupName] = useState('');
  const [currentScanQr, setCurrentScanQr] = useState('');

  // Name search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Player[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Shared state
  const [preferences] = useState<Partial<PlayerPreferences>>({
    skill_level_pref: 'beginner', // Default value, not used by algorithm
    gender_pref: 'random', // Default value, not used by algorithm
    match_type: 'solo',
  });
  const [displayPhoto, setDisplayPhoto] = useState(true); // Photo display preference
  const [loading, setLoading] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isRejoining, setIsRejoining] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  // Receipt capture state
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [receiptType, setReceiptType] = useState<'physical' | 'gcash' | 'other'>('physical');
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  const addToQueue = useStore((state) => state.addToQueue);

  // Extend mode: Validate player for session extension
  const validateQRCodeExtend = async (qrCodeValue: string) => {
    setExtendLoading(true);
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

      // Check if player has an active session
      if (!data.player.active_session) {
        alert(`${data.player.name} does not have an active session! Cannot extend time.`);
        setExtendQrCode('');
        return;
      }

      // Get current session details
      const sessionResponse = await fetch('/api/sessions/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: data.player.id }),
      });

      const sessionData = await sessionResponse.json();
      
      if (sessionData.unlimited_time) {
        alert(`${data.player.name} has unlimited time and cannot purchase additional hours.`);
        setExtendQrCode('');
        return;
      }

      setExtendPlayer(data.player);
      setExtendQrCode(qrCodeValue);
      setCurrentTimeRemaining(sessionData.time_remaining?.formatted || 'Unknown');

    } catch (error) {
      alert('Failed to validate QR code: ' + (error as Error).message);
    } finally {
      setExtendLoading(false);
    }
  };

  // Extend mode: Handle session extension
  const handleExtendSession = async () => {
    if (!extendPlayer) return;

    // Require receipt capture before extending session
    if (!extendReceiptImage) {
      alert('Please capture a receipt photo before extending the session.');
      return;
    }

    setExtendLoading(true);
    try {
      // Extend session by 5 hours
      const extendResponse = await fetch('/api/sessions/extend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_id: extendPlayer.id,
          additional_hours: 5,
        }),
      });

      if (!extendResponse.ok) {
        const error = await extendResponse.json();
        alert(error.error || 'Failed to extend session');
        return;
      }

      const extendData = await extendResponse.json();

      // Upload receipt with session extension info
      if (extendReceiptImage) {
        setExtendUploadingReceipt(true);
        try {
          const receiptBlob = await fetch(extendReceiptImage).then(r => r.blob());
          const formData = new FormData();
          formData.append('receipt', receiptBlob, `receipt-${Date.now()}.jpg`);
          formData.append('sessionId', extendData.session.id);
          formData.append('playerId', extendPlayer.id);
          formData.append('receiptType', extendReceiptType);
          formData.append('extension', 'true');

          const receiptResponse = await fetch('/api/receipts/upload', {
            method: 'POST',
            body: formData,
          });

          if (!receiptResponse.ok) {
            console.error('Failed to upload receipt:', await receiptResponse.json());
          }
        } catch (receiptError) {
          console.error('Receipt upload error:', receiptError);
        } finally {
          setExtendUploadingReceipt(false);
        }
      }

      setExtendSuccess(true);

      // Reset after 3 seconds
      setTimeout(() => {
        setExtendQrCode('');
        setExtendPlayer(null);
        setExtendSuccess(false);
        setCurrentTimeRemaining('');
        setExtendReceiptImage(null);
        setExtendReceiptType('physical');
      }, 3000);
    } catch (error) {
      alert('Failed to extend session: ' + (error as Error).message);
    } finally {
      setExtendLoading(false);
    }
  };

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
        // Fetch current queue to check if player is already in it
        const queueResponse = await fetch('/api/queue');
        const queueData = await queueResponse.json();
        const isInQueue = queueData.some(
          (entry: any) => entry.player_id === data.player.id && entry.status === 'waiting'
        );

        if (isInQueue) {
          alert(`${data.player.name} already has an active session and is in the queue! Cannot check in again.`);
          setQrCode('');
          return;
        }
      }

      setPlayer(data.player);
      setQrCode(qrCodeValue);

      // Note: Preferences are no longer used by the matchmaking algorithm
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
        // Fetch current queue to check if player is already in it
        const queueResponse = await fetch('/api/queue');
        const queueData = await queueResponse.json();
        const isInQueue = queueData.some(
          (entry: any) => entry.player_id === data.player.id && entry.status === 'waiting'
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
    if (mode === 'group') {
      addPlayerToGroup(qrCodeValue);
    } else if (mode === 'extend') {
      setExtendFoundViaSearch(false);
      validateQRCodeExtend(qrCodeValue);
    } else {
      setFoundViaSearch(false); // Normal QR scan, not name search
      validateQRCodeSolo(qrCodeValue);
    }
  };

  const handleManualScan = async () => {
    const scanValue = mode === 'group' ? currentScanQr : 
                     mode === 'extend' ? extendQrCode : qrCode;
    if (!scanValue.trim()) return;

    if (mode === 'group') {
      addPlayerToGroup(scanValue);
    } else if (mode === 'extend') {
      setExtendFoundViaSearch(false);
      validateQRCodeExtend(scanValue);
    } else {
      setFoundViaSearch(false); // Normal QR scan, not name search
      validateQRCodeSolo(scanValue);
    }
  };

  // Name search functions
  const handleNameSearch = async (query: string) => {
    setSearchQuery(query);

    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await fetch(`/api/players/search?name=${encodeURIComponent(query)}`);
      const data = await response.json();

      if (response.ok) {
        setSearchResults(data);
      } else {
        console.error('Search error:', data.error);
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Failed to search:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const selectPlayerFromSearch = async (selectedPlayer: Player) => {
    if (mode === 'group') {
      // Add to group
      await addPlayerToGroup(selectedPlayer.qr_uuid);
    } else if (mode === 'extend') {
      // Set as extend player - mark as found via search
      setExtendFoundViaSearch(true);
      await validateQRCodeExtend(selectedPlayer.qr_uuid);
    } else {
      // Set as solo player - mark as found via search
      setFoundViaSearch(true);
      await validateQRCodeSolo(selectedPlayer.qr_uuid);
    }

    // Clear search
    setSearchQuery('');
    setSearchResults([]);
  };

  // Solo mode: Start session for one player
  const handleStartSession = async () => {
    if (!player) return;

    // Require receipt capture before starting session
    if (!receiptImage) {
      alert('Please capture a receipt photo before starting the session.');
      return;
    }

    setLoading(true);
    try {
      // Start 5-hour session (or rejoin existing session) with preferences
      const sessionResponse = await fetch('/api/sessions/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_id: player.id,
          preferences,
          display_photo: displayPhoto,
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
      const sessionId = sessionData.session?.id;

      setIsRejoining(rejoining);
      setTimeRemaining(timeRemainingFormatted);

      // Upload receipt with session ID
      if (receiptImage && sessionId) {
        setUploadingReceipt(true);
        try {
          const receiptBlob = await fetch(receiptImage).then(r => r.blob());
          const formData = new FormData();
          formData.append('receipt', receiptBlob, `receipt-${Date.now()}.jpg`);
          formData.append('sessionId', sessionId);
          formData.append('playerId', player.id);
          formData.append('receiptType', receiptType);

          const receiptResponse = await fetch('/api/receipts/upload', {
            method: 'POST',
            body: formData,
          });

          if (!receiptResponse.ok) {
            console.error('Failed to upload receipt:', await receiptResponse.json());
            // Don't block check-in if receipt upload fails, but log it
          }
        } catch (receiptError) {
          console.error('Receipt upload error:', receiptError);
        } finally {
          setUploadingReceipt(false);
        }
      }

      // Add to queue (no group_id for solo)
      await addToQueue({
        player_id: player.id,
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
        setIsRejoining(false);
        setTimeRemaining('');
        setReceiptImage(null);
        setReceiptType('physical');
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

    // Require receipt capture before starting group session
    if (!receiptImage) {
      alert('Please capture a receipt photo before starting the session.');
      return;
    }

    setLoading(true);
    try {
      // Create the group in the database first (for foreign key constraint)
      const groupResponse = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: groupName.trim() || `Group ${new Date().toLocaleTimeString()}`,
          member_ids: groupMembers.map(m => m.id),
        }),
      });

      if (!groupResponse.ok) {
        const error = await groupResponse.json();
        throw new Error(error.error || 'Failed to create group');
      }

      const groupData = await groupResponse.json();
      const groupId = groupData.id;

      let anyRejoining = false;
      let minTimeRemaining = '';

      // Start sessions and add to queue for each member
      for (const member of groupMembers) {
        // Start 5-hour session (or rejoin existing session) with group preferences
        const sessionResponse = await fetch('/api/sessions/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            player_id: member.id,
            preferences: {
              ...preferences,
              match_type: 'group', // Force group mode
            },
            display_photo: displayPhoto,
          }),
        });

        if (!sessionResponse.ok) {
          const error = await sessionResponse.json();
          throw new Error(`Failed to start session for ${member.name}: ${error.error}`);
        }

        const sessionData = await sessionResponse.json();
        if (sessionData.rejoining) {
          anyRejoining = true;
          // Handle unlimited time players (time_remaining is null)
          if (sessionData.time_remaining) {
            if (!minTimeRemaining || sessionData.time_remaining.ms < parseInt(minTimeRemaining)) {
              minTimeRemaining = sessionData.time_remaining.formatted;
            }
          } else {
            // Unlimited time player
            minTimeRemaining = 'Unlimited';
          }
        }

        // Add to queue with shared group_id
        await addToQueue({
          player_id: member.id,
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
        setGroupName('');
        setCurrentScanQr('');
        setSessionStarted(false);
        setSuccessMessage('');
        setIsRejoining(false);
        setTimeRemaining('');
        setReceiptImage(null);
        setReceiptType('physical');
      }, 3000);
    } catch (error) {
      alert('Failed to start group session: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (extendSuccess) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardBody>
            <div className="text-center space-y-4">
              <div className="text-green-600 text-6xl">✓</div>
              <h2 className="text-2xl font-bold text-green-600">Session Extended!</h2>
              <p className="text-lg font-semibold">{extendPlayer?.name} now has 5 more hours!</p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-blue-900 font-semibold">Previous time: {currentTimeRemaining}</p>
                <p className="text-sm text-blue-700 mt-1">+5 hours added successfully</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (sessionStarted) {
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
                <p className="text-gray-600">5-hour session{mode === 'group' ? 's' : ''} started</p>
              )}

              {isRejoining && (
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
                  variant={mode === 'solo' ? 'primary' : 'secondary'}
                  onClick={() => {
                    setMode('solo');
                    setGroupMembers([]);
                    setGroupName('');
                    setCurrentScanQr('');
                    setExtendPlayer(null);
                    setExtendQrCode('');
                  }}
                >
                  <Scan className="w-4 h-4 mr-2" />
                  Solo
                </Button>
                <Button
                  variant={mode === 'group' ? 'primary' : 'secondary'}
                  onClick={() => {
                    setMode('group');
                    setPlayer(null);
                    setQrCode('');
                    setExtendPlayer(null);
                    setExtendQrCode('');
                  }}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Group (2-4 players)
                </Button>
                <Button
                  variant={mode === 'extend' ? 'primary' : 'secondary'}
                  onClick={() => {
                    setMode('extend');
                    setPlayer(null);
                    setQrCode('');
                    setGroupMembers([]);
                    setGroupName('');
                    setCurrentScanQr('');
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Extend Time
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Scanning Interface */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              {mode === 'group' ? <Users className="w-8 h-8 text-blue-600" /> : 
               mode === 'extend' ? <Plus className="w-8 h-8 text-blue-600" /> : 
               <Scan className="w-8 h-8 text-blue-600" />}
              <div>
                <h1 className="text-2xl font-bold">
                  {mode === 'group' ? 'Group Check-In' : 
                   mode === 'extend' ? 'Extend Session Time' : 
                   'Solo Check-In'}
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  {mode === 'group'
                    ? `Scan ${groupMembers.length}/4 players • Friends will be matched together!`
                    : mode === 'extend'
                    ? 'Scan player QR code to extend session by 5 hours'
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
                    value={mode === 'group' ? currentScanQr : 
                           mode === 'extend' ? extendQrCode : qrCode}
                    onChange={(e) => {
                      if (mode === 'group') {
                        setCurrentScanQr(e.target.value);
                      } else if (mode === 'extend') {
                        setExtendQrCode(e.target.value);
                      } else {
                        setQrCode(e.target.value);
                      }
                    }}
                    onKeyPress={(e) => e.key === 'Enter' && handleManualScan()}
                  />
                  <Button onClick={handleManualScan} disabled={loading || extendLoading}>
                    {loading || extendLoading ? 'Validating...' : 
                     mode === 'group' ? 'Add' : 
                     mode === 'extend' ? 'Extend' : 
                     'Scan'}
                  </Button>
                </div>
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

              {/* Name Search */}
              <div className="space-y-2 relative">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Search by Name (if QR code forgotten)
                </label>
                <Input
                  placeholder="Type player name..."
                  value={searchQuery}
                  onChange={(e) => handleNameSearch(e.target.value)}
                />

                {/* Search Results Dropdown */}
                {searchQuery.length >= 2 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                    {searchLoading ? (
                      <div className="p-4 text-center text-gray-500">Searching...</div>
                    ) : searchResults.length > 0 ? (
                      <div className="divide-y">
                        {searchResults.map((result) => (
                          <button
                            key={result.id}
                            onClick={() => selectPlayerFromSearch(result)}
                            className="w-full p-3 hover:bg-gray-50 flex items-center gap-3 text-left transition-colors"
                          >
                            <ImageWithFallback
                              src={result.photo_url}
                              alt={result.name}
                              name={result.name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                            <div className="flex-1">
                              <p className="font-semibold">{result.name}</p>
                              <p className="text-sm text-gray-600">
                                {getSkillLevelLabel(result.skill_level)} • ID: #{result.id.slice(0, 8)}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-gray-500">No players found</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Extend Mode: Player Info & Extension */}
        {mode === 'extend' && extendPlayer && (
          <Card>
            <CardHeader>
              <h2 className="text-xl font-bold">Player Information</h2>
            </CardHeader>
            <CardBody className="space-y-6">
              <div className="flex items-center gap-4">
                <ImageWithFallback
                  src={extendPlayer.photo_url}
                  alt={extendPlayer.name}
                  name={extendPlayer.name}
                  className="w-20 h-20 rounded-full object-cover"
                />
                <div>
                  <p className="text-2xl font-bold">{extendPlayer.name}</p>
                  <p className="text-gray-600">
                    {getSkillLevelLabel(extendPlayer.skill_level)}
                  </p>
                </div>
              </div>

              {/* Current Time Remaining */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Current Session Time</h3>
                <p className="text-2xl font-bold text-blue-600">{currentTimeRemaining}</p>
                <p className="text-sm text-blue-700 mt-1">Time remaining in current session</p>
              </div>

              {/* QR Code Display - Only show if player was found via name search */}
              {extendFoundViaSearch && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-900 mb-3 text-center">Your QR Code</h3>
                  <div className="flex flex-col items-center gap-3">
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${extendQrCode}`}
                        alt="QR Code"
                        className="w-48 h-48"
                      />
                    </div>
                    <p className="text-sm text-green-800 text-center">
                      📸 Take a photo of this QR code for next time!
                    </p>
                  </div>
                </div>
              )}

              {/* Receipt Capture Section */}
              <div className="border-2 border-orange-200 bg-orange-50 rounded-lg p-4">
                <h3 className="font-semibold text-orange-900 mb-3 flex items-center gap-2">
                  <Receipt className="w-5 h-5" />
                  Payment Receipt (Required)
                </h3>

                {/* Receipt Type Selection */}
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Receipt Type</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setExtendReceiptType('physical')}
                      className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                        extendReceiptType === 'physical'
                          ? 'border-orange-500 bg-orange-100 text-orange-800'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      Physical Receipt
                    </button>
                    <button
                      type="button"
                      onClick={() => setExtendReceiptType('gcash')}
                      className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                        extendReceiptType === 'gcash'
                          ? 'border-orange-500 bg-orange-100 text-orange-800'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      GCash Screenshot
                    </button>
                  </div>
                </div>

                {/* Receipt Capture or Preview */}
                {extendReceiptImage ? (
                  <div className="space-y-3">
                    <div className="border-2 border-green-500 rounded-lg overflow-hidden">
                      <img src={extendReceiptImage} alt="Captured receipt" className="w-full max-h-64 object-contain bg-white" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-green-700 font-medium flex items-center gap-1">
                        <Check className="w-4 h-4" />
                        Receipt captured
                      </span>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setExtendReceiptImage(null)}
                      >
                        Retake
                      </Button>
                    </div>
                  </div>
                ) : (
                  <ReceiptCapture
                    onCapture={(imageDataUrl) => setExtendReceiptImage(imageDataUrl)}
                    onError={(error) => console.error('Receipt capture error:', error)}
                  />
                )}
              </div>

              {/* Extension Summary */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Plus className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-green-900">Session Extension Summary</p>
                    <p className="text-sm text-green-700 mt-1">
                      Add 5 more hours to {extendPlayer.name}'s current session
                    </p>
                    <p className="text-xs text-green-600 mt-2">
                      New total time: {currentTimeRemaining} + 5 hours
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleExtendSession}
                disabled={extendLoading || !extendReceiptImage}
                className="w-full"
                size="lg"
              >
                <Plus className="w-5 h-5 mr-2" />
                {extendLoading
                  ? (extendUploadingReceipt ? 'Uploading receipt...' : 'Extending...')
                  : !extendReceiptImage
                    ? 'Capture Receipt First'
                    : 'Extend Session by 5 Hours'}
              </Button>
            </CardBody>
          </Card>
        )}

        {/* Group Members List (Group Mode Only) */}
        {mode === 'group' && groupMembers.length > 0 && (
          <Card>
            <CardHeader>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Users className="w-6 h-6" />
                Group Members ({groupMembers.length}/4)
              </h2>
            </CardHeader>
            <CardBody>
              {/* Group Name Input */}
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Group Name (optional)
                </label>
                <Input
                  placeholder="Enter a name for this group..."
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  maxLength={50}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave blank for auto-generated name
                </p>
              </div>

              <div className="space-y-3">
                {groupMembers.map((member, index) => (
                  <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">
                        {index + 1}
                      </div>
                      <ImageWithFallback
                        src={member.photo_url}
                        alt={member.name}
                        name={member.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
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
        {mode === 'solo' && player && (
          <Card>
            <CardHeader>
              <h2 className="text-xl font-bold">Player Information</h2>
            </CardHeader>
            <CardBody className="space-y-6">
              <div className="flex items-center gap-4">
                <ImageWithFallback
                  src={player.photo_url}
                  alt={player.name}
                  name={player.name}
                  className="w-20 h-20 rounded-full object-cover"
                />
                <div>
                  <p className="text-2xl font-bold">{player.name}</p>
                  <p className="text-gray-600">
                    {getSkillLevelLabel(player.skill_level)}
                  </p>
                </div>
              </div>

              {/* QR Code Display - Only show if player was found via name search */}
              {foundViaSearch && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-900 mb-3 text-center">Your QR Code</h3>
                  <div className="flex flex-col items-center gap-3">
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrCode}`}
                        alt="QR Code"
                        className="w-48 h-48"
                      />
                    </div>
                    <p className="text-sm text-green-800 text-center">
                      📸 Take a photo of this QR code for next time!
                    </p>
                  </div>
                </div>
              )}

              {/* Receipt Capture Section */}
              <div className="border-2 border-orange-200 bg-orange-50 rounded-lg p-4">
                <h3 className="font-semibold text-orange-900 mb-3 flex items-center gap-2">
                  <Receipt className="w-5 h-5" />
                  Payment Receipt (Required)
                </h3>

                {/* Receipt Type Selection */}
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Receipt Type</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setReceiptType('physical')}
                      className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                        receiptType === 'physical'
                          ? 'border-orange-500 bg-orange-100 text-orange-800'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      Physical Receipt
                    </button>
                    <button
                      type="button"
                      onClick={() => setReceiptType('gcash')}
                      className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                        receiptType === 'gcash'
                          ? 'border-orange-500 bg-orange-100 text-orange-800'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      GCash Screenshot
                    </button>
                  </div>
                </div>

                {/* Receipt Capture or Preview */}
                {receiptImage ? (
                  <div className="space-y-3">
                    <div className="border-2 border-green-500 rounded-lg overflow-hidden">
                      <img src={receiptImage} alt="Captured receipt" className="w-full max-h-64 object-contain bg-white" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-green-700 font-medium flex items-center gap-1">
                        <Check className="w-4 h-4" />
                        Receipt captured
                      </span>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setReceiptImage(null)}
                      >
                        Retake
                      </Button>
                    </div>
                  </div>
                ) : (
                  <ReceiptCapture
                    onCapture={(imageDataUrl) => setReceiptImage(imageDataUrl)}
                    onError={(error) => console.error('Receipt capture error:', error)}
                  />
                )}
              </div>

              {/* Photo Display Preference */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-3">Display Preference</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="displayPhoto"
                      checked={displayPhoto}
                      onChange={() => setDisplayPhoto(true)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div className="flex items-center gap-2">
                      <ImageWithFallback
                        src={player.photo_url}
                        alt={player.name}
                        name={player.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <span>Show my photo on displays</span>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="displayPhoto"
                      checked={!displayPhoto}
                      onChange={() => setDisplayPhoto(false)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-sm font-bold text-gray-700">
                        {player.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </div>
                      <span>Show my initials instead</span>
                    </div>
                  </label>
                </div>
              </div>

              <Button
                onClick={handleStartSession}
                disabled={loading || !receiptImage}
                className="w-full"
                size="lg"
              >
                <Clock className="w-5 h-5 mr-2" />
                {loading
                  ? (uploadingReceipt ? 'Uploading receipt...' : 'Starting...')
                  : !receiptImage
                    ? 'Capture Receipt First'
                    : 'Start 5-Hour Session & Add to Queue'}
              </Button>
            </CardBody>
          </Card>
        )}

        {/* Group Mode: Start Button */}
        {mode === 'group' && groupMembers.length >= 2 && (
          <Card>
            <CardHeader>
              <h2 className="text-xl font-bold">Ready to Start Group Session</h2>
              <p className="text-sm text-gray-600 mt-1">All group members will be matched together</p>
            </CardHeader>
            <CardBody className="space-y-6">
              {/* Receipt Capture Section for Group */}
              <div className="border-2 border-orange-200 bg-orange-50 rounded-lg p-4">
                <h3 className="font-semibold text-orange-900 mb-3 flex items-center gap-2">
                  <Receipt className="w-5 h-5" />
                  Payment Receipt (Required)
                </h3>

                {/* Receipt Type Selection */}
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Receipt Type</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setReceiptType('physical')}
                      className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                        receiptType === 'physical'
                          ? 'border-orange-500 bg-orange-100 text-orange-800'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      Physical Receipt
                    </button>
                    <button
                      type="button"
                      onClick={() => setReceiptType('gcash')}
                      className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                        receiptType === 'gcash'
                          ? 'border-orange-500 bg-orange-100 text-orange-800'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      GCash Screenshot
                    </button>
                  </div>
                </div>

                {/* Receipt Capture or Preview */}
                {receiptImage ? (
                  <div className="space-y-3">
                    <div className="border-2 border-green-500 rounded-lg overflow-hidden">
                      <img src={receiptImage} alt="Captured receipt" className="w-full max-h-64 object-contain bg-white" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-green-700 font-medium flex items-center gap-1">
                        <Check className="w-4 h-4" />
                        Receipt captured
                      </span>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setReceiptImage(null)}
                      >
                        Retake
                      </Button>
                    </div>
                  </div>
                ) : (
                  <ReceiptCapture
                    onCapture={(imageDataUrl) => setReceiptImage(imageDataUrl)}
                    onError={(error) => console.error('Receipt capture error:', error)}
                  />
                )}
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

              {/* Photo Display Preference for Group */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-3">Display Preference (applies to all group members)</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="groupDisplayPhoto"
                      checked={displayPhoto}
                      onChange={() => setDisplayPhoto(true)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {groupMembers.slice(0, 3).map((member) => (
                          <ImageWithFallback
                            key={member.id}
                            src={member.photo_url}
                            alt={member.name}
                            name={member.name}
                            className="w-8 h-8 rounded-full object-cover border-2 border-white"
                          />
                        ))}
                        {groupMembers.length > 3 && (
                          <div className="w-8 h-8 bg-gray-300 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-gray-700">
                            +{groupMembers.length - 3}
                          </div>
                        )}
                      </div>
                      <span>Show photos on displays</span>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="groupDisplayPhoto"
                      checked={!displayPhoto}
                      onChange={() => setDisplayPhoto(false)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {groupMembers.slice(0, 3).map((member, idx) => (
                          <div
                            key={member.id}
                            className="w-8 h-8 bg-gray-300 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-gray-700"
                          >
                            {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </div>
                        ))}
                        {groupMembers.length > 3 && (
                          <div className="w-8 h-8 bg-gray-400 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white">
                            +{groupMembers.length - 3}
                          </div>
                        )}
                      </div>
                      <span>Show initials instead</span>
                    </div>
                  </label>
                </div>
              </div>

              <Button
                onClick={handleStartGroupSession}
                disabled={loading || !receiptImage}
                className="w-full"
                size="lg"
              >
                <Users className="w-5 h-5 mr-2" />
                {loading
                  ? 'Starting...'
                  : !receiptImage
                    ? 'Capture Receipt First'
                    : `Start Sessions for ${groupMembers.length} Players`}
              </Button>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
