import { QueueEntryWithPlayer, MatchSuggestion, MatchFactors, BuildingType } from '@/types';
import { supabaseServer as supabase } from '@/lib/supabase/server';

export class MatchmakingEngine {
  /**
   * Generate a match suggestion for a specific court following priority hierarchy:
   * 1. Friend Groups (highest)
   * 2. Time Urgency
   * 3. Skill Level Preference (beginner/novice vs intermediate/advanced)
   * 4. Gender Preference
   * 5. Variety Enforcement
   * 6. Building Assignment
   */
  async generateMatch(
    courtId: string,
    building: BuildingType,
    queueEntries: QueueEntryWithPlayer[]
  ): Promise<MatchSuggestion | null> {
    // Filter queue for this building and waiting status
    const buildingQueue = queueEntries
      .filter(entry => entry.building === building && entry.status === 'waiting')
      .sort((a, b) => a.position - b.position);

    console.log(`[ALGORITHM] ${building}: ${buildingQueue.length} players after filtering`);

    if (buildingQueue.length < 4) {
      console.log(`[ALGORITHM] Not enough players: ${buildingQueue.length} < 4`);
      return null; // Need at least 4 players for a match
    }

    // Try to find a match with all constraints
    let match = await this.findMatchWithConstraints(buildingQueue, courtId, building, []);

    // If no match found, relax constraints progressively
    // Priority: Skill (30pts) > Gender (15pts) > Variety (10pts)
    // Relax lowest priority first: variety → gender → skill (as last resort)
    if (!match) {
      console.log('[ALGORITHM] No match with full constraints, relaxing...');
      const relaxationOrder = ['variety', 'gender', 'skill'];
      for (let i = 0; i < relaxationOrder.length; i++) {
        // Accumulate relaxed constraints progressively
        const relaxedConstraints = relaxationOrder.slice(0, i + 1);
        console.log(`[ALGORITHM] Trying with relaxed: [${relaxedConstraints.join(', ')}]`);
        match = await this.findMatchWithConstraints(
          buildingQueue,
          courtId,
          building,
          relaxedConstraints
        );
        if (match) {
          console.log(`[ALGORITHM] Match found after relaxing: ${relaxedConstraints.join(', ')}`);
          break;
        }
      }
    } else {
      console.log('[ALGORITHM] Match found with full constraints');
    }

    if (!match) {
      console.log('[ALGORITHM] No match found even after relaxing all constraints');
    }

    return match;
  }

  private async findMatchWithConstraints(
    queue: QueueEntryWithPlayer[],
    courtId: string,
    building: BuildingType,
    relaxedConstraints: string[]
  ): Promise<MatchSuggestion | null> {
    // Priority 1: Friend groups (never relaxed)
    const friendGroupMatch = await this.matchFriendGroup(queue);
    if (friendGroupMatch) {
      console.log('[ALGORITHM] Found friend group match');
      return this.createMatchSuggestion(
        friendGroupMatch,
        courtId,
        building,
        { is_friend_group: true },
        relaxedConstraints
      );
    }

    // Priority 2: Time urgency
    const urgentPlayers = await this.getUrgentPlayers(queue);
    console.log(`[ALGORITHM] Urgent players: ${urgentPlayers.length}`);
    if (urgentPlayers.length > 0) {
      // Mix urgent players with non-urgent players to form matches
      // Urgent players get priority but we need 4 total players
      const urgentPlayerIds = urgentPlayers.map(p => p.player_id);
      const nonUrgentPlayers = queue.filter(e => !urgentPlayerIds.includes(e.player_id));
      
      // Create a prioritized list: urgent players first, then non-urgent by queue position
      const prioritizedPlayers = [...urgentPlayers, ...nonUrgentPlayers];
      
      // Try to match from this prioritized list (consider up to 8 players for combinations)
      const match = await this.matchByConstraints(
        prioritizedPlayers.slice(0, Math.min(8, prioritizedPlayers.length)),
        relaxedConstraints
      );
      
      if (match) {
        console.log('[ALGORITHM] Found time-urgent priority match');
        return this.createMatchSuggestion(
          match,
          courtId,
          building,
          { has_time_urgent_players: true },
          relaxedConstraints
        );
      }
    }

    // Priority 3-5: Standard matching (skill, gender, variety)
    console.log(`[ALGORITHM] Trying standard match with top ${Math.min(queue.length, 8)} players`);
    const standardMatch = await this.matchByConstraints(
      queue.slice(0, 8), // Consider top 8 in queue
      relaxedConstraints
    );

    if (standardMatch) {
      console.log('[ALGORITHM] Found standard match');
      return this.createMatchSuggestion(
        standardMatch,
        courtId,
        building,
        {},
        relaxedConstraints
      );
    }

    console.log('[ALGORITHM] No match in findMatchWithConstraints');
    return null;
  }

