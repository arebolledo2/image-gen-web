import { db } from '@/lib/db';
import { styles, Style, NewStyle } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { BaseService } from './base.service';

/**
 * Service for managing art styles with versioning support.
 *
 * Styles can be versioned by creating child styles that reference a parent.
 * The versioning system allows tracking the evolution of style definitions.
 */
export class StylesService extends BaseService<typeof styles, Style, NewStyle> {
  constructor() {
    super(styles);
  }

  /**
   * Get all styles, grouped by style family (returns only latest version of each family)
   *
   * @param options - Filter options
   * @returns Array of latest style versions with their version count
   */
  async getLatestStyles(options: { favoritesOnly?: boolean } = {}): Promise<(Style & { versionCount: number })[]> {
    const { favoritesOnly } = options;

    // Get all styles ordered by creation date
    const allStyles = await db.query.styles.findMany({
      where: favoritesOnly ? eq(styles.isFavorite, true) : undefined,
      orderBy: [desc(styles.createdAt)],
    });

    // Group by style family (find root parent for each style)
    const styleMap = new Map<string, Style>();
    const versionCounts = new Map<string, number>();

    for (const style of allStyles) {
      // Find the root style (traverse up the parent chain)
      let rootId = style.id;
      let current = style;

      while (current.parentStyleId) {
        const parent = allStyles.find(s => s.id === current.parentStyleId);
        if (!parent) break;
        rootId = parent.id;
        current = parent;
      }

      // Count versions in this family
      const familyVersions = allStyles.filter(s => {
        let checkId = s.id;
        let checkStyle = s;
        while (checkStyle.parentStyleId) {
          const parent = allStyles.find(p => p.id === checkStyle.parentStyleId);
          if (!parent) break;
          checkId = parent.id;
          checkStyle = parent;
        }
        return checkId === rootId;
      });

      versionCounts.set(rootId, familyVersions.length);

      // Keep only the latest version (highest version number)
      const existing = styleMap.get(rootId);
      if (!existing || style.version > existing.version) {
        styleMap.set(rootId, style);
      }
    }

    // Convert to array with version counts
    return Array.from(styleMap.values()).map(style => ({
      ...style,
      versionCount: versionCounts.get(
        style.parentStyleId ?
          (allStyles.find(s => {
            let root = style;
            while (root.parentStyleId) {
              const p = allStyles.find(x => x.id === root.parentStyleId);
              if (!p) break;
              root = p;
            }
            return s.id === root.id;
          })?.id || style.id)
          : style.id
      ) || 1,
    }));
  }

  /**
   * Get a style by ID with its lineage (parent and children)
   *
   * @param id - Style ID
   * @returns Style with parent and child styles, or undefined if not found
   */
  async getStyleWithLineage(id: string) {
    return db.query.styles.findFirst({
      where: eq(styles.id, id),
      with: {
        parentStyle: true,
        childStyles: {
          orderBy: [desc(styles.version)],
        },
      },
    });
  }

  /**
   * Get all versions of a style family
   *
   * @param styleId - Any style ID in the family
   * @returns All versions ordered by version number (newest first)
   */
  async getStyleVersions(styleId: string): Promise<Style[]> {
    // First, find the root style
    const style = await this.findById(styleId);
    if (!style) return [];

    let rootStyle = style;
    while (rootStyle.parentStyleId) {
      const parent = await this.findById(rootStyle.parentStyleId);
      if (!parent) break;
      rootStyle = parent;
    }

    // Get all styles in the family
    const allStyles = await this.findAll(false);
    const familyStyles: Style[] = [rootStyle];

    // Recursively find all children
    const findChildren = (parentId: string) => {
      const children = allStyles.filter(s => s.parentStyleId === parentId);
      for (const child of children) {
        familyStyles.push(child);
        findChildren(child.id);
      }
    };

    findChildren(rootStyle.id);

    // Sort by version number (newest first)
    return familyStyles.sort((a, b) => b.version - a.version);
  }

  /**
   * Create a new style
   *
   * @param data - Style data
   * @returns Created style
   */
  async createStyle(data: {
    name: string;
    palette: { primary: string[]; accent: string[]; background: string };
    renderingCues: { materials: string[]; effects: string[]; finish: string };
    description?: string;
  }): Promise<Style> {
    return this.create({
      name: data.name,
      palette: data.palette,
      renderingCues: data.renderingCues,
      description: data.description,
      version: 1,
    });
  }

  /**
   * Create a new version of an existing style
   *
   * @param parentStyleId - ID of the parent style
   * @param data - Updated style data
   * @returns Created style version
   */
  async createStyleVersion(
    parentStyleId: string,
    data: {
      name?: string;
      palette?: { primary: string[]; accent: string[]; background: string };
      renderingCues?: { materials: string[]; effects: string[]; finish: string };
      description?: string;
    }
  ): Promise<Style> {
    // Get parent style to inherit values and increment version
    const parentStyle = await this.findById(parentStyleId);
    if (!parentStyle) {
      throw new Error(`Parent style ${parentStyleId} not found`);
    }

    // Create new version with incremented version number
    return this.create({
      name: data.name ?? parentStyle.name,
      palette: data.palette ?? parentStyle.palette,
      renderingCues: data.renderingCues ?? parentStyle.renderingCues,
      description: data.description ?? parentStyle.description,
      parentStyleId,
      version: parentStyle.version + 1,
    });
  }

  /**
   * Update an existing style (updates metadata only, creates new version for content changes)
   *
   * @param id - Style ID
   * @param data - Updated style data (only description can be updated in place)
   * @returns Updated style
   */
  async updateStyle(
    id: string,
    data: { description?: string }
  ): Promise<Style | undefined> {
    return this.update(id, { description: data.description });
  }

  /**
   * Delete a style and all its versions
   * WARNING: This will fail if the style is referenced by prompts
   *
   * @param id - Style ID (any version in the family)
   * @returns Number of deleted styles
   */
  async deleteStyleFamily(id: string): Promise<number> {
    return this.transaction(async (tx) => {
      // Get all versions in the family
      const versions = await this.getStyleVersions(id);
      const versionIds = versions.map(v => v.id);

      // Delete all versions
      let deletedCount = 0;
      for (const versionId of versionIds) {
        await tx.delete(styles).where(eq(styles.id, versionId));
        deletedCount++;
      }

      return deletedCount;
    });
  }

  /**
   * Toggle favorite status for a style
   *
   * @param id - Style ID
   * @returns Updated style
   */
  async toggleFavorite(id: string): Promise<Style | undefined> {
    const style = await this.findById(id);
    if (!style) {
      throw new Error(`Style ${id} not found`);
    }

    return this.update(id, { isFavorite: !style.isFavorite });
  }
}

// Export singleton instance
export const stylesService = new StylesService();
