import { SkillLevel } from '@/types';
import { SkillLevelPreference } from '@/types/preferences';

/**
 * Get display label for skill level
 */
export function getSkillLevelLabel(skillLevel: SkillLevel): string {
  const labels: Record<SkillLevel, string> = {
    beginner: 'Beginner',
    novice: 'Novice',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
  };
  return labels[skillLevel];
}

/**
 * Map actual skill level to preference category for matchmaking
 * beginner/novice → 'beginner' preference
 * intermediate/advanced → 'intermediate_advanced' preference
 */
export function skillLevelToPreferenceGroup(skillLevel: SkillLevel): SkillLevelPreference {
  if (skillLevel === 'beginner' || skillLevel === 'novice') {
    return 'beginner';
  }
  return 'intermediate_advanced';
}

/**
 * Check if a player's skill level matches a preference
 */
export function skillLevelMatchesPreference(
  playerSkillLevel: SkillLevel,
  preference: SkillLevelPreference
): boolean {
  const playerGroup = skillLevelToPreferenceGroup(playerSkillLevel);
  return playerGroup === preference;
}
