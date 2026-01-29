export type CourtStatus = 'available' | 'occupied' | 'reserved';

export interface Court {
  id: string;
  court_number: number;
  status: CourtStatus;
  court_timer_started_at: string | null;
  current_session_id?: string | null;
  session_start_time?: string | null;
  current_players?: Array<{
    id: string;
    name: string;
    skill_level: number;
    photo_url: string | null;
  }> | null;
  created_at?: string;
  updated_at?: string;
}

export interface ActiveCourt extends Court {
  court_timer_remaining_minutes: number | null;
  court_timer_elapsed_minutes: number | null;
  is_timer_warning: boolean; // true if < 5 min remaining
  is_timer_alert: boolean; // true if < 1 min remaining
}

export interface CourtWithPlayers extends Court {
  players: Array<{
    id: string;
    name: string;
    photo_url: string | null;
  }>;
}

export interface CourtWithSession extends Court {
  session_duration_minutes?: number;
  player_names?: string[];
}
