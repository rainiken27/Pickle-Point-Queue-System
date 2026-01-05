import { BuildingType } from './session';

export type CourtStatus = 'available' | 'occupied';

export interface Court {
  id: string;
  court_number: number;
  building: BuildingType;
  status: CourtStatus;
  current_session_id: string | null;
  session_start_time: string | null;
}

export interface CourtWithSession extends Court {
  session_duration_minutes?: number;
  player_names?: string[];
}
