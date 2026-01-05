import { BuildingType, Court, QueueEntryWithPlayer, Player, SkillLevel, Building } from '@/types';

export interface BuildingAssignmentResult {
  building: BuildingType;
  reason: string;
}

interface BuildingScore {
  building: BuildingType;
  score: number;
}

/**
 * Smart building assignment algorithm that:
 * 1. Only assigns to active (enabled) buildings
 * 2. Prioritizes completing matches for friend groups
 * 3. Looks for near-complete matches to speed up matchmaking
 * 4. Balances queue length and court availability
 * 5. Keeps group members together
 */
export class BuildingAssignmentEngine {
  private buildings: BuildingType[];

  constructor(
    private queue: QueueEntryWithPlayer[],
    private courts: Court[],
    activeBuildings?: Building[]
  ) {
    // Only use active buildings, or all buildings if activeBuildings not provided
    if (activeBuildings && activeBuildings.length > 0) {
      this.buildings = activeBuildings
        .filter(b => b.is_active)
        .map(b => b.id as BuildingType);

      // If no buildings are active, throw an error
      if (this.buildings.length === 0) {
        throw new Error('No active buildings available. All buildings are currently closed.');
      }
    } else {
      // Fallback to all buildings if buildings data not provided
      this.buildings = ['building_a', 'building_b', 'building_c'];
    }
  }

  /**
   * Assign building for one or more players (solo or group)
   */
  assignBuilding(players: Player[], isGroup: boolean): BuildingAssignmentResult {
    const groupSize = players.length;
    const skillLevel = players[0].skill_level;

    // CASE 1: Group of 4 - Instant match!
    if (isGroup && groupSize === 4) {
      const building = this.getBuildingWithMostAvailableCourts();
      return { building, reason: 'Complete group of 4 - instant match!' };
    }

    // CASE 2: Group of 3 - Look for 1 compatible solo player
    if (isGroup && groupSize === 3) {
      const match = this.findBuildingForGroupOf3(skillLevel);
      if (match) return match;
    }

    // CASE 3: Group of 2 - Look for another group of 2 OR 2 solos
    if (isGroup && groupSize === 2) {
      const match = this.findBuildingForGroupOf2(skillLevel);
      if (match) return match;
    }

    // CASE 4: Solo player - Check for near-complete matches
    if (!isGroup) {
      const match = this.findBuildingForSoloPlayer(skillLevel);
      if (match) return match;
    }

    // CASE 5: No instant match - Use efficiency score
    return this.calculateBestBuildingByEfficiency(groupSize, skillLevel, isGroup);
  }

  private getBuildingWithMostAvailableCourts(): BuildingType {
    const availableCourts = this.buildings.map(building => ({
      building,
      count: this.courts.filter(c => c.building === building && c.status === 'available').length
    }));

    return availableCourts.sort((a, b) => b.count - a.count)[0].building;
  }

  private findBuildingForGroupOf3(skillLevel: SkillLevel): BuildingAssignmentResult | null {
    for (const building of this.buildings) {
      const buildingQueue = this.getWaitingQueueForBuilding(building);
      const compatibleSolos = buildingQueue.filter(e =>
        !e.group_id && // Solo players only
        e.player.skill_level === skillLevel
      );

      if (compatibleSolos.length >= 1) {
        return {
          building,
          reason: 'Group of 3 + 1 solo = instant match!'
        };
      }
    }
    return null;
  }

  private findBuildingForGroupOf2(skillLevel: SkillLevel): BuildingAssignmentResult | null {
    for (const building of this.buildings) {
      const buildingQueue = this.getWaitingQueueForBuilding(building);

      // Check for another group of 2 with same skill
      const groupsOf2 = this.findCompleteGroupsInQueue(buildingQueue, 2);
      const compatibleGroup = groupsOf2.find(group =>
        group[0].player.skill_level === skillLevel
      );

      if (compatibleGroup) {
        return {
          building,
          reason: 'Two groups of 2 = instant match!'
        };
      }

      // Check for 2 compatible solos
      const compatibleSolos = buildingQueue.filter(e =>
        !e.group_id &&
        e.player.skill_level === skillLevel
      );

      if (compatibleSolos.length >= 2) {
        return {
          building,
          reason: 'Group of 2 + 2 solos = instant match!'
        };
      }
    }
    return null;
  }

