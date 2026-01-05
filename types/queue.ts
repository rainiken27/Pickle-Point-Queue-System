import { BuildingType } from './session';
import { Player } from './player';

export type QueueStatus = 'waiting' | 'called' | 'playing';

export interface QueueEntry {
  id: string;
  player_id: string;
  group_id: string | null;
  position: number;
  building: BuildingType;
  status: QueueStatus;
  joined_at: string;
  estimated_wait_minutes: number | null;
}

export interface QueueEntryWithPlayer extends QueueEntry {
  player: Player;
}

export interface NewQueueEntry {
  player_id: string;
  group_id?: string;
  building: BuildingType;
}

export interface QueueGroup {
  group_id: string;
  players: QueueEntryWithPlayer[];
  position: number;
  building: BuildingType;
  estimated_wait_minutes: number | null;
}
