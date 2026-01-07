import { Player } from './player';

export type QueueStatus = 'waiting' | 'called' | 'playing';

export interface QueueEntry {
  id: string;
  player_id: string;
  group_id: string | null;
  position: number;
  status: QueueStatus;
  joined_at: string;
  estimated_wait_minutes: number | null;
  court_id?: string | null;
}

export interface QueueEntryWithPlayer extends QueueEntry {
  player: Player;
}

export interface NewQueueEntry {
  player_id: string;
  group_id?: string;
}

export interface QueueGroup {
  group_id: string;
  players: QueueEntryWithPlayer[];
  position: number;
  estimated_wait_minutes: number | null;
}
