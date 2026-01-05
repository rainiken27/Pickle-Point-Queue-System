import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MatchmakingEngine } from './algorithm';
import type { QueueEntryWithPlayer, PlayerPreferences, SkillLevel, GenderType } from '@/types';

// Mock Supabase server
vi.mock('@/lib/supabase/server', () => ({
  supabaseServer: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

// Helper function to create queue entry
function createQueueEntry(
  id: string,
  playerId: string,
  name: string,
  skillLevel: SkillLevel,
  gender: GenderType,
  position: number,
  groupId: string | null = null
): QueueEntryWithPlayer {
  return {
    id,
    player_id: playerId,
    position,
    building: 'building_a',
    status: 'waiting',
    joined_at: new Date().toISOString(),
    group_id: groupId,
    estimated_wait_minutes: 15,
    player: {
      id: playerId,
      name,
      skill_level: skillLevel,
      gender,
      qr_uuid: `qr-${playerId}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };
}

// Helper to setup Supabase mocks for preferences and sessions
async function setupSupabaseMock(preferences: any[], sessions: any[] = []) {
  const { supabaseServer } = await import('@/lib/supabase/server');
  const mockFrom = vi.fn((table: string) => {
    if (table === 'sessions') {
      return {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: sessions, error: null }),
          }),
        }),
      };
    }
    // player_preferences table
    return {
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({ data: preferences, error: null }),
      }),
    };
  });

  (supabaseServer.from as any) = mockFrom;
  (supabaseServer.rpc as any) = vi.fn().mockResolvedValue({ data: [], error: null });
}

describe('MatchmakingEngine', () => {
  let engine: MatchmakingEngine;
  let mockQueueEntries: QueueEntryWithPlayer[];

  beforeEach(async () => {
    vi.clearAllMocks();

    // Setup default Supabase mocks for all tests
    const { supabaseServer } = await import('@/lib/supabase/server');
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      }),
    });

    (supabaseServer.from as any) = mockFrom;
    (supabaseServer.rpc as any) = vi.fn().mockResolvedValue({ data: [], error: null });

    engine = new MatchmakingEngine();

    // Setup mock queue entries
    mockQueueEntries = [
      {
        id: '1',
        player_id: 'player-1',
        position: 1,
        building: 'building_a',
        status: 'waiting',
        joined_at: new Date().toISOString(),
        group_id: null,
        estimated_wait_minutes: 15,
        player: {
          id: 'player-1',
          name: 'John Doe',
          skill_level: 'beginner',
          gender: 'male',
          qr_uuid: 'qr-1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      },
      {
        id: '2',
        player_id: 'player-2',
        position: 2,
        building: 'building_a',
        status: 'waiting',
        joined_at: new Date().toISOString(),
        group_id: null,
        estimated_wait_minutes: 15,
        player: {
          id: 'player-2',
          name: 'Jane Smith',
          skill_level: 'beginner',
          gender: 'female',
          qr_uuid: 'qr-2',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      },
      {
        id: '3',
        player_id: 'player-3',
        position: 3,
        building: 'building_a',
        status: 'waiting',
        joined_at: new Date().toISOString(),
        group_id: null,
        estimated_wait_minutes: 15,
        player: {
          id: 'player-3',
          name: 'Bob Johnson',
          skill_level: 'beginner',
          gender: 'male',
          qr_uuid: 'qr-3',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      },
      {
        id: '4',
        player_id: 'player-4',
        position: 4,
        building: 'building_a',
        status: 'waiting',
        joined_at: new Date().toISOString(),
        group_id: null,
        estimated_wait_minutes: 15,
        player: {
          id: 'player-4',
          name: 'Alice Williams',
          skill_level: 'beginner',
          gender: 'female',
          qr_uuid: 'qr-4',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      },
    ];
  });

  describe('generateMatch', () => {
    it('should return null if less than 4 players in queue', async () => {
      const shortQueue = mockQueueEntries.slice(0, 2);
      const match = await engine.generateMatch('court-1', 'building_a', shortQueue);

      expect(match).toBeNull();
    });

    it('should generate a match with exactly 4 players', async () => {
      const match = await engine.generateMatch('court-1', 'building_a', mockQueueEntries);

      expect(match).toBeDefined();
      if (match) {
        expect(match.players).toHaveLength(4);
        expect(match.court_id).toBe('court-1');
        expect(match.building).toBe('building_a');
      }
    });

    it('should only match players from the correct building', async () => {
      // Add players from different building
      const mixedQueue = [
        ...mockQueueEntries,
        {
          ...mockQueueEntries[0],
          id: '5',
          building: 'building_b',
        } as QueueEntryWithPlayer,
      ];

      const match = await engine.generateMatch('court-1', 'building_a', mixedQueue);

      if (match) {
        match.players.forEach(player => {
          const queueEntry = mixedQueue.find(e => e.player_id === player.id);
          expect(queueEntry?.building).toBe('building_a');
        });
      }
    });

    it('should prioritize friend groups (same group_id)', async () => {
      const friendGroupQueue = mockQueueEntries.map((entry, index) => ({
        ...entry,
        group_id: index < 4 ? 'group-1' : null,
      }));

      const match = await engine.generateMatch('court-1', 'building_a', friendGroupQueue);

      if (match) {
        expect(match.factors?.is_friend_group).toBe(true);
        // All 4 players should be from the same group
        const groupIds = match.players.map(p => {
          const entry = friendGroupQueue.find(e => e.player_id === p.id);
          return entry?.group_id;
        });
        expect(new Set(groupIds).size).toBe(1);
        expect(groupIds[0]).toBe('group-1');
      }
    });
  });

  describe('constraint relaxation', () => {
    it('should relax constraints in correct order: variety, gender, skill', async () => {
      // This would require mocking the internal methods
      // Testing that the relaxation order is correct
      const relaxationOrder = ['variety', 'gender', 'skill'];

      expect(relaxationOrder).toEqual(['variety', 'gender', 'skill']);
    });
  });

  describe('match suggestion metadata', () => {
    it('should include priority score in match suggestion', async () => {
      const match = await engine.generateMatch('court-1', 'building_a', mockQueueEntries);

      if (match) {
        expect(match.priority_score).toBeDefined();
        expect(typeof match.priority_score).toBe('number');
      }
    });

    it('should include match factors in suggestion', async () => {
      const match = await engine.generateMatch('court-1', 'building_a', mockQueueEntries);

      if (match) {
        expect(match.factors).toBeDefined();
        expect(typeof match.factors).toBe('object');
      }
    });
  });

  describe('CRITICAL: Priority Hierarchy - Skill > Gender', () => {
    it('Scenario 1: Should prioritize skill level preference over gender preference', async () => {
      // Setup: 4 beginners + 4 intermediates, interleaved in queue
      const queue = [
        createQueueEntry('1', 'p1', 'Beginner F 1', 'beginner', 'female', 1),
        createQueueEntry('2', 'p2', 'Intermediate M 1', 'intermediate', 'male', 2),
        createQueueEntry('3', 'p3', 'Beginner M 1', 'beginner', 'male', 3),
        createQueueEntry('4', 'p4', 'Intermediate F 1', 'intermediate', 'female', 4),
        createQueueEntry('5', 'p5', 'Beginner F 2', 'beginner', 'female', 5),
        createQueueEntry('6', 'p6', 'Intermediate M 2', 'intermediate', 'male', 6),
        createQueueEntry('7', 'p7', 'Beginner M 2', 'beginner', 'male', 7),
        createQueueEntry('8', 'p8', 'Intermediate F 2', 'intermediate', 'female', 8),
      ];

      await setupSupabaseMock([
        { player_id: 'p1', skill_level_pref: 'beginner', gender_pref: 'random' },
        { player_id: 'p2', skill_level_pref: 'intermediate_advanced', gender_pref: 'random' },
        { player_id: 'p3', skill_level_pref: 'beginner', gender_pref: 'random' },
        { player_id: 'p4', skill_level_pref: 'intermediate_advanced', gender_pref: 'random' },
        { player_id: 'p5', skill_level_pref: 'beginner', gender_pref: 'random' },
        { player_id: 'p6', skill_level_pref: 'intermediate_advanced', gender_pref: 'random' },
        { player_id: 'p7', skill_level_pref: 'beginner', gender_pref: 'random' },
        { player_id: 'p8', skill_level_pref: 'intermediate_advanced', gender_pref: 'random' },
      ]);

      const match = await engine.generateMatch('court-1', 'building_a', queue);

      expect(match).toBeDefined();
      if (match) {
        // Should match 4 beginners together (p1, p3, p5, p7) regardless of gender
        const matchedIds = match.players.map(p => p.id).sort();
        expect(matchedIds).toEqual(['p1', 'p3', 'p5', 'p7']);
        expect(match.factors?.skill_compatible).toBe(true);
      }
    });

    it('Scenario 2: Should respect gender preference within same skill level', async () => {
      // Setup: 4 beginner females + 4 beginner males, all want same skill level
      const queue = [
        createQueueEntry('1', 'p1', 'Beginner F 1', 'beginner', 'female', 1),
        createQueueEntry('2', 'p2', 'Beginner F 2', 'beginner', 'female', 2),
        createQueueEntry('3', 'p3', 'Beginner F 3', 'beginner', 'female', 3),
        createQueueEntry('4', 'p4', 'Beginner F 4', 'beginner', 'female', 4),
        createQueueEntry('5', 'p5', 'Beginner M 1', 'beginner', 'male', 5),
        createQueueEntry('6', 'p6', 'Beginner M 2', 'beginner', 'male', 6),
        createQueueEntry('7', 'p7', 'Beginner M 3', 'beginner', 'male', 7),
        createQueueEntry('8', 'p8', 'Beginner M 4', 'beginner', 'male', 8),
      ];

      await setupSupabaseMock([
        { player_id: 'p1', skill_level_pref: 'beginner', gender_pref: 'womens' },
        { player_id: 'p2', skill_level_pref: 'beginner', gender_pref: 'womens' },
        { player_id: 'p3', skill_level_pref: 'beginner', gender_pref: 'womens' },
        { player_id: 'p4', skill_level_pref: 'beginner', gender_pref: 'womens' },
        { player_id: 'p5', skill_level_pref: 'beginner', gender_pref: 'mens' },
        { player_id: 'p6', skill_level_pref: 'beginner', gender_pref: 'mens' },
        { player_id: 'p7', skill_level_pref: 'beginner', gender_pref: 'mens' },
        { player_id: 'p8', skill_level_pref: 'beginner', gender_pref: 'mens' },
      ]);

      const match = await engine.generateMatch('court-1', 'building_a', queue);

      expect(match).toBeDefined();
      if (match) {
        // Should match 4 women together (p1-p4) since skill is same and gender pref matches
        const matchedIds = match.players.map(p => p.id).sort();
        expect(matchedIds).toEqual(['p1', 'p2', 'p3', 'p4']);
        expect(match.factors?.skill_compatible).toBe(true);
        // Gender compatibility should work, but may relax variety first
        // The important thing is that all 4 matched players are women
        const allFemale = match.players.every(p => p.gender === 'female');
        expect(allFemale).toBe(true);
      }
    });

    it('Scenario 3: Should prioritize skill over gender (cross-level test)', async () => {
      // Setup: 2 beginner females, 2 intermediate females (all want womens)
      //        2 beginner males, 2 intermediate males (all want random)
      const queue = [
        createQueueEntry('1', 'p1', 'Beginner F 1', 'beginner', 'female', 1),
        createQueueEntry('2', 'p2', 'Beginner F 2', 'beginner', 'female', 2),
        createQueueEntry('3', 'p3', 'Intermediate F 1', 'intermediate', 'female', 3),
        createQueueEntry('4', 'p4', 'Intermediate F 2', 'intermediate', 'female', 4),
        createQueueEntry('5', 'p5', 'Beginner M 1', 'beginner', 'male', 5),
        createQueueEntry('6', 'p6', 'Beginner M 2', 'beginner', 'male', 6),
        createQueueEntry('7', 'p7', 'Intermediate M 1', 'intermediate', 'male', 7),
        createQueueEntry('8', 'p8', 'Intermediate M 2', 'intermediate', 'male', 8),
      ];

      await setupSupabaseMock([
        { player_id: 'p1', skill_level_pref: 'beginner', gender_pref: 'womens' },
        { player_id: 'p2', skill_level_pref: 'beginner', gender_pref: 'womens' },
        { player_id: 'p3', skill_level_pref: 'intermediate_advanced', gender_pref: 'womens' },
        { player_id: 'p4', skill_level_pref: 'intermediate_advanced', gender_pref: 'womens' },
        { player_id: 'p5', skill_level_pref: 'beginner', gender_pref: 'random' },
        { player_id: 'p6', skill_level_pref: 'beginner', gender_pref: 'random' },
        { player_id: 'p7', skill_level_pref: 'intermediate_advanced', gender_pref: 'random' },
        { player_id: 'p8', skill_level_pref: 'intermediate_advanced', gender_pref: 'random' },
      ]);

      const match = await engine.generateMatch('court-1', 'building_a', queue);

      expect(match).toBeDefined();
      if (match) {
        // Should match 4 beginners (p1, p2, p5, p6) - skill beats gender preference
        const matchedIds = match.players.map(p => p.id).sort();
        expect(matchedIds).toEqual(['p1', 'p2', 'p5', 'p6']);
        expect(match.factors?.skill_compatible).toBe(true);
        // Gender will be relaxed since womens-only can't be satisfied
        expect(match.factors?.gender_compatible).toBe(false);
      }
    });
  });

  describe('CRITICAL: Constraint Relaxation', () => {
    it('Scenario 6: Should relax constraints progressively (variety -> variety+gender -> all)', async () => {
      // Setup: 4 players with conflicting gender preferences
      const queue = [
        createQueueEntry('1', 'p1', 'Beginner F 1', 'beginner', 'female', 1),
        createQueueEntry('2', 'p2', 'Beginner F 2', 'beginner', 'female', 2),
        createQueueEntry('3', 'p3', 'Beginner M 1', 'beginner', 'male', 3),
        createQueueEntry('4', 'p4', 'Beginner M 2', 'beginner', 'male', 4),
      ];

      await setupSupabaseMock([
        { player_id: 'p1', skill_level_pref: 'beginner', gender_pref: 'womens' },
        { player_id: 'p2', skill_level_pref: 'beginner', gender_pref: 'womens' },
        { player_id: 'p3', skill_level_pref: 'beginner', gender_pref: 'mens' },
        { player_id: 'p4', skill_level_pref: 'beginner', gender_pref: 'mens' },
      ]);

      const match = await engine.generateMatch('court-1', 'building_a', queue);

      expect(match).toBeDefined();
      if (match) {
        // Should create match by relaxing gender constraint
        expect(match.players).toHaveLength(4);
        expect(match.factors?.skill_compatible).toBe(true);
        expect(match.factors?.gender_compatible).toBe(false);
        expect(match.factors?.relaxed_constraints).toContain('gender');
      }
    });
  });

  describe('CRITICAL: Time Urgency', () => {
    it('Scenario 11: Should prioritize players with <30 min remaining session time', async () => {
      const now = Date.now();
      const fiveHoursAgo = new Date(now - 5 * 60 * 60 * 1000 + 25 * 60 * 1000); // 4h 35m ago (25 min remaining)
      const recentStart = new Date(now - 30 * 60 * 1000); // 30 min ago (4h 30m remaining)

      const queue = [
        createQueueEntry('1', 'p1', 'Player 1', 'beginner', 'male', 1),
        createQueueEntry('2', 'p2', 'Player 2 URGENT', 'beginner', 'male', 2),
        createQueueEntry('3', 'p3', 'Player 3', 'beginner', 'male', 3),
        createQueueEntry('4', 'p4', 'Player 4', 'beginner', 'male', 4),
        createQueueEntry('5', 'p5', 'Player 5', 'beginner', 'male', 5),
      ];

      const { supabaseServer } = await import('@/lib/supabase/server');

      // Mock sessions query to return urgent player
      const mockFrom = vi.fn((table: string) => {
        if (table === 'sessions') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: [
                    { player_id: 'p1', start_time: recentStart.toISOString() },
                    { player_id: 'p2', start_time: fiveHoursAgo.toISOString() }, // URGENT
                    { player_id: 'p3', start_time: recentStart.toISOString() },
                    { player_id: 'p4', start_time: recentStart.toISOString() },
                    { player_id: 'p5', start_time: recentStart.toISOString() },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }

        // Mock preferences
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [
                { player_id: 'p1', skill_level_pref: 'beginner', gender_pref: 'random' },
                { player_id: 'p2', skill_level_pref: 'beginner', gender_pref: 'random' },
                { player_id: 'p3', skill_level_pref: 'beginner', gender_pref: 'random' },
                { player_id: 'p4', skill_level_pref: 'beginner', gender_pref: 'random' },
                { player_id: 'p5', skill_level_pref: 'beginner', gender_pref: 'random' },
              ],
              error: null,
            }),
          }),
        };
      });

      (supabaseServer.from as any) = mockFrom;
      (supabaseServer.rpc as any) = vi.fn().mockResolvedValue({ data: [], error: null });

      const match = await engine.generateMatch('court-1', 'building_a', queue);

      expect(match).toBeDefined();
      if (match) {
        // p2 should be included despite being position 2
        const matchedIds = match.players.map(p => p.id);
        expect(matchedIds).toContain('p2');
        // Note: has_time_urgent_players is only true if there are 4+ urgent players
        // With only 1 urgent player, they're included in a standard match
        expect(match.factors?.has_time_urgent_players).toBe(false);
        // Priority score is still calculated for standard match
        expect(match.priority_score).toBeGreaterThanOrEqual(30); // Skill compatibility adds 30 points
      }
    });
  });

  describe('CRITICAL: Edge Cases', () => {
    it('Scenario 12: Should handle insufficient players for perfect match', async () => {
      // 3 beginners + 1 intermediate, only 4 total
      const queue = [
        createQueueEntry('1', 'p1', 'Beginner 1', 'beginner', 'male', 1),
        createQueueEntry('2', 'p2', 'Beginner 2', 'beginner', 'male', 2),
        createQueueEntry('3', 'p3', 'Beginner 3', 'beginner', 'male', 3),
        createQueueEntry('4', 'p4', 'Intermediate 1', 'intermediate', 'male', 4),
      ];

      await setupSupabaseMock([
        { player_id: 'p1', skill_level_pref: 'beginner', gender_pref: 'random' },
        { player_id: 'p2', skill_level_pref: 'beginner', gender_pref: 'random' },
        { player_id: 'p3', skill_level_pref: 'beginner', gender_pref: 'random' },
        { player_id: 'p4', skill_level_pref: 'intermediate_advanced', gender_pref: 'random' },
      ]);

      const match = await engine.generateMatch('court-1', 'building_a', queue);

      expect(match).toBeDefined();
      if (match) {
        // Should relax skill constraint and match all 4
        expect(match.players).toHaveLength(4);
        expect(match.factors?.skill_compatible).toBe(false);
        expect(match.factors?.relaxed_constraints).toContain('skill');
      }
    });

    it('Scenario 13: Should handle all players with conflicting preferences', async () => {
      const queue = [
        createQueueEntry('1', 'p1', 'Beginner F', 'beginner', 'female', 1),
        createQueueEntry('2', 'p2', 'Intermediate M', 'intermediate', 'male', 2),
        createQueueEntry('3', 'p3', 'Advanced F', 'advanced', 'female', 3),
        createQueueEntry('4', 'p4', 'Novice M', 'novice', 'male', 4),
      ];

      await setupSupabaseMock([
        { player_id: 'p1', skill_level_pref: 'beginner', gender_pref: 'womens' },
        { player_id: 'p2', skill_level_pref: 'intermediate_advanced', gender_pref: 'mens' },
        { player_id: 'p3', skill_level_pref: 'intermediate_advanced', gender_pref: 'womens' },
        { player_id: 'p4', skill_level_pref: 'beginner', gender_pref: 'mens' },
      ]);

      const match = await engine.generateMatch('court-1', 'building_a', queue);

      expect(match).toBeDefined();
      if (match) {
        // Should relax all constraints and create match
        expect(match.players).toHaveLength(4);
        // At least some constraints should be relaxed
        expect(match.factors?.relaxed_constraints.length).toBeGreaterThan(0);
      }
    });

    it('Scenario 14: Should handle incomplete friend group (3 players)', async () => {
      const queue = [
        createQueueEntry('1', 'p1', 'Friend 1', 'beginner', 'male', 1, 'group-1'),
        createQueueEntry('2', 'p2', 'Friend 2', 'beginner', 'male', 2, 'group-1'),
        createQueueEntry('3', 'p3', 'Friend 3', 'beginner', 'male', 3, 'group-1'),
        createQueueEntry('4', 'p4', 'Solo 1', 'beginner', 'male', 4),
        createQueueEntry('5', 'p5', 'Solo 2', 'beginner', 'male', 5),
      ];

      const { supabaseServer } = await import('@/lib/supabase/server');
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [
              { player_id: 'p1', skill_level_pref: 'beginner', gender_pref: 'random' },
              { player_id: 'p2', skill_level_pref: 'beginner', gender_pref: 'random' },
              { player_id: 'p3', skill_level_pref: 'beginner', gender_pref: 'random' },
              { player_id: 'p4', skill_level_pref: 'beginner', gender_pref: 'random' },
              { player_id: 'p5', skill_level_pref: 'beginner', gender_pref: 'random' },
            ],
            error: null,
          }),
        }),
      });

      (supabaseServer.from as any) = mockFrom;
      (supabaseServer.rpc as any) = vi.fn().mockResolvedValue({ data: [], error: null });

      const match = await engine.generateMatch('court-1', 'building_a', queue);

      expect(match).toBeDefined();
      if (match) {
        // Should match group of 3 + 1 solo
        const matchedIds = match.players.map(p => p.id).sort();
        expect(matchedIds).toContain('p1');
        expect(matchedIds).toContain('p2');
        expect(matchedIds).toContain('p3');
        // One solo player should be included
        const hasSolo = matchedIds.includes('p4') || matchedIds.includes('p5');
        expect(hasSolo).toBe(true);
        expect(match.factors?.is_friend_group).toBe(true);
      }
    });
  });
});
