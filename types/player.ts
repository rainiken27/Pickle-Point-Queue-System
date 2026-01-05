import { Session } from './session';
import { PlayerPreferences } from './preferences';

// Actual skill levels stored in database
export type SkillLevel = 'beginner' | 'novice' | 'intermediate' | 'advanced';
export type GenderType = 'male' | 'female' | 'other';

export interface Player {
  id: string;
  qr_uuid: string;
  name: string;
  photo_url: string | null;
  skill_level: SkillLevel;
  gender: GenderType;
  created_at: string;
  updated_at: string;
}

export interface PlayerProfile extends Player {
  current_session?: Session;
  preferences?: PlayerPreferences;
}

export interface NewPlayer {
  name: string;
  skill_level: SkillLevel;
  gender: GenderType;
  photo_url?: string;
}