  private async matchFriendGroup(queue: QueueEntryWithPlayer[]): Promise<QueueEntryWithPlayer[] | null> {
    console.log('[FRIEND_GROUP] Checking for friend groups...');
    console.log('[FRIEND_GROUP] Queue entries:', queue.map(e => ({ 
      name: e.player?.name, 
      group_id: e.group_id, 
      position: e.position 
    })));

    // Find groups of 4
    const groupsOf4 = this.findCompleteGroups(queue, 4);
    console.log('[FRIEND_GROUP] Groups of 4 found:', groupsOf4.length);
    if (groupsOf4.length > 0) {
      console.log('[FRIEND_GROUP] Returning group of 4:', groupsOf4[0].map(e => e.player?.name));
      return groupsOf4[0];
    }

    // Find groups of 3 + 1 solo
    const groupsOf3 = this.findCompleteGroups(queue, 3);
    console.log('[FRIEND_GROUP] Groups of 3 found:', groupsOf3.length);
    if (groupsOf3.length > 0) {
      const soloPlayers = queue.filter(e => !e.group_id);
      console.log('[FRIEND_GROUP] Solo players available:', soloPlayers.length);
      if (soloPlayers.length > 0) {
        console.log('[FRIEND_GROUP] Returning group of 3 + 1 solo');
        return [...groupsOf3[0], soloPlayers[0]];
      }
    }

    // Find groups of 2 + 2
    const groupsOf2 = this.findCompleteGroups(queue, 2);
    console.log('[FRIEND_GROUP] Groups of 2 found:', groupsOf2.length);
    if (groupsOf2.length >= 2) {
      console.log('[FRIEND_GROUP] Returning two groups of 2');
      return [...groupsOf2[0], ...groupsOf2[1]];
    }

    // Find group of 2 + 2 solo
    if (groupsOf2.length > 0) {
      const soloPlayers = queue.filter(e => !e.group_id);
      if (soloPlayers.length >= 2) {
        console.log('[FRIEND_GROUP] Returning group of 2 + 2 solos');
        return [...groupsOf2[0], ...soloPlayers.slice(0, 2)];
      }
    }

    console.log('[FRIEND_GROUP] No friend group matches found');
    return null;
  }

  private findCompleteGroups(queue: QueueEntryWithPlayer[], size: number): QueueEntryWithPlayer[][] {
    const groups: Map<string, QueueEntryWithPlayer[]> = new Map();

    console.log(`[FIND_GROUPS] Looking for groups of size ${size}`);
    queue.forEach(entry => {
      if (entry.group_id) {
        console.log(`[FIND_GROUPS] Player ${entry.player?.name} has group_id: ${entry.group_id}`);
        if (!groups.has(entry.group_id)) {
          groups.set(entry.group_id, []);
        }
        groups.get(entry.group_id)!.push(entry);
      } else {
        console.log(`[FIND_GROUPS] Player ${entry.player?.name} has no group_id (solo)`);
      }
    });

    const completeGroups = Array.from(groups.values()).filter(g => g.length === size);
    console.log(`[FIND_GROUPS] Found ${completeGroups.length} complete groups of size ${size}`);
    completeGroups.forEach((group, index) => {
      console.log(`[FIND_GROUPS] Group ${index + 1}:`, group.map(e => e.player?.name));
    });

    return completeGroups;
  }

