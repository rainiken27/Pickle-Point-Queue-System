// Player statistics types

export type WinningTeam = 'team_a' | 'team_b' | 'tie' | 'incomplete';

export interface PlayerStats {
  id: string;
  player_id: string;
  lifetime_wins: number;
  lifetime_games_played: number;
  updated_at: string;
  created_at: string;
}

export interface PlayerStatsYearly {
  id: string;
  player_id: string;
  year: number;
  wins: number;
  games_played: number;
  updated_at: string;
  created_at: string;
}

export interface MatchHistory {
  id: string;
  court_id: string;
  team_a_player_1_id: string;
  team_a_player_2_id: string;
  team_b_player_1_id: string;
  team_b_player_2_id: string;
  team_a_score: number | null;
  team_b_score: number | null;
  winning_team: WinningTeam;
  played_at: string;
  played_date: string;
  created_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  player_id: string;
  player_name: string;
  photo_url: string | null;
  lifetime_wins: number;
  lifetime_games_played: number;
}

export interface CreateMatchRequest {
  court_id: string;
  team_a_player_1_id: string;
  team_a_player_2_id: string;
  team_b_player_1_id: string;
  team_b_player_2_id: string;
  team_a_score?: number;
  team_b_score?: number;
  winning_team: WinningTeam;
}
