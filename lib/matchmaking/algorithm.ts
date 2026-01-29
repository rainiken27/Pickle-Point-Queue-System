import { QueueEntryWithPlayer, MatchSuggestion, MatchFactors } from '@/types';
import { supabaseServer as supabase } from '@/lib/supabase/server';

export class MatchmakingEngine {
  /**
   * Generate match suggestions for all available courts:
   * 1. Time Urgency (players with <15 min remaining get priority)
   * 2. Solo Protection with Group Efficiency:
   *    - Groups NEVER get broken up (absolute rule)
   *    - Groups can play early IF there are enough courts to guarantee solo players won't be delayed
   *    - Strict queue order when court availability is limited, but respecting group integrity
   * 3. Group-Aware Queue Processing (never break groups)
   * 
   * Skill level and gender preferences are ignored - display only.
   */
  async generateMatches(
    availableCourts: string[],
    queueEntries: QueueEntryWithPlayer[]
  ): Promise<MatchSuggestion[]> {
    const matches: MatchSuggestion[] = [];
    let remainingQueue = [...queueEntries]
      .filter(entry => entry.status === 'waiting')
      .sort((a, b) => a.position - b.position);

    console.log(`[ALGORITHM] ${remainingQueue.length} players in queue, ${availableCourts.length} courts available`);

    for (const courtId of availableCourts) {
      if (remainingQueue.length < 4) {
        console.log(`[ALGORITHM] Not enough players remaining: ${remainingQueue.length} < 4`);
        break;
      }

      const match = await this.generateSingleMatch(courtId, remainingQueue, availableCourts.length - matches.length);
      if (match) {
        matches.push(match);
        // Remove matched players from remaining queue
        const matchedPlayerIds = match.players.map(p => p.id);
        remainingQueue = remainingQueue.filter(entry => !matchedPlayerIds.includes(entry.player_id));
      }
    }

    return matches;
  }

  /**
   * Generate a match suggestion for a specific court with remaining court availability context
   */
  private async generateSingleMatch(
    courtId: string,
    queueEntries: QueueEntryWithPlayer[],
    remainingCourts: number
  ): Promise<MatchSuggestion | null> {
    console.log(`[ALGORITHM] ${queueEntries.length} players in queue for court ${courtId}, ${remainingCourts} courts remaining`);

    if (queueEntries.length < 4) {
      console.log(`[ALGORITHM] Not enough players: ${queueEntries.length} < 4`);
      return null;
    }

    // Priority 1: Time urgency (players with <30 min remaining)
    const urgentPlayers = await this.getUrgentPlayers(queueEntries);
    if (urgentPlayers.length > 0) {
      console.log(`[ALGORITHM] Found ${urgentPlayers.length} urgent players`);
      
      // Mix urgent players with non-urgent to form a match
      const urgentPlayerIds = urgentPlayers.map(p => p.player_id);
      const nonUrgentPlayers = queueEntries.filter(e => !urgentPlayerIds.includes(e.player_id));
      
      // Prioritize urgent players, then fill with earliest non-urgent
      const prioritizedPlayers = [...urgentPlayers, ...nonUrgentPlayers];
      const urgentMatch = prioritizedPlayers.slice(0, 4);
      
      console.log('[ALGORITHM] Using urgent priority match:', urgentMatch.map(p => p.player?.name));
      return this.createMatchSuggestion(
        urgentMatch,
        courtId,
        { has_time_urgent_players: true }
      );
    }

    // Priority 2: Solo Protection with Group Efficiency
    const groupOptimizedMatch = this.findGroupOptimizedMatch(queueEntries, remainingCourts);
    if (groupOptimizedMatch) {
      console.log('[ALGORITHM] Using group-optimized match:', groupOptimizedMatch.map(p => p.player?.name));
      return this.createMatchSuggestion(
        groupOptimizedMatch,
        courtId,
        { is_friend_group: this.hasCompleteGroup(groupOptimizedMatch) }
      );
    }

    // Priority 3: Group-aware queue processing (never break groups)
    const groupAwareMatch = this.findGroupAwareMatch(queueEntries);
    if (groupAwareMatch) {
      console.log('[ALGORITHM] Using group-aware match:', groupAwareMatch.map(p => p.player?.name));
      return this.createMatchSuggestion(
        groupAwareMatch,
        courtId,
        { is_friend_group: this.hasCompleteGroup(groupAwareMatch) }
      );
    }

    // If we can't form any match without breaking groups, return null
    console.log('[ALGORITHM] Cannot form match without breaking groups');
    return null;
  }

