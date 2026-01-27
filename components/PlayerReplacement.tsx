"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Search, User, X } from 'lucide-react';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { getSkillLevelLabel } from '@/lib/utils/skillLevel';
import { QueueEntryWithPlayer } from '@/types';

interface PlayerReplacementProps {
  isOpen: boolean;
  onClose: () => void;
  onReplace: (replacementPlayerId: string) => void;
  currentPlayerName: string;
  currentPlayerId: string;
  courtId: string;
  queueEntries?: any[]; // Add queue entries to filter out players already in queue
}

interface PlayerSearchResult {
  id: string;
  name: string;
  skill_level: string;
  photo_url?: string;
}

export function PlayerReplacement({
  isOpen,
  onClose,
  onReplace,
  currentPlayerName,
  currentPlayerId,
  courtId,
  queueEntries = []
}: PlayerReplacementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlayerSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerSearchResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedPlayer(null);
      setSearchLoading(false);
    }
  }, [isOpen]);

  // Search for players as user types
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const searchPlayers = async () => {
      setSearchLoading(true);
      try {
        const response = await fetch(`/api/players/search?name=${encodeURIComponent(searchQuery)}`);
        if (response.ok) {
          const data = await response.json();
          
          // Get IDs of players currently playing (not waiting in queue)
          const playersPlaying = new Set(
            queueEntries
              .filter(entry => entry.status === 'playing')
              .map(entry => entry.player_id)
          );
          
          // Filter out the current player being replaced AND players currently playing
          // But ALLOW players who are waiting in queue
          const filteredResults = data.filter((p: PlayerSearchResult) => 
            p.id !== currentPlayerId && !playersPlaying.has(p.id)
          );
          
          setSearchResults(filteredResults);
        }
      } catch (error) {
        console.error('Error searching players:', error);
      } finally {
        setSearchLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchPlayers, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, currentPlayerId]);

  const handleSelectPlayer = (player: PlayerSearchResult) => {
    setSelectedPlayer(player);
    setSearchQuery(player.name);
    setSearchResults([]);
  };

  const handleReplace = () => {
    if (selectedPlayer) {
      onReplace(selectedPlayer.id);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">Replace Player</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Current Player Info */}
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm font-semibold text-red-900 mb-2">Current Player:</p>
            <div className="flex items-center gap-3">
              <PlayerAvatar
                name={currentPlayerName}
                photo_url={null}
                size="sm"
                className="shrink-0"
              />
              <div>
                <p className="font-semibold text-red-800">{currentPlayerName}</p>
                <p className="text-xs text-red-600">This player will take a break</p>
              </div>
            </div>
          </div>

          {/* Search Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search for Replacement Player:
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Type player name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchLoading && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
          </div>

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="mb-4 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              <div className="divide-y">
                {searchResults.map((player) => (
                  <button
                    key={player.id}
                    onClick={() => handleSelectPlayer(player)}
                    className="w-full p-3 hover:bg-gray-50 flex items-center gap-3 text-left transition-colors"
                  >
                    <PlayerAvatar
                      name={player.name}
                      photo_url={player.photo_url || null}
                      size="sm"
                      className="shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{player.name}</p>
                      <p className="text-xs text-gray-600">
                        {getSkillLevelLabel(player.skill_level as any)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Selected Player */}
          {selectedPlayer && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-semibold text-green-900 mb-2">Selected Replacement:</p>
              <div className="flex items-center gap-3">
                <PlayerAvatar
                  name={selectedPlayer.name}
                  photo_url={selectedPlayer.photo_url || null}
                  size="sm"
                  className="shrink-0"
                />
                <div>
                  <p className="font-semibold text-green-800">{selectedPlayer.name}</p>
                  <p className="text-xs text-green-600">
                    {getSkillLevelLabel(selectedPlayer.skill_level as any)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleReplace}
              disabled={!selectedPlayer}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Replace Player
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