  private async getUrgentPlayers(queue: QueueEntryWithPlayer[]): Promise<QueueEntryWithPlayer[]> {
    // Get players with active sessions < 30 min remaining
    const playerIds = queue.map(e => e.player_id);

    const { data: sessions } = await supabase
      .from('sessions')
      .select('player_id, start_time')
      .in('player_id', playerIds)
      .eq('status', 'active');

    const urgentPlayerIds = (sessions || [])
      .filter(session => {
        const elapsed = Date.now() - new Date(session.start_time).getTime();
        const remaining = 300 * 60 * 1000 - elapsed; // 5 hours in ms
        return remaining < 30 * 60 * 1000; // < 30 minutes
      })
      .map(s => s.player_id);

    return queue
      .filter(e => urgentPlayerIds.includes(e.player_id))
      .sort((a, b) => {
        // Sort by least time remaining first
        const aSession = sessions?.find(s => s.player_id === a.player_id);
        const bSession = sessions?.find(s => s.player_id === b.player_id);
        if (!aSession || !bSession) return 0;
        return new Date(aSession.start_time).getTime() - new Date(bSession.start_time).getTime();
      });
  }

  private async matchByConstraints(
    players: QueueEntryWithPlayer[],
    relaxedConstraints: string[]
  ): Promise<QueueEntryWithPlayer[] | null> {
    console.log(`[ALGORITHM] matchByConstraints: ${players.length} players, relaxed: [${relaxedConstraints.join(', ')}]`);

    // Try all combinations of 4 players
    let attemptCount = 0;
    for (let i = 0; i < players.length - 3; i++) {
      for (let j = i + 1; j < players.length - 2; j++) {
        for (let k = j + 1; k < players.length - 1; k++) {
          for (let l = k + 1; l < players.length; l++) {
            attemptCount++;
            const match = [players[i], players[j], players[k], players[l]];

            const isValid = await this.validateMatch(match, relaxedConstraints);
            if (isValid) {
              console.log(`[ALGORITHM] Found valid match after ${attemptCount} attempts`);
              return match;
            }
          }
        }
      }
    }

    console.log(`[ALGORITHM] No valid match after ${attemptCount} attempts`);
    return null;
  }

  private async validateMatch(
    players: QueueEntryWithPlayer[],
    relaxedConstraints: string[]
  ): Promise<boolean> {
    const playerNames = players.map(p => p.player?.name || 'unknown').join(', ');

    // Skill level PREFERENCE check (highest priority after groups/urgency)
    if (!relaxedConstraints.includes('skill')) {
      const isSkillCompatible = await this.checkSkillLevelPreferenceCompatibility(players);
      if (!isSkillCompatible) {
        console.log(`[VALIDATE] FAILED skill check: ${playerNames}`);
        return false;
      }
    }

    // Gender preference check (second priority)
    if (!relaxedConstraints.includes('gender')) {
      const isGenderCompatible = await this.checkGenderCompatibility(players);
      if (!isGenderCompatible) {
        console.log(`[VALIDATE] FAILED gender check: ${playerNames}`);
        return false;
      }
    }

    // Variety enforcement (lowest priority)
    if (!relaxedConstraints.includes('variety')) {
      const isVarietyCompliant = await this.checkVarietyCompliance(players);
      if (!isVarietyCompliant) {
        console.log(`[VALIDATE] FAILED variety check: ${playerNames}`);
        return false;
      }
    }

    console.log(`[VALIDATE] PASSED all checks: ${playerNames}`);
    return true;
  }

  private async checkSkillLevelPreferenceCompatibility(players: QueueEntryWithPlayer[]): Promise<boolean> {
    // Fetch preferences for all players
    const { data: prefs } = await supabase
      .from('player_preferences')
      .select('player_id, skill_level_pref')
      .in('player_id', players.map(p => p.player_id));

    if (!prefs || prefs.length === 0) return true;

    // Map each player to their skill level group (beginner/novice -> 'beginner', intermediate/advanced -> 'intermediate_advanced')
    const playerSkillGroups = players.map(p => {
      const skillLevel = p.player.skill_level;
      if (skillLevel === 'beginner' || skillLevel === 'novice') {
        return 'beginner';
      }
      return 'intermediate_advanced';
    });

    // Check if all players' preferences are compatible with the actual skill composition
    for (const pref of prefs) {
      const playerIndex = players.findIndex(p => p.player_id === pref.player_id);
      if (playerIndex === -1) continue;

      const wantedSkillGroup = pref.skill_level_pref;

      // Check if this player's preference matches the group composition
      // For beginner preference: all players should be beginner/novice
      // For intermediate_advanced preference: all players should be intermediate/advanced
      const allPlayersMatchPreference = playerSkillGroups.every(group => group === wantedSkillGroup);

      if (!allPlayersMatchPreference) return false;
    }

    return true;
  }

