export type SessionStatus = 'active' | 'completed' | 'expired' | 'grace_period';
export type BuildingType = 'building_a' | 'building_b' | 'building_c';

export interface Session {
  id: string;
  player_id: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  building: BuildingType;
  status: SessionStatus;
  team1_score: number | null;
  team2_score: number | null;
  created_at: string;
}

export interface ActiveSession extends Session {
  remaining_minutes: number;
  elapsed_minutes: number;
  is_time_warning: boolean; // true if < 30 min remaining
  is_urgent: boolean; // true if < 5 min remaining
}

export interface NewSession {
  player_id: string;
  building: BuildingType;
}

export interface CompleteSessionData {
  session_id: string;
  end_time: string;
  team1_score?: number;
  team2_score?: number;
}
