"use client";

import React, { useEffect, useState } from 'react';
import { Trophy, Medal, Award, ArrowLeft } from 'lucide-react';
import { LeaderboardEntry } from '@/types/stats';
import { ImageWithFallback } from '@/components/ui/ImageWithFallback';

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/leaderboard/top-players');
      if (!response.ok) throw new Error('Failed to fetch leaderboard');

      const data = await response.json();
      setLeaderboard(data.leaderboard || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-6 h-6 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-300" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-amber-600" />;
    return <Award className="w-5 h-5 text-blue-400" />;
  };

  const getRankBg = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-yellow-400/40';
    if (rank === 2) return 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border-gray-300/40';
    if (rank === 3) return 'bg-gradient-to-r from-amber-600/20 to-amber-700/20 border-amber-500/40';
    return 'bg-white/5 border-white/10';
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-4 overflow-hidden">
      <div className="max-w-6xl mx-auto h-full flex flex-col">
        {/* Header with Back Arrow */}
        <div className="flex items-center justify-between mb-6">
          <a
            href="/display"
            className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            title="Back to Display"
          >
            <ArrowLeft className="w-6 h-6" />
          </a>
          
          <div className="text-center flex-1">
            <div className="flex items-center justify-center gap-3 mb-3">
              <Trophy className="w-10 h-10 text-yellow-400" />
              <h1 className="text-4xl font-bold">Leaderboard</h1>
            </div>
            <p className="text-base text-white/70">Top 10 Players by Lifetime Wins</p>
          </div>
          
          <div className="w-12"></div> {/* Spacer for centering */}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="text-2xl text-white/60">Loading leaderboard...</div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-500/20 border border-red-400/40 rounded-lg p-6 text-center">
            <p className="text-red-200">Error: {error}</p>
            <button
              onClick={fetchLeaderboard}
              className="mt-4 px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* Leaderboard */}
        {!loading && !error && (
          <div className="flex-1 flex items-center">
            {leaderboard.length === 0 ? (
              <div className="text-center py-12 w-full">
                <p className="text-2xl text-white/50">No players on the leaderboard yet</p>
                <p className="text-white/40 mt-2">Play some games to get on the board!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6 w-full">
                {/* Left Column - Ranks 1-5 */}
                <div className="space-y-2">
                  {leaderboard.slice(0, 5).map((entry) => (
                    <div
                      key={entry.player_id}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all hover:scale-[1.02] ${getRankBg(
                        entry.rank
                      )} ${entry.rank <= 3 ? 'shadow-2xl' : 'shadow-lg'} h-[85px]`}
                    >
                      {/* Rank Icon */}
                      <div className="shrink-0 w-10 text-center">
                        {getRankIcon(entry.rank)}
                        <div className="text-sm font-bold mt-1">#{entry.rank}</div>
                      </div>

                      {/* Player Photo */}
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-white/10 shrink-0 border-2 border-white/20">
                        <ImageWithFallback
                          src={entry.photo_url}
                          alt={entry.player_name}
                          name={entry.player_name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Player Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold truncate">{entry.player_name}</h3>
                        <div className="text-white/60 text-xs mt-1">
                          {entry.lifetime_games_played} games played
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="text-right shrink-0">
                        <div className="text-2xl font-bold text-yellow-400">{entry.lifetime_wins}</div>
                        <div className="text-xs text-white/70">wins</div>
                        {entry.lifetime_games_played > 0 && (
                          <div className="text-xs text-white/50">
                            {Math.round((entry.lifetime_wins / entry.lifetime_games_played) * 100)}%
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Right Column - Ranks 6-10 */}
                <div className="space-y-2">
                  {leaderboard.slice(5, 10).map((entry) => (
                    <div
                      key={entry.player_id}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all hover:scale-[1.02] ${getRankBg(
                        entry.rank
                      )} shadow-lg h-[85px]`}
                    >
                      {/* Rank Icon */}
                      <div className="shrink-0 w-10 text-center">
                        {getRankIcon(entry.rank)}
                        <div className="text-sm font-bold mt-1">#{entry.rank}</div>
                      </div>

                      {/* Player Photo */}
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-white/10 shrink-0 border-2 border-white/20">
                        <ImageWithFallback
                          src={entry.photo_url}
                          alt={entry.player_name}
                          name={entry.player_name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Player Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold truncate">{entry.player_name}</h3>
                        <div className="text-white/60 text-xs mt-1">
                          {entry.lifetime_games_played} games played
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="text-right shrink-0">
                        <div className="text-2xl font-bold text-yellow-400">{entry.lifetime_wins}</div>
                        <div className="text-xs text-white/70">wins</div>
                        {entry.lifetime_games_played > 0 && (
                          <div className="text-xs text-white/50">
                            {Math.round((entry.lifetime_wins / entry.lifetime_games_played) * 100)}%
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