  private findBuildingForSoloPlayer(skillLevel: SkillLevel): BuildingAssignmentResult | null {
    for (const building of this.buildings) {
      const buildingQueue = this.getWaitingQueueForBuilding(building);

      // Check for group of 3 waiting (help them complete their match)
      const groupsOf3 = this.findCompleteGroupsInQueue(buildingQueue, 3);
      const compatibleGroup3 = groupsOf3.find(group =>
        group[0].player.skill_level === skillLevel
      );

      if (compatibleGroup3) {
        return {
          building,
          reason: 'Completing group of 3!'
        };
      }

      // Check for 3 compatible solos (form 4-player match)
      const compatibleSolos = buildingQueue.filter(e =>
        !e.group_id &&
        e.player.skill_level === skillLevel
      );

      if (compatibleSolos.length === 3) {
        return {
          building,
          reason: 'Completing 4-player match!'
        };
      }
    }
    return null;
  }

  private calculateBestBuildingByEfficiency(
    groupSize: number,
    skillLevel: SkillLevel,
    isGroup: boolean
  ): BuildingAssignmentResult {
    const scores: BuildingScore[] = this.buildings.map(building => {
      const queueLength = this.getWaitingQueueForBuilding(building).length;
      const availableCourts = this.courts.filter(c =>
        c.building === building && c.status === 'available'
      ).length;

      // Calculate compatibility bonus
      let compatibilityBonus = 0;
      const buildingQueue = this.getWaitingQueueForBuilding(building);

      if (isGroup) {
        if (groupSize === 3) {
          // Need 1 more player
          const compatibleSolos = buildingQueue.filter(e =>
            !e.group_id &&
            e.player.skill_level === skillLevel
          ).length;
          compatibilityBonus = compatibleSolos * 5;
        } else if (groupSize === 2) {
          // Need 2 more players
          const otherGroupsOf2 = this.findCompleteGroupsInQueue(buildingQueue, 2);
          const compatibleSolos = buildingQueue.filter(e =>
            !e.group_id &&
            e.player.skill_level === skillLevel
          ).length;

          compatibilityBonus = (otherGroupsOf2.length * 10) + (compatibleSolos >= 2 ? 8 : 0);
        }
      } else {
        // Solo player - slight bonus for compatible players
        const compatiblePlayers = buildingQueue.filter(e =>
          e.player.skill_level === skillLevel
        ).length;
        compatibilityBonus = compatiblePlayers * 2;
      }

      return {
        building,
        score: (availableCourts * 10) - queueLength + compatibilityBonus
      };
    });

    const best = scores.sort((a, b) => b.score - a.score)[0];
    return {
      building: best.building,
      reason: 'Best balance of courts and queue'
    };
  }

  private getWaitingQueueForBuilding(building: BuildingType): QueueEntryWithPlayer[] {
    return this.queue.filter(e =>
      e.building === building &&
      e.status === 'waiting'
    );
  }

  private findCompleteGroupsInQueue(
    queue: QueueEntryWithPlayer[],
    size: number
  ): QueueEntryWithPlayer[][] {
    const groups: Map<string, QueueEntryWithPlayer[]> = new Map();

    queue.forEach(entry => {
      if (entry.group_id) {
        if (!groups.has(entry.group_id)) {
          groups.set(entry.group_id, []);
        }
        groups.get(entry.group_id)!.push(entry);
      }
    });

    return Array.from(groups.values()).filter(g => g.length === size);
  }
}

/**
 * Helper function to assign building for players
 */
export function assignBuildingForPlayers(
  players: Player[],
  isGroup: boolean,
  queue: QueueEntryWithPlayer[],
  courts: Court[],
  buildings?: Building[]
): BuildingAssignmentResult {
  const engine = new BuildingAssignmentEngine(queue, courts, buildings);
  return engine.assignBuilding(players, isGroup);
}