  /**
   * Find the optimal match considering group efficiency and solo protection
   */
  private findGroupOptimizedMatch(
    queueEntries: QueueEntryWithPlayer[],
    remainingCourts: number
  ): QueueEntryWithPlayer[] | null {
    // Analyze queue structure
    const queueAnalysis = this.analyzeQueue(queueEntries);
    
    // Check if we can allow groups to play early without delaying solo players
    for (const group of queueAnalysis.groups) {
      if (this.canGroupPlayEarly(group, queueAnalysis.solos, remainingCourts)) {
        // Find the best match that includes this group
        const match = this.buildMatchWithGroup(group, queueEntries);
        if (match && match.length === 4) {
          return match;
        }
      }
    }

    // No group optimization possible, use group-aware matching
    return null;
  }

  /**
   * Analyze the queue to identify groups and solo players
   */
  private analyzeQueue(queueEntries: QueueEntryWithPlayer[]) {
    const groups: { groupId: string; members: QueueEntryWithPlayer[]; startPosition: number }[] = [];
    const solos: QueueEntryWithPlayer[] = [];
    const groupMap = new Map<string, QueueEntryWithPlayer[]>();

    // Group players by group_id
    for (const entry of queueEntries) {
      if (entry.group_id) {
        if (!groupMap.has(entry.group_id)) {
          groupMap.set(entry.group_id, []);
        }
        groupMap.get(entry.group_id)!.push(entry);
      } else {
        solos.push(entry);
      }
    }

    // Convert to group analysis format
    for (const [groupId, members] of groupMap) {
      const sortedMembers = members.sort((a, b) => a.position - b.position);
      groups.push({
        groupId,
        members: sortedMembers,
        startPosition: sortedMembers[0].position
      });
    }

    // Sort groups by start position
    groups.sort((a, b) => a.startPosition - b.startPosition);

    return { groups, solos };
  }

  /**
   * Check if a group can play early without delaying solo players
   */
  private canGroupPlayEarly(
    group: { groupId: string; members: QueueEntryWithPlayer[]; startPosition: number },
    allSolos: QueueEntryWithPlayer[],
    remainingCourts: number
  ): boolean {
    // Find solo players ahead of this group
    const solosAhead = allSolos.filter(solo => solo.position < group.startPosition);
    
    // Calculate courts needed for solos ahead
    const courtsNeededForSolos = Math.ceil(solosAhead.length / 4);
    
    // Courts available after this group takes one
    const courtsAfterGroup = remainingCourts - 1;
    
    // Group can play if there are enough courts left for the solos
    const canPlay = courtsAfterGroup >= courtsNeededForSolos;
    
    console.log(`[ALGORITHM] Group at position ${group.startPosition}: ${solosAhead.length} solos ahead, need ${courtsNeededForSolos} courts, ${courtsAfterGroup} courts after group, can play: ${canPlay}`);
    
    return canPlay;
  }

  /**
   * Build a match that includes the specified group
   */
  private buildMatchWithGroup(
    group: { groupId: string; members: QueueEntryWithPlayer[]; startPosition: number },
    queueEntries: QueueEntryWithPlayer[]
  ): QueueEntryWithPlayer[] {
    const match = [...group.members];

    // If this is a complete group of 4, they play together ONLY - don't mix with others
    if (match.length === 4) {
      console.log(`[ALGORITHM] Complete group of 4 (${group.groupId}), playing exclusively together`);
      return match;
    }

    // If group is less than 4, fill with next available players
    if (match.length < 4) {
      const groupPlayerIds = group.members.map(m => m.player_id);
      const availablePlayers = queueEntries
        .filter(entry => !groupPlayerIds.includes(entry.player_id))
        .sort((a, b) => a.position - b.position);

      const playersNeeded = 4 - match.length;
      match.push(...availablePlayers.slice(0, playersNeeded));
    }

    return match.slice(0, 4);
  }

