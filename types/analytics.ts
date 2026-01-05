import { BuildingType } from './session';

export interface CourtUtilization {
  court_number: number;
  building: BuildingType;
  utilization_percentage: number;
  total_sessions: number;
  average_duration_minutes: number;
}

export interface BuildingLoadVariance {
  building: BuildingType;
  queue_depth: number;
  utilization_percentage: number;
  average_wait_minutes: number;
}

export interface PeakHourData {
  hour: number;
  check_ins: number;
  average_queue_depth: number;
  average_wait_minutes: number;
  is_peak: boolean;
}

export interface PlayerInsights {
  average_session_duration_minutes: number;
  return_rate_percentage: number;
  average_games_per_visit: number;
  skill_level_distribution: {
    beginner: number;
    intermediate_advanced: number;
  };
  gender_preference_distribution: {
    mens: number;
    womens: number;
    mixed: number;
    random: number;
  };
}

export interface DailyStats {
  total_sessions: number;
  total_players: number;
  average_duration_minutes: number;
  current_waiting: number;
}
