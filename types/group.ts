import { Player } from './player';

export interface Group {
  id: string;
  name: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  player_id: string;
  joined_at: string;
}

export interface GroupWithMembers extends Group {
  members: Player[];
  member_count: number;
}

export interface NewGroup {
  name: string;
  member_ids: string[];
}
