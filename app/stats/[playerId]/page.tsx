"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { supabase } from '@/lib/supabase/client';
import { Player } from '@/types';
import { Trophy, Users, Clock, Target } from 'lucide-react';
import { skillLevelToPreferenceGroup } from '@/lib/utils/skillLevel';
import { ImageWithFallback } from '@/components/ui/ImageWithFallback';

interface PlayerStats {
  totalGames: number;
  totalWins: number;
  totalLosses: number;
  winRate: number;
  avgSessionDuration: number;
  opponents: { name: string; count: number }[];
  recentSessions: any[];
}

export default function PlayerStatsPage() {
  const params = useParams();
  const playerId = params.playerId as string;

  const [player, setPlayer] = useState<Player | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlayerStats();
  }, [playerId]);

  const loadPlayerStats = async () => {
    try {
      // Fetch player info
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .select('*')
        .eq('id', playerId)
        .single();

      if (playerError) throw playerError;
      setPlayer(playerData);

      // Fetch sessions
      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .eq('player_id', playerId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (sessionsError) throw sessionsError;

      // Calculate stats
      const totalGames = sessions?.length || 0;
      const avgDuration = sessions && sessions.length > 0
        ? sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / sessions.length
        : 0;

      let wins = 0;
      let losses = 0;

      sessions?.forEach(session => {
        if (session.team1_score !== null && session.team2_score !== null) {
          if (session.team1_score > session.team2_score) {
            wins++;
          } else {
            losses++;
          }
        }
      });

      // Fetch match history for opponents
      const { data: matchHistory } = await supabase
        .from('match_history')
        .select(`
          opponent_ids,
          players!opponent_ids(name)
        `)
        .eq('player_id', playerId);

      const opponentCounts: Record<string, number> = {};
      matchHistory?.forEach(match => {
        match.opponent_ids?.forEach((oppId: string) => {
          opponentCounts[oppId] = (opponentCounts[oppId] || 0) + 1;
        });
      });

      // Get opponent names
      const opponentIds = Object.keys(opponentCounts);
      const { data: opponents } = await supabase
        .from('players')
        .select('id, name')
        .in('id', opponentIds);

      const opponentsList = opponents?.map(opp => ({
        name: opp.name,
        count: opponentCounts[opp.id],
      })) || [];

      setStats({
        totalGames,
        totalWins: wins,
        totalLosses: losses,
        winRate: totalGames > 0 ? (wins / totalGames) * 100 : 0,
        avgSessionDuration: avgDuration,
        opponents: opponentsList.sort((a, b) => b.count - a.count),
        recentSessions: sessions?.slice(0, 10) || [],
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      alert('Failed to load player stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-2xl">Loading...</div>
      </div>
    );
  }

  if (!player || !stats) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-2xl">Player not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Player Header */}
        <Card>
          <CardBody>
            <div className="flex items-center gap-6">
              <ImageWithFallback
                src={player.photo_url}
                alt={player.name}
                name={player.name}
                className="w-24 h-24 rounded-full object-cover"
              />
              <div>
                <h1 className="text-4xl font-bold">{player.name}</h1>
                <p className="text-xl text-gray-600">
                  {skillLevelToPreferenceGroup(player.skill_level) === 'beginner' ? 'Beginner/Novice' : 'Intermediate/Advanced'}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Stats Overview */}
        <div className="grid grid-cols-4 gap-6">
          <Card>
            <CardBody className="text-center">
              <Trophy className="w-12 h-12 mx-auto mb-2 text-yellow-500" />
              <div className="text-4xl font-bold">{stats.totalGames}</div>
              <div className="text-gray-600">Total Games</div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="text-center">
              <Target className="w-12 h-12 mx-auto mb-2 text-green-500" />
              <div className="text-4xl font-bold">{stats.winRate.toFixed(1)}%</div>
              <div className="text-gray-600">Win Rate</div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="text-center">
              <Clock className="w-12 h-12 mx-auto mb-2 text-blue-500" />
              <div className="text-4xl font-bold">{Math.round(stats.avgSessionDuration)}</div>
              <div className="text-gray-600">Avg Minutes</div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="text-center">
              <Users className="w-12 h-12 mx-auto mb-2 text-purple-500" />
              <div className="text-4xl font-bold">{stats.opponents.length}</div>
              <div className="text-gray-600">Unique Opponents</div>
            </CardBody>
          </Card>
        </div>

        {/* Win/Loss Record */}
        <Card>
          <CardHeader>
            <h2 className="text-2xl font-bold">Record</h2>
          </CardHeader>
          <CardBody>
            <div className="flex gap-8">
              <div>
                <div className="text-3xl font-bold text-green-600">{stats.totalWins} Wins</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-red-600">{stats.totalLosses} Losses</div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Frequent Opponents */}
        <Card>
          <CardHeader>
            <h2 className="text-2xl font-bold">Frequent Opponents</h2>
          </CardHeader>
          <CardBody>
            {stats.opponents.length === 0 ? (
              <p className="text-gray-500">No match history yet</p>
            ) : (
              <div className="space-y-2">
                {stats.opponents.slice(0, 10).map((opp, i) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="font-medium">{opp.name}</span>
                    <span className="text-gray-600">{opp.count} games</span>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Recent Sessions */}
        <Card>
          <CardHeader>
            <h2 className="text-2xl font-bold">Recent Sessions</h2>
          </CardHeader>
          <CardBody>
            {stats.recentSessions.length === 0 ? (
              <p className="text-gray-500">No sessions yet</p>
            ) : (
              <div className="space-y-2">
                {stats.recentSessions.map((session, i) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div>
                      <div className="font-medium">
                        {new Date(session.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-600">
                        {session.duration_minutes} minutes • {session.building.replace('_', ' ')}
                      </div>
                    </div>
                    {session.team1_score !== null && session.team2_score !== null && (
                      <div className="text-lg font-bold">
                        {session.team1_score} - {session.team2_score}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
