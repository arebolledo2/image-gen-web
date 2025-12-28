import { db } from '@/lib/db';
import { guidance, Guidance, NewGuidance } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { BaseService } from './base.service';

/**
 * Service for managing guidance modifiers with versioning support.
 *
 * Guidance provides additional instructions that can be applied to prompts
 * (e.g., lighting conditions, camera angles, composition rules).
 */
export class GuidanceService extends BaseService<typeof guidance, Guidance, NewGuidance> {
  constructor() {
    super(guidance);
  }

  /**
   * Get all guidance, grouped by guidance family (returns only latest version of each family)
   *
   * @returns Array of latest guidance versions with their version count
   */
  async getLatestGuidance(): Promise<(Guidance & { versionCount: number })[]> {
    const allGuidance = await db.query.guidance.findMany({
      orderBy: [desc(guidance.createdAt)],
    });

    const guidanceMap = new Map<string, Guidance>();
    const versionCounts = new Map<string, number>();

    for (const guide of allGuidance) {
      // Find the root guidance
      let rootId = guide.id;
      let current = guide;

      while (current.parentGuidanceId) {
        const parent = allGuidance.find(g => g.id === current.parentGuidanceId);
        if (!parent) break;
        rootId = parent.id;
        current = parent;
      }

      // Count versions in this family
      const familyVersions = allGuidance.filter(g => {
        let checkId = g.id;
        let checkGuide = g;
        while (checkGuide.parentGuidanceId) {
          const parent = allGuidance.find(p => p.id === checkGuide.parentGuidanceId);
          if (!parent) break;
          checkId = parent.id;
          checkGuide = parent;
        }
        return checkId === rootId;
      });

      versionCounts.set(rootId, familyVersions.length);

      // Keep only the latest version
      const existing = guidanceMap.get(rootId);
      if (!existing || guide.version > existing.version) {
        guidanceMap.set(rootId, guide);
      }
    }

    return Array.from(guidanceMap.values()).map(guide => ({
      ...guide,
      versionCount: versionCounts.get(
        guide.parentGuidanceId ?
          (allGuidance.find(g => {
            let root = guide;
            while (root.parentGuidanceId) {
              const p = allGuidance.find(x => x.id === root.parentGuidanceId);
              if (!p) break;
              root = p;
            }
            return g.id === root.id;
          })?.id || guide.id)
          : guide.id
      ) || 1,
    }));
  }

  /**
   * Get guidance by ID with its lineage (parent and children)
   *
   * @param id - Guidance ID
   * @returns Guidance with parent and child guidance, or undefined if not found
   */
  async getGuidanceWithLineage(id: string) {
    return db.query.guidance.findFirst({
      where: eq(guidance.id, id),
      with: {
        parentGuidance: true,
        childGuidances: {
          orderBy: [desc(guidance.version)],
        },
      },
    });
  }

  /**
   * Get all versions of a guidance family
   *
   * @param guidanceId - Any guidance ID in the family
   * @returns All versions ordered by version number (newest first)
   */
  async getGuidanceVersions(guidanceId: string): Promise<Guidance[]> {
    const guide = await this.findById(guidanceId);
    if (!guide) return [];

    let rootGuide = guide;
    while (rootGuide.parentGuidanceId) {
      const parent = await this.findById(rootGuide.parentGuidanceId);
      if (!parent) break;
      rootGuide = parent;
    }

    const allGuidance = await this.findAll(false);
    const familyGuidance: Guidance[] = [rootGuide];

    const findChildren = (parentId: string) => {
      const children = allGuidance.filter(g => g.parentGuidanceId === parentId);
      for (const child of children) {
        familyGuidance.push(child);
        findChildren(child.id);
      }
    };

    findChildren(rootGuide.id);

    return familyGuidance.sort((a, b) => b.version - a.version);
  }

  /**
   * Create new guidance
   *
   * @param data - Guidance data
   * @returns Created guidance
   */
  async createGuidance(data: {
    name: string;
    description: string;
  }): Promise<Guidance> {
    return this.create({
      name: data.name,
      description: data.description,
      version: 1,
    });
  }

  /**
   * Create a new version of existing guidance
   *
   * @param parentGuidanceId - ID of the parent guidance
   * @param data - Updated guidance data
   * @returns Created guidance version
   */
  async createGuidanceVersion(
    parentGuidanceId: string,
    data: {
      name?: string;
      description?: string;
    }
  ): Promise<Guidance> {
    const parentGuide = await this.findById(parentGuidanceId);
    if (!parentGuide) {
      throw new Error(`Parent guidance ${parentGuidanceId} not found`);
    }

    return this.create({
      name: data.name ?? parentGuide.name,
      description: data.description ?? parentGuide.description,
      parentGuidanceId,
      version: parentGuide.version + 1,
    });
  }

  /**
   * Update existing guidance
   *
   * @param id - Guidance ID
   * @param data - Updated guidance data
   * @returns Updated guidance
   */
  async updateGuidance(
    id: string,
    data: {
      name?: string;
      description?: string;
    }
  ): Promise<Guidance | undefined> {
    return this.update(id, data);
  }

  /**
   * Delete guidance and all its versions
   * WARNING: This will fail if the guidance is referenced by prompts
   *
   * @param id - Guidance ID (any version in the family)
   * @returns Number of deleted guidance entries
   */
  async deleteGuidanceFamily(id: string): Promise<number> {
    return this.transaction(async (tx) => {
      const versions = await this.getGuidanceVersions(id);
      const versionIds = versions.map(v => v.id);

      let deletedCount = 0;
      for (const versionId of versionIds) {
        await tx.delete(guidance).where(eq(guidance.id, versionId));
        deletedCount++;
      }

      return deletedCount;
    });
  }
}

// Export singleton instance
export const guidanceService = new GuidanceService();
