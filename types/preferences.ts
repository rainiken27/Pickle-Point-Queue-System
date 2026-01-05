// Skill level preference groups players into 2 categories for matching
// 'beginner' matches with beginner OR novice players
// 'intermediate_advanced' matches with intermediate OR advanced players
export type SkillLevelPreference = 'beginner' | 'intermediate_advanced';

export type GenderPreference = 'mens' | 'womens' | 'mixed' | 'random';
export type MatchType = 'solo' | 'group';

export interface PlayerPreferences {
  id: string;
  player_id: string;
  skill_level_pref: SkillLevelPreference;
  gender_pref: GenderPreference;
  match_type: MatchType;
  updated_at: string;
}

export interface NewPlayerPreferences {
  player_id: string;
  skill_level_pref: SkillLevelPreference;
  gender_pref: GenderPreference;
  match_type: MatchType;
}