  /**
   * Find a match that respects group integrity (never breaks groups)
   * This should only be used when no group optimization is possible
   */
  private findGroupAwareMatch(queueEntries: QueueEntryWithPlayer[]): QueueEntryWithPlayer[] | null {
    // Build a list of "matchable units" (complete groups or individual solos)
    const matchableUnits = this.buildMatchableUnits(queueEntries);
    
    // Only try to form a match starting from position #1 to maintain queue fairness
    // This ensures we don't skip ahead unless it's through the group optimization logic
    const firstUnit = matchableUnits[0];
    if (!firstUnit) return null;
    
    // Try to form a match starting with the first unit in queue
    return this.combineUnitsToMatchFromFirst(matchableUnits);
  }

  /**
   * Build matchable units (groups that must stay together + individual solos)
   */
  private buildMatchableUnits(queueEntries: QueueEntryWithPlayer[]) {
    const units: { players: QueueEntryWithPlayer[]; startPosition: number; isGroup: boolean }[] = [];
    const processedPlayerIds = new Set<string>();
    
    // Sort by position to process in queue order
    const sortedEntries = [...queueEntries].sort((a, b) => a.position - b.position);
    
    for (const entry of sortedEntries) {
      if (processedPlayerIds.has(entry.player_id)) continue;
      
      if (entry.group_id) {
        // Find all members of this group
        const groupMembers = queueEntries
          .filter(e => e.group_id === entry.group_id)
          .sort((a, b) => a.position - b.position);
        
        units.push({
          players: groupMembers,
          startPosition: groupMembers[0].position,
          isGroup: true
        });
        
        // Mark all group members as processed
        groupMembers.forEach(member => processedPlayerIds.add(member.player_id));
      } else {
        // Solo player
        units.push({
          players: [entry],
          startPosition: entry.position,
          isGroup: false
        });
        
        processedPlayerIds.add(entry.player_id);
      }
    }
    
    // Sort units by their start position
    return units.sort((a, b) => a.startPosition - b.startPosition);
  }

  /**
   * Combine matchable units to form exactly 4 players starting from the first unit
   */
  private combineUnitsToMatchFromFirst(units: { players: QueueEntryWithPlayer[]; startPosition: number; isGroup: boolean }[]): QueueEntryWithPlayer[] | null {
    // Only try starting from the first unit to maintain queue order
    return this.findValidCombination(units, 0);
  }

  /**
   * Find a valid combination of units starting from a given index
   */
  private findValidCombination(
    units: { players: QueueEntryWithPlayer[]; startPosition: number; isGroup: boolean }[],
    startIndex: number
  ): QueueEntryWithPlayer[] | null {
    const result: QueueEntryWithPlayer[] = [];

    for (let i = startIndex; i < units.length && result.length < 4; i++) {
      const unit = units[i];

      // IMPORTANT: If this is a complete group of 4, they should ONLY play together
      // Don't mix them with any other players (solos or other groups)
      if (unit.isGroup && unit.players.length === 4) {
        // Only return this group if we haven't started building a match yet
        if (result.length === 0) {
          console.log(`[ALGORITHM] Complete group of 4 found, playing together exclusively`);
          return unit.players;
        } else {
          // We've already added some players, skip this complete group
          console.log(`[ALGORITHM] Skipping complete group of 4 (already have ${result.length} players)`);
          continue;
        }
      }

      // Check if this unit can fit in the remaining slots
      if (result.length + unit.players.length <= 4) {
        result.push(...unit.players);

        // If we have exactly 4 players, we found a valid match
        if (result.length === 4) {
          return result;
        }
      }
      // If unit doesn't fit, continue to try next unit (don't break)
    }

    // If we have exactly 4 players, return the match
    if (result.length === 4) {
      return result;
    }

    // Not enough players to form a match
    return null;
  }

  /**
   * Check if the match contains a complete group (all 4 players from same group)
   */
  private hasCompleteGroup(players: QueueEntryWithPlayer[]): boolean {
    if (players.length !== 4) return false;
    
    const groupId = players[0].group_id;
    return groupId !== null && players.every(p => p.group_id === groupId);
  }

  /**
   * Generate a match suggestion for a specific court.
   * Always returns the first group from the queue regardless of which court is requested.
   */
  async generateMatch(
    courtId: string,
    queueEntries: QueueEntryWithPlayer[],
    availableCourts: number = 1
  ): Promise<MatchSuggestion | null> {
    return this.generateSingleMatch(courtId, queueEntries, availableCourts);
  }

