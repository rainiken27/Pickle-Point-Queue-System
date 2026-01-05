import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Create a comprehensive mock for Supabase with proper chaining
const createMockChain = (finalResult: any) => ({
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue(finalResult),
  then: (resolve: any) => resolve(finalResult),
});

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  supabaseServer: {
    from: vi.fn(),
  },
}));

// Import after mocking
import { POST as createGroup } from './route';
import { GET as getGroup, DELETE as deleteGroup } from './[id]/route';
import { POST as addMember, DELETE as removeMember } from './[id]/members/route';
import { supabaseServer } from '@/lib/supabase/server';

const mockFrom = supabaseServer.from as any;

describe('Group Management API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/groups - Create Group', () => {
    it('should create a group with 4 members successfully', async () => {
      const groupData = {
        name: 'Team Alpha',
        member_ids: [
          '550e8400-e29b-41d4-a716-446655440001',
          '550e8400-e29b-41d4-a716-446655440002',
          '550e8400-e29b-41d4-a716-446655440003',
          '550e8400-e29b-41d4-a716-446655440004',
        ],
      };

      const mockGroup = {
        id: 'group-1',
        name: 'Team Alpha',
        created_at: new Date().toISOString(),
      };

      const mockCompleteGroup = {
        ...mockGroup,
        members: groupData.member_ids.map((id, idx) => ({
          id: `member-${idx}`,
          player_id: id,
          joined_at: new Date().toISOString(),
          player: { id, name: `Player ${idx}` },
        })),
      };

      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        callCount++;
        if (table === 'groups') {
          if (callCount === 1) {
            // First call: create group
            return createMockChain({ data: mockGroup, error: null });
          }
          // Third call: fetch complete group
          return createMockChain({ data: mockCompleteGroup, error: null });
        }
        // Second call: add members
        return createMockChain({ data: null, error: null });
      });

      const request = new NextRequest('http://localhost:3000/api/groups', {
        method: 'POST',
        body: JSON.stringify(groupData),
      });

      const response = await createGroup(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.name).toBe('Team Alpha');
      expect(data.id).toBeDefined();
    });

    it('should create a group with minimum 2 members', async () => {
      const groupData = {
        name: 'Duo Team',
        member_ids: [
          '550e8400-e29b-41d4-a716-446655440001',
          '550e8400-e29b-41d4-a716-446655440002',
        ],
      };

      const mockGroup = {
        id: 'group-2',
        name: 'Duo Team',
        created_at: new Date().toISOString(),
      };

      const mockCompleteGroup = {
        ...mockGroup,
        members: groupData.member_ids.map((id, idx) => ({
          id: `member-${idx}`,
          player_id: id,
          joined_at: new Date().toISOString(),
          player: { id, name: `Player ${idx}` },
        })),
      };

      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        callCount++;
        if (table === 'groups') {
          if (callCount === 1) {
            return createMockChain({ data: mockGroup, error: null });
          }
          return createMockChain({ data: mockCompleteGroup, error: null });
        }
        return createMockChain({ data: null, error: null });
      });

      const request = new NextRequest('http://localhost:3000/api/groups', {
        method: 'POST',
        body: JSON.stringify(groupData),
      });

      const response = await createGroup(request);
      expect(response.status).toBe(201);
    });

    it('should reject group with less than 2 members', async () => {
      const groupData = {
        name: 'Solo Team',
        member_ids: ['550e8400-e29b-41d4-a716-446655440001'],
      };

      const request = new NextRequest('http://localhost:3000/api/groups', {
        method: 'POST',
        body: JSON.stringify(groupData),
      });

      const response = await createGroup(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('between 2 and 4 members');
    });

    it('should reject group with more than 4 members', async () => {
      const groupData = {
        name: 'Oversized Team',
        member_ids: [
          '550e8400-e29b-41d4-a716-446655440001',
          '550e8400-e29b-41d4-a716-446655440002',
          '550e8400-e29b-41d4-a716-446655440003',
          '550e8400-e29b-41d4-a716-446655440004',
          '550e8400-e29b-41d4-a716-446655440005',
        ],
      };

      const request = new NextRequest('http://localhost:3000/api/groups', {
        method: 'POST',
        body: JSON.stringify(groupData),
      });

      const response = await createGroup(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('between 2 and 4 members');
    });

    it('should reject group without name', async () => {
      const groupData = {
        name: '',
        member_ids: [
          '550e8400-e29b-41d4-a716-446655440001',
          '550e8400-e29b-41d4-a716-446655440002',
        ],
      };

      const request = new NextRequest('http://localhost:3000/api/groups', {
        method: 'POST',
        body: JSON.stringify(groupData),
      });

      const response = await createGroup(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('required');
    });
  });

  describe('POST /api/groups/[id]/members - Add Member', () => {
    it('should add a member to a group with less than 4 members', async () => {
      const groupId = 'group-1';
      const playerId = '550e8400-e29b-41d4-a716-446655440005';

      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        callCount++;
        if (table === 'groups') {
          // Group exists check
          return createMockChain({ data: { id: groupId }, error: null });
        }
        if (table === 'group_members') {
          if (callCount === 2) {
            // Count check - needs .select().eq() chain
            const countChain = {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ count: 3, error: null }),
              }),
            };
            return countChain;
          }
          if (callCount === 3) {
            // Check existing member
            return createMockChain({ data: null, error: null });
          }
          // Insert member
          return createMockChain({
            data: {
              id: 'member-new',
              group_id: groupId,
              player_id: playerId,
              player: { id: playerId, name: 'New Player' },
            },
            error: null,
          });
        }
        return createMockChain({ data: null, error: null });
      });

      const request = new NextRequest(`http://localhost:3000/api/groups/${groupId}/members`, {
        method: 'POST',
        body: JSON.stringify({ player_id: playerId }),
      });

      const response = await addMember(request, { params: { id: groupId } });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.player_id).toBe(playerId);
    });

    it('should reject adding 5th member to a full group', async () => {
      const groupId = 'group-1';
      const playerId = '550e8400-e29b-41d4-a716-446655440005';

      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        callCount++;
        if (table === 'groups') {
          return createMockChain({ data: { id: groupId }, error: null });
        }
        if (table === 'group_members') {
          // Count check returns 4 - needs .select().eq() chain
          const countChain = {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ count: 4, error: null }),
            }),
          };
          return countChain;
        }
        return createMockChain({ data: null, error: null });
      });

      const request = new NextRequest(`http://localhost:3000/api/groups/${groupId}/members`, {
        method: 'POST',
        body: JSON.stringify({ player_id: playerId }),
      });

      const response = await addMember(request, { params: { id: groupId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('full');
    });
  });

  describe('DELETE /api/groups/[id]/members - Remove Member', () => {
    it('should remove a member from a group with more than 2 members', async () => {
      const groupId = 'group-1';
      const playerId = '550e8400-e29b-41d4-a716-446655440003';

      mockFrom.mockImplementation(() => {
        const eqChain = {
          eq: vi.fn().mockResolvedValue({ error: null }),
        };
        const countChain = {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 3, error: null }),
          }),
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue(eqChain),
          }),
        };
        return countChain;
      });

      const request = new NextRequest(
        `http://localhost:3000/api/groups/${groupId}/members?playerId=${playerId}`,
        { method: 'DELETE' }
      );

      const response = await removeMember(request, { params: { id: groupId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should reject removing member from group with only 2 members', async () => {
      const groupId = 'group-1';
      const playerId = '550e8400-e29b-41d4-a716-446655440001';

      mockFrom.mockImplementation(() => {
        const countChain = {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 2, error: null }),
          }),
        };
        return countChain;
      });

      const request = new NextRequest(
        `http://localhost:3000/api/groups/${groupId}/members?playerId=${playerId}`,
        { method: 'DELETE' }
      );

      const response = await removeMember(request, { params: { id: groupId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('at least 2 members');
    });
  });

  describe('DELETE /api/groups/[id] - Delete Group', () => {
    it('should delete a group not in active queue', async () => {
      const groupId = 'group-1';

      mockFrom.mockImplementation((table: string) => {
        if (table === 'queue') {
          return createMockChain({ data: [], error: null });
        }
        if (table === 'groups') {
          return createMockChain({ error: null });
        }
        return createMockChain({ data: null, error: null });
      });

      const request = new NextRequest(`http://localhost:3000/api/groups/${groupId}`, {
        method: 'DELETE',
      });

      const response = await deleteGroup(request, { params: { id: groupId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should reject deleting group in active queue', async () => {
      const groupId = 'group-1';

      mockFrom.mockImplementation((table: string) => {
        if (table === 'queue') {
          return createMockChain({ data: [{ id: 'queue-1' }], error: null });
        }
        return createMockChain({ data: null, error: null });
      });

      const request = new NextRequest(`http://localhost:3000/api/groups/${groupId}`, {
        method: 'DELETE',
      });

      const response = await deleteGroup(request, { params: { id: groupId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('in the queue');
    });
  });

  describe('GET /api/groups/[id] - Get Group Details', () => {
    it('should return group with member details', async () => {
      const groupId = 'group-1';

      mockFrom.mockImplementation(() => {
        return createMockChain({
          data: {
            id: groupId,
            name: 'Team Alpha',
            created_at: new Date().toISOString(),
            members: [
              {
                id: 'member-1',
                player_id: '550e8400-e29b-41d4-a716-446655440001',
                joined_at: new Date().toISOString(),
                player: {
                  id: '550e8400-e29b-41d4-a716-446655440001',
                  name: 'Alice',
                  skill_level: 'beginner',
                  gender: 'female',
                },
              },
              {
                id: 'member-2',
                player_id: '550e8400-e29b-41d4-a716-446655440002',
                joined_at: new Date().toISOString(),
                player: {
                  id: '550e8400-e29b-41d4-a716-446655440002',
                  name: 'Bob',
                  skill_level: 'beginner',
                  gender: 'male',
                },
              },
            ],
          },
          error: null,
        });
      });

      const request = new NextRequest(`http://localhost:3000/api/groups/${groupId}`, {
        method: 'GET',
      });

      const response = await getGroup(request, { params: { id: groupId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe(groupId);
      expect(data.name).toBe('Team Alpha');
      expect(data.member_count).toBe(2);
      expect(data.members).toHaveLength(2);
      expect(data.members[0].player.name).toBe('Alice');
    });

    it('should return 500 for database error', async () => {
      const groupId = 'non-existent';

      mockFrom.mockImplementation(() => {
        return createMockChain({
          data: null,
          error: { message: 'Not found' },
        });
      });

      const request = new NextRequest(`http://localhost:3000/api/groups/${groupId}`, {
        method: 'GET',
      });

      const response = await getGroup(request, { params: { id: groupId } });

      expect(response.status).toBe(500);
    });
  });
});
