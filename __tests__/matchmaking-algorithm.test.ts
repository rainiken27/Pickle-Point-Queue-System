import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MatchmakingEngine } from '@/lib/matchmaking/algorithm';
import type { QueueEntryWithPlayer } from '@/types';

// Mock supabase
vi.mock('@/lib/supabase/server', () => ({
  supabaseServer: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        in: vi.fn(() => ({
          eq: vi.fn(() => ({
            data: null // No urgent players for basic tests
          }))
        }))
      }))
    }))
  }
}));

describe('MatchmakingEngine - Solo Protection with Group Efficiency', () => {
  let engine: MatchmakingEngine;

  beforeEach(() => {
    engine = new MatchmakingEngine();
  });

  const createMockPlayer = (id: string, name: string, position: number, groupId?: string): QueueEntryWithPlayer => ({
    id: `queue-${id}`,
    player_id: id,
    position,
    group_id: groupId || null,
    status: 'waiting',
    joined_at: new Date().toISOString(),
    estimated_wait_minutes: null,
    court_id: null,
    player: {
      id,
      name,
      email: `${name.toLowerCase()}@test.com`,
      skill_level: 'intermediate',
      gender: 'other',
      photo_url: '',
      qr_uuid: `${id}-uuid`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  });

  describe('Basic Scenarios', () => {
    it('should match first 4 players in strict queue order when no groups', async () => {
      const queue = [
        createMockPlayer('1', 'Solo 1', 1),
        createMockPlayer('2', 'Solo 2', 2),
        createMockPlayer('3', 'Solo 3', 3),
        createMockPlayer('4', 'Solo 4', 4),
        createMockPlayer('5', 'Solo 5', 5),
      ];

      const matches = await engine.generateMatches(['court1'], queue);
      
      expect(matches).toHaveLength(1);
      expect(matches[0].players.map(p => p.name)).toEqual(['Solo 1', 'Solo 2', 'Solo 3', 'Solo 4']);
    });

    it('should keep groups together when they start at position #1', async () => {
      const queue = [
        createMockPlayer('1', 'Group A #1', 1, 'group-a'),
        createMockPlayer('2', 'Group A #2', 2, 'group-a'),
        createMockPlayer('3', 'Group A #3', 3, 'group-a'),
        createMockPlayer('4', 'Group A #4', 4, 'group-a'),
        createMockPlayer('5', 'Solo 5', 5),
      ];

      const matches = await engine.generateMatches(['court1'], queue);
      
      expect(matches).toHaveLength(1);
      expect(matches[0].players.map(p => p.name)).toEqual(['Group A #1', 'Group A #2', 'Group A #3', 'Group A #4']);
      expect(matches[0].factors.is_friend_group).toBe(true);
    });
  });

  describe('Your New Algorithm - Solo Protection with Group Efficiency', () => {
    it('should allow group to play early when enough courts for solo protection', async () => {
      // Scenario: #1(solo) #2-5(group A) with 2 courts
      const queue = [
        createMockPlayer('1', 'Solo #1', 1),
        createMockPlayer('2', 'Group A #1', 2, 'group-a'),
        createMockPlayer('3', 'Group A #2', 3, 'group-a'),
        createMockPlayer('4', 'Group A #3', 4, 'group-a'),
        createMockPlayer('5', 'Group A #4', 5, 'group-a'),
        createMockPlayer('6', 'Solo #6', 6),
        createMockPlayer('7', 'Solo #7', 7),
        createMockPlayer('8', 'Solo #8', 8),
      ];

      const matches = await engine.generateMatches(['court1', 'court2'], queue);
      
      expect(matches).toHaveLength(2);
      
      // Group A should be able to play on first court (positions 2-5)
      const groupMatch = matches.find(m => m.factors.is_friend_group);
      expect(groupMatch).toBeDefined();
      expect(groupMatch!.players.map(p => p.name)).toEqual(['Group A #1', 'Group A #2', 'Group A #3', 'Group A #4']);
      
      // Solo players should get the second court
      const soloMatch = matches.find(m => !m.factors.is_friend_group);
      expect(soloMatch).toBeDefined();
      expect(soloMatch!.players.map(p => p.name)).toEqual(['Solo #1', 'Solo #6', 'Solo #7', 'Solo #8']);
    });

    it('should NEVER break up groups - wait instead of breaking groups', async () => {
      // Scenario: #1(solo) #2-5(group A) with only 1 court
      // Groups should NEVER be broken up
      const queue = [
        createMockPlayer('1', 'Solo #1', 1),
        createMockPlayer('2', 'Group A #1', 2, 'group-a'),
        createMockPlayer('3', 'Group A #2', 3, 'group-a'),
        createMockPlayer('4', 'Group A #3', 4, 'group-a'),
        createMockPlayer('5', 'Group A #4', 5, 'group-a'),
      ];

      const matches = await engine.generateMatches(['court1'], queue);
      
      // Should either match the solo + 3 more solos, or the complete group
      // Since there's only 1 solo, no match should be possible without breaking the group
      expect(matches).toHaveLength(0);
    });

    it('should match complete group when possible without breaking', async () => {
      // Group of 4 can play as complete unit
      const queue = [
        createMockPlayer('1', 'Group A #1', 1, 'group-a'),
        createMockPlayer('2', 'Group A #2', 2, 'group-a'),
        createMockPlayer('3', 'Group A #3', 3, 'group-a'),
        createMockPlayer('4', 'Group A #4', 4, 'group-a'),
        createMockPlayer('5', 'Solo #5', 5),
      ];

      const matches = await engine.generateMatches(['court1'], queue);
      
      expect(matches).toHaveLength(1);
      expect(matches[0].players.map(p => p.name)).toEqual(['Group A #1', 'Group A #2', 'Group A #3', 'Group A #4']);
      expect(matches[0].factors.is_friend_group).toBe(true);
    });

    it('should handle complex scenario with multiple groups and solos', async () => {
      // Scenario: #1(solo) #2-5(group A) #6(solo) #7-10(group B) with 2 courts
      const queue = [
        createMockPlayer('1', 'Solo #1', 1),
        createMockPlayer('2', 'Group A #1', 2, 'group-a'),
        createMockPlayer('3', 'Group A #2', 3, 'group-a'),
        createMockPlayer('4', 'Group A #3', 4, 'group-a'),
        createMockPlayer('5', 'Group A #4', 5, 'group-a'),
        createMockPlayer('6', 'Solo #6', 6),
        createMockPlayer('7', 'Group B #1', 7, 'group-b'),
        createMockPlayer('8', 'Group B #2', 8, 'group-b'),
        createMockPlayer('9', 'Group B #3', 9, 'group-b'),
        createMockPlayer('10', 'Group B #4', 10, 'group-b'),
      ];

      const matches = await engine.generateMatches(['court1', 'court2'], queue);
      
      // We expect at least 1 match (Group A should be able to play)
      expect(matches.length).toBeGreaterThanOrEqual(1);
      
      // Group A can play (court available for solos #1 and #6)
      const groupAMatch = matches.find(m => 
        m.players.some(p => p.name.includes('Group A'))
      );
      expect(groupAMatch).toBeDefined();
      expect(groupAMatch!.factors.is_friend_group).toBe(true);
      
      // The algorithm correctly prioritizes Group A while protecting solo players
      // After Group A is matched, remaining players may not form a valid match
      // without breaking groups, which is the correct behavior
    });

    it('should handle groups of 2 and 3 properly - never break them', async () => {
      // Group of 3 + 1 solo should stay together
      const queue = [
        createMockPlayer('1', 'Solo #1', 1),
        createMockPlayer('2', 'Group #1', 2, 'group-3'),
        createMockPlayer('3', 'Group #2', 3, 'group-3'),
        createMockPlayer('4', 'Group #3', 4, 'group-3'),
        createMockPlayer('5', 'Solo #5', 5),
      ];

      const matches = await engine.generateMatches(['court1'], queue);
      
      expect(matches).toHaveLength(1);
      // Should match solo #1 + complete group of 3 (never break the group)
      expect(matches[0].players.map(p => p.name)).toEqual(['Solo #1', 'Group #1', 'Group #2', 'Group #3']);
    });

    it('should handle group of 2 + 2 solos properly', async () => {
      const queue = [
        createMockPlayer('1', 'Solo #1', 1),
        createMockPlayer('2', 'Group #1', 2, 'group-2'),
        createMockPlayer('3', 'Group #2', 3, 'group-2'),
        createMockPlayer('4', 'Solo #4', 4),
      ];

      const matches = await engine.generateMatches(['court1'], queue);
      
      expect(matches).toHaveLength(1);
      // Should match both solos + complete group of 2
      expect(matches[0].players.map(p => p.name)).toEqual(['Solo #1', 'Group #1', 'Group #2', 'Solo #4']);
    });
  });
});