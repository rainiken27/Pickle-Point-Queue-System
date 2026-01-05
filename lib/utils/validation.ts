import { z } from 'zod';

export const PlayerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Please enter a valid email address'),
  skill_level: z.enum(['beginner', 'novice', 'intermediate', 'advanced']),
  gender: z.enum(['male', 'female', 'other']),
  photo_url: z.string().url().optional().or(z.literal('')),
});

export const PreferencesSchema = z.object({
  player_id: z.string().uuid(),
  skill_level_pref: z.enum(['beginner', 'intermediate_advanced']),
  gender_pref: z.enum(['mens', 'womens', 'mixed', 'random']),
  match_type: z.enum(['solo', 'group']),
});

export const QueueEntrySchema = z.object({
  player_id: z.string().uuid(),
  building: z.enum(['building_a', 'building_b', 'building_c']),
  group_id: z.string().uuid().optional(),
});

export const SessionCompleteSchema = z.object({
  session_id: z.string().uuid(),
  team1_score: z.number().int().min(0).max(30).optional(),
  team2_score: z.number().int().min(0).max(30).optional(),
});

export function validateScores(team1: number, team2: number): boolean {
  // Pickleball: win at 11+ with 2-point margin
  const maxScore = Math.max(team1, team2);
  const minScore = Math.min(team1, team2);

  return maxScore >= 11 && (maxScore - minScore) >= 2;
}
