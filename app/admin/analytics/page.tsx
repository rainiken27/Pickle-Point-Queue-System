"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase/client';
import { BarChart3, TrendingUp, Clock, Users, Download } from 'lucide-react';

interface CourtUtilization {
  court_number: number;
  building: string;
  utilization_pct: number;
  total_matches: number;
  avg_match_duration: number;
}

interface BuildingLoadVariance {
  building: string;
  queue_depth: number;
  utilization_pct: number;
  avg_wait_time: number;
}

interface PeakHourData {
  hour: number;
  check_ins: number;
  avg_queue_depth: number;
  avg_wait_time: number;
}

interface PlayerInsights {
  avg_session_duration: number;
  return_rate_30_days: number;
  avg_games_per_visit: number;
  skill_distribution: { skill: string; count: number }[];
  preference_distribution: { preference: string; count: number }[];
  building_preferences: { building: string; visits: number }[];
}

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('today');
  const [courtUtilization, setCourtUtilization] = useState<CourtUtilization[]>([]);
  const [buildingVariance, setBuildingVariance] = useState<BuildingLoadVariance[]>([]);
  const [peakHours, setPeakHours] = useState<PeakHourData[]>([]);
  const [playerInsights, setPlayerInsights] = useState<PlayerInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [varianceWarning, setVarianceWarning] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadCourtUtilization(),
        loadBuildingVariance(),
        loadPeakHours(),
        loadPlayerInsights(),
      ]);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDateFilter = () => {
    const now = new Date();
    let startDate: Date;

    switch (dateRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    return startDate.toISOString();
  };

  const loadCourtUtilization = async () => {
    const startDate = getDateFilter();

    // Get all buildings
    const buildings = ['building_a', 'building_b', 'building_c'];
    const utilization: CourtUtilization[] = [];

    for (const building of buildings) {
      // Get match history for this building
      // Each match_history record represents one player in a match
      // Since each match has 4 players, we divide by 4 to get actual match count
      const { data: matchRecords } = await supabase
        .from('match_history')
        .select(`
          *,
          session:sessions!inner(building, start_time)
        `)
        .gte('match_date', startDate);

      // Filter for this building and count unique matches
      // Group by match_date to avoid counting same match 4 times
      const buildingMatches = matchRecords?.filter(m => m.session?.building === building) || [];

      // Count unique matches (group by match_date + session_id)
      const uniqueMatches = new Map();
      buildingMatches.forEach(record => {
        const key = `${record.session_id}-${record.match_date}`;
        if (!uniqueMatches.has(key)) {
          uniqueMatches.set(key, record);
        }
      });

      const totalMatches = uniqueMatches.size;

      // Calculate actual average match duration from completed matches
      const completedMatches = buildingMatches.filter(m => m.duration_minutes !== null);
      const totalDuration = completedMatches.reduce((sum, m) => sum + (m.duration_minutes || 0), 0);
      const avgMatchDuration = completedMatches.length > 0
        ? totalDuration / completedMatches.length
        : 35; // Fallback to 35 min if no completed matches yet

      // Debug logging
      if (buildingMatches.length > 0) {
        console.log(`[Analytics] ${building}:`, {
          totalRecords: buildingMatches.length,
          completedMatches: completedMatches.length,
          totalDuration,
          avgMatchDuration,
          sampleRecord: buildingMatches[0],
        });
      }

      const totalMinutes = totalMatches * avgMatchDuration;

      // Each building has 4 courts
      // Operating hours per court: 12 hours/day (720 min)
      // Total capacity for 4 courts in this building
      const numCourtsInBuilding = 4;
      const operatingMinutesPerCourt = dateRange === 'today' ? 720 : (dateRange === 'week' ? 720 * 7 : 720 * 30);
      const totalCapacity = operatingMinutesPerCourt * numCourtsInBuilding;

      const utilizationPct = totalCapacity > 0 ? (totalMinutes / totalCapacity) * 100 : 0;

      // Add one row per building (representing average across 4 courts)
      utilization.push({
        court_number: 0, // Not used - showing building instead
        building: building,
        utilization_pct: Math.min(utilizationPct, 100),
        total_matches: totalMatches,
        avg_match_duration: avgMatchDuration,
      });
    }

    setCourtUtilization(utilization);
  };

  const loadBuildingVariance = async () => {
    const buildings = ['building_a', 'building_b', 'building_c'];
    const variance: BuildingLoadVariance[] = [];

    for (const building of buildings) {
      // Get current queue depth
      const { data: queueEntries } = await supabase
        .from('queue')
        .select('*')
        .eq('building', building)
        .eq('status', 'waiting');

      const queueDepth = queueEntries?.length || 0;

      // Get utilization
      const { data: courts } = await supabase
        .from('courts')
        .select('status')
        .eq('building', building);

      const occupiedCourts = courts?.filter(c => c.status === 'occupied').length || 0;
      const totalCourts = courts?.length || 1;
      const utilizationPct = (occupiedCourts / totalCourts) * 100;

      // Estimate avg wait time
      const avgWaitTime = queueEntries?.reduce((sum, e) => sum + (e.estimated_wait_minutes || 0), 0) / (queueDepth || 1) || 0;

      variance.push({
        building,
        queue_depth: queueDepth,
        utilization_pct: utilizationPct,
        avg_wait_time: avgWaitTime,
      });
    }

    // Calculate variance
    const queueDepths = variance.map(v => v.queue_depth);
    const max = Math.max(...queueDepths);
    const min = Math.min(...queueDepths);
    const avg = queueDepths.reduce((a, b) => a + b, 0) / queueDepths.length;
    const variancePct = avg > 0 ? ((max - min) / avg) * 100 : 0;

    if (variancePct > 10) {
      setVarianceWarning(`Queue imbalance detected: ${variancePct.toFixed(1)}% variance`);
    } else {
      setVarianceWarning(null);
    }

    setBuildingVariance(variance);
  };

  const loadPeakHours = async () => {
    const startDate = getDateFilter();

    const { data: sessions } = await supabase
      .from('sessions')
      .select('start_time')
      .gte('start_time', startDate);

    if (!sessions) return;

    // Group by hour
    const hourlyData: Record<number, { count: number }> = {};

    sessions.forEach(session => {
      const hour = new Date(session.start_time).getHours();
      if (!hourlyData[hour]) {
        hourlyData[hour] = { count: 0 };
      }
      hourlyData[hour].count++;
    });

    const peakData: PeakHourData[] = Object.entries(hourlyData).map(([hour, data]) => ({
      hour: parseInt(hour),
      check_ins: data.count,
      avg_queue_depth: 0, // Would need queue snapshots for accurate data
      avg_wait_time: 0, // Would need historical queue data
    }));

    setPeakHours(peakData.sort((a, b) => a.hour - b.hour));
  };

  const loadPlayerInsights = async () => {
    const startDate = getDateFilter();

    // Get all sessions (both active and completed)
    const { data: sessions } = await supabase
      .from('sessions')
      .select('player_id, duration_minutes, created_at')
      .in('status', ['active', 'completed'])
      .gte('created_at', startDate);

    if (!sessions) return;

    // Average session duration
    const avgDuration = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / (sessions.length || 1);

    // Games per visit (count sessions per unique player)
    const playerSessions: Record<string, number> = {};
    sessions.forEach(s => {
      playerSessions[s.player_id] = (playerSessions[s.player_id] || 0) + 1;
    });

    const avgGamesPerVisit = Object.values(playerSessions).reduce((a, b) => a + b, 0) / (Object.keys(playerSessions).length || 1);

    // Get player data for skill distribution
    const { data: players } = await supabase
      .from('players')
      .select('skill_level');

    const skillDist: Record<string, number> = {};
    players?.forEach(p => {
      skillDist[p.skill_level] = (skillDist[p.skill_level] || 0) + 1;
    });

    const skillDistribution = Object.entries(skillDist).map(([skill, count]) => ({ skill, count }));

    // Get preference distribution
    const { data: preferences } = await supabase
      .from('player_preferences')
      .select('gender_pref, match_type');

    const prefDist: Record<string, number> = {};
    preferences?.forEach(p => {
      const key = `${p.match_type} / ${p.gender_pref}`;
      prefDist[key] = (prefDist[key] || 0) + 1;
    });

    const preferenceDistribution = Object.entries(prefDist).map(([preference, count]) => ({ preference, count }));

    setPlayerInsights({
      avg_session_duration: avgDuration,
      return_rate_30_days: 0, // Would need historical player tracking
      avg_games_per_visit: avgGamesPerVisit,
      skill_distribution: skillDistribution,
      preference_distribution: preferenceDistribution,
      building_preferences: [], // Would need session building tracking
    });
  };

  const exportToCSV = () => {
    let csv = 'Building Utilization Report\n\n';
    csv += 'Building,Utilization %,Total Matches,Avg Match Duration (min)\n';
    courtUtilization.forEach(c => {
      csv += `${getBuildingName(c.building)},${c.utilization_pct.toFixed(1)},${c.total_matches},${c.avg_match_duration.toFixed(0)}\n`;
    });
    csv += '\n\nBuilding Load Variance\n\n';
    csv += 'Building,Queue Depth,Current Utilization %,Avg Wait Time (min)\n';
    buildingVariance.forEach(b => {
      csv += `${getBuildingName(b.building)},${b.queue_depth},${b.utilization_pct.toFixed(1)},${b.avg_wait_time.toFixed(0)}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getBuildingName = (building: string) => {
    return building.replace('building_', 'Building ').toUpperCase();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 flex items-center justify-center">
        <div className="text-xl">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Analytics & Reporting</h1>
          <div className="flex gap-4">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="px-4 py-2 border rounded-lg bg-white"
            >
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
            <Button onClick={exportToCSV}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Court Utilization Report */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-bold">Building Utilization Report</h2>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Average utilization across all 4 courts in each building
            </p>
          </CardHeader>
          <CardBody>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">Building</th>
                    <th className="px-4 py-3 text-right">Utilization %</th>
                    <th className="px-4 py-3 text-right">Total Matches</th>
                    <th className="px-4 py-3 text-right">Avg Match Duration (min)</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {courtUtilization.map((data) => (
                    <tr key={data.building}>
                      <td className="px-4 py-3 font-semibold">{getBuildingName(data.building)}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${
                        data.utilization_pct > 70 ? 'text-green-600 bg-green-50' :
                        data.utilization_pct > 40 ? 'text-blue-600' :
                        'text-yellow-600 bg-yellow-50'
                      }`}>
                        {data.utilization_pct.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 text-right">{data.total_matches}</td>
                      <td className="px-4 py-3 text-right">{data.avg_match_duration.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>

        {/* Building Load Variance */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-purple-600" />
              <h2 className="text-xl font-bold">Building Load Variance</h2>
              {varianceWarning && (
                <span className="ml-auto px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                  ⚠️ {varianceWarning}
                </span>
              )}
              {!varianceWarning && (
                <span className="ml-auto px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                  ✓ Balanced
                </span>
              )}
            </div>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-3 gap-4">
              {buildingVariance.map((building) => (
                <div key={building.building} className="border rounded-lg p-4 space-y-3">
                  <h3 className="font-bold text-lg">{getBuildingName(building.building)}</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Queue Depth:</span>
                      <span className="font-semibold">{building.queue_depth}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Utilization:</span>
                      <span className="font-semibold">{building.utilization_pct.toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg Wait:</span>
                      <span className="font-semibold">{building.avg_wait_time.toFixed(0)} min</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Peak Hour Analysis */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="w-6 h-6 text-orange-600" />
              <h2 className="text-xl font-bold">Peak Hour Analysis</h2>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-2">
              {peakHours.map((hour) => {
                const maxCheckIns = Math.max(...peakHours.map(h => h.check_ins));
                const isPeak = hour.check_ins > maxCheckIns * 0.8;
                const barWidth = (hour.check_ins / maxCheckIns) * 100;

                return (
                  <div key={hour.hour} className="flex items-center gap-4">
                    <span className="w-20 text-sm font-medium">
                      {hour.hour.toString().padStart(2, '0')}:00
                    </span>
                    <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden">
                      <div
                        className={`h-full ${isPeak ? 'bg-red-500' : 'bg-blue-500'} transition-all`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    <span className="w-20 text-right text-sm font-semibold">
                      {hour.check_ins} check-ins
                    </span>
                    {isPeak && (
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                        PEAK
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>

        {/* Player Behavior Insights */}
        {playerInsights && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="w-6 h-6 text-green-600" />
                <h2 className="text-xl font-bold">Player Behavior Insights</h2>
              </div>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                    <span className="text-gray-700">Avg Session Duration:</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {playerInsights.avg_session_duration.toFixed(0)} min
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                    <span className="text-gray-700">Avg Games per Visit:</span>
                    <span className="text-2xl font-bold text-green-600">
                      {playerInsights.avg_games_per_visit.toFixed(1)}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Skill Level Distribution</h3>
                  <div className="space-y-2">
                    {playerInsights.skill_distribution.map((skill) => (
                      <div key={skill.skill} className="flex items-center gap-3">
                        <span className="w-32 text-sm">{skill.skill}</span>
                        <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500"
                            style={{
                              width: `${(skill.count / playerInsights.skill_distribution.reduce((a, b) => a + b.count, 0)) * 100}%`
                            }}
                          />
                        </div>
                        <span className="w-12 text-right text-sm font-semibold">
                          {skill.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="col-span-2">
                  <h3 className="font-semibold mb-3">Match Preferences</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {playerInsights.preference_distribution.map((pref) => (
                      <div key={pref.preference} className="flex justify-between items-center p-3 border rounded-lg">
                        <span className="text-sm">{pref.preference}</span>
                        <span className="font-semibold">{pref.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