  private async checkGenderCompatibility(players: QueueEntryWithPlayer[]): Promise<boolean> {
    // Fetch preferences for all players
    const { data: prefs } = await supabase
      .from('player_preferences')
      .select('player_id, gender_pref')
      .in('player_id', players.map(p => p.player_id));

    if (!prefs || prefs.length === 0) {
      console.log('[GENDER] No preferences found, allowing match');
      return true;
    }

    const genders = players.map(p => p.player.gender);
    const maleCount = genders.filter(g => g === 'male').length;
    const femaleCount = genders.filter(g => g === 'female').length;

    console.log(`[GENDER] Checking: ${players.map(p => `${p.player.name}(${p.player.gender})`).join(', ')}`);
    console.log(`[GENDER] Counts: ${maleCount}M / ${femaleCount}F`);
    console.log(`[GENDER] Preferences: ${prefs.map(p => p.gender_pref).join(', ')}`);

    for (const pref of prefs) {
      if (pref.gender_pref === 'mens' && femaleCount > 0) {
        console.log(`[GENDER] REJECT: Player wants mens match but has ${femaleCount} females`);
        return false;
      }
      if (pref.gender_pref === 'womens' && maleCount > 0) {
        console.log(`[GENDER] REJECT: Player wants womens match but has ${maleCount} males`);
        return false;
      }
      if (pref.gender_pref === 'mixed' && (maleCount === 0 || femaleCount === 0)) {
        console.log(`[GENDER] REJECT: Player wants mixed but composition is all same gender`);
        return false;
      }
    }

    console.log('[GENDER] PASS: All gender preferences satisfied');
    return true;
  }

  private async checkVarietyCompliance(players: QueueEntryWithPlayer[]): Promise<boolean> {
    // Check if any players have played together in last 3 sessions
    console.log(`[VARIETY] Checking: ${players.map(p => p.player.name).join(', ')}`);

    for (const player of players) {
      const { data: recentOpponents } = await supabase
        .rpc('get_recent_opponents', {
          p_player_id: player.player_id,
          p_limit: 3,
        });

      if (recentOpponents && recentOpponents.length > 0) {
        console.log(`[VARIETY] ${player.player.name} recent opponents: ${recentOpponents.length}`);
        const otherPlayerIds = players
          .filter(p => p.player_id !== player.player_id)
          .map(p => p.player_id);

        const hasRecentOpponent = otherPlayerIds.some(id => recentOpponents.includes(id));
        if (hasRecentOpponent) {
          console.log(`[VARIETY] REJECT: ${player.player.name} played with someone in this group recently`);
          return false;
        }
      }
    }

    console.log('[VARIETY] PASS: No recent opponents in this group');
    return true;
  }

  private createMatchSuggestion(
    players: QueueEntryWithPlayer[],
    courtId: string,
    building: BuildingType,
    extraFactors: Partial<MatchFactors>,
    relaxedConstraints: string[]
  ): MatchSuggestion {
    const factors: MatchFactors = {
      is_friend_group: extraFactors.is_friend_group || false,
      has_time_urgent_players: extraFactors.has_time_urgent_players || false,
      skill_compatible: !relaxedConstraints.includes('skill'),
      gender_compatible: !relaxedConstraints.includes('gender'),
      variety_compliant: !relaxedConstraints.includes('variety'),
      relaxed_constraints: relaxedConstraints,
    };

    // Calculate priority score (reflects hierarchy)
    let priorityScore = 0;
    if (factors.is_friend_group) priorityScore += 100;          // Highest priority
    if (factors.has_time_urgent_players) priorityScore += 50;   // Second priority
    if (factors.skill_compatible) priorityScore += 30;          // Third priority (skill preference)
    if (factors.gender_compatible) priorityScore += 15;         // Fourth priority
    if (factors.variety_compliant) priorityScore += 10;         // Fifth priority

    // Extract player objects and validate
    const extractedPlayers = players.map(p => p.player).filter(p => p && p.id);

    if (extractedPlayers.length !== 4) {
      console.error('Invalid player data in queue entries:', players);
      throw new Error(`Invalid player data: Expected 4 players, got ${extractedPlayers.length}`);
    }

    return {
      players: extractedPlayers,
      court_id: courtId,
      building,
      priority_score: priorityScore,
      factors,
    };
  }
}

export const matchmakingEngine = new MatchmakingEngine();