  /**
   * Generate a singles (1v1) match suggestion
   * Used by court officer for edge cases when courts available but not enough players for doubles
   */
  async generateSinglesMatch(
    courtId: string,
    queueEntries: QueueEntryWithPlayer[]
  ): Promise<MatchSuggestion | null> {
    console.log(`[ALGORITHM] Generating singles match for court ${courtId}`);

    // Filter active queue entries
    const activeQueue = queueEntries.filter(entry => entry.status === 'waiting');

    // Need at least 2 players for singles
    if (activeQueue.length < 2) {
      console.log(`[ALGORITHM] Not enough players for singles: ${activeQueue.length} < 2`);
      return null;
    }

    // Priority 1: Check for time urgent players
    const urgentPlayers = await this.getUrgentPlayers(activeQueue);
    let selectedPlayers: QueueEntryWithPlayer[];
    let hasUrgentPlayers = false;

    if (urgentPlayers.length > 0) {
      console.log(`[ALGORITHM] Found ${urgentPlayers.length} urgent players for singles`);
      // Take up to 2 urgent players, or mix with non-urgent if only 1 urgent
      if (urgentPlayers.length >= 2) {
        selectedPlayers = urgentPlayers.slice(0, 2);
      } else {
        const nonUrgent = activeQueue.filter(e => !urgentPlayers.some(u => u.player_id === e.player_id));
        selectedPlayers = [urgentPlayers[0], nonUrgent[0]];
      }
      hasUrgentPlayers = true;
    } else {
      // Priority 2: Take first 2 players from queue (by position)
      const sortedQueue = activeQueue.sort((a, b) => a.position - b.position);
      selectedPlayers = sortedQueue.slice(0, 2);
    }

    console.log('[ALGORITHM] Singles match players:', selectedPlayers.map(p => p.player?.name));

    return this.createSinglesMatchSuggestion(selectedPlayers, courtId, hasUrgentPlayers);
  }

  /**
   * Create a singles match suggestion
   */
  private createSinglesMatchSuggestion(
    players: QueueEntryWithPlayer[],
    courtId: string,
    hasUrgentPlayers: boolean
  ): MatchSuggestion {
    const factors: MatchFactors = {
      is_friend_group: false, // Singles matches don't involve groups
      has_time_urgent_players: hasUrgentPlayers,
      skill_compatible: true,
      gender_compatible: true,
      variety_compliant: true,
      relaxed_constraints: [],
    };

    // Priority score
    let priorityScore = 50;
    if (hasUrgentPlayers) priorityScore += 100;

    // Extract player objects
    const extractedPlayers = players.map(p => p.player).filter(p => p && p.id);

    if (extractedPlayers.length !== 2) {
      console.error('Invalid player data for singles match:', players);
      throw new Error(`Invalid player data: Expected 2 players for singles, got ${extractedPlayers.length}`);
    }

    return {
      players: extractedPlayers,
      court_id: courtId,
      match_type: 'singles',
      priority_score: priorityScore,
      factors,
    };
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
        return remaining < 15 * 60 * 1000; // < 15 minutes
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

  private createMatchSuggestion(
    players: QueueEntryWithPlayer[],
    courtId: string,
    extraFactors: Partial<MatchFactors>
  ): MatchSuggestion {
    const factors: MatchFactors = {
      is_friend_group: extraFactors.is_friend_group || false,
      has_time_urgent_players: extraFactors.has_time_urgent_players || false,
      skill_compatible: true, // Always true since we ignore skill matching
      gender_compatible: true, // Always true since we ignore gender matching
      variety_compliant: true, // Always true since we ignore variety enforcement
      relaxed_constraints: [], // No constraints to relax
    };

    // Priority score: urgent > friend groups at front > regular queue order
    let priorityScore = 50; // Base score
    if (factors.has_time_urgent_players) priorityScore += 100; // Highest priority
    if (factors.is_friend_group) priorityScore += 25; // Bonus for groups at front

    // Extract player objects and validate
    const extractedPlayers = players.map(p => p.player).filter(p => p && p.id);

    if (extractedPlayers.length !== 4) {
      console.error('Invalid player data in queue entries:', players);
      throw new Error(`Invalid player data: Expected 4 players, got ${extractedPlayers.length}`);
    }

    return {
      players: extractedPlayers,
      court_id: courtId,
      match_type: 'doubles',
      priority_score: priorityScore,
      factors,
    };
  }
}

export const matchmakingEngine = new MatchmakingEngine();