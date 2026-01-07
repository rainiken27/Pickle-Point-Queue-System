import { Player } from './player';
import { QueueEntryWithPlayer } from './queue';

export interface MatchSuggestion {
  players: Player[];
  court_id: string;
  priority_score: number;
  factors: MatchFactors;
}

export interface MatchFactors {
  is_friend_group: boolean;
  has_time_urgent_players: boolean;
  skill_compatible: boolean;
  gender_compatible: boolean;
  variety_compliant: boolean;
  relaxed_constraints: string[]; // constraints that were relaxed
}

export interface MatchmakingRequest {
  court_id: string;
}

export interface MatchmakingResult {
  match: MatchSuggestion | null;
  reason?: string; // if no match found
}
