import { db } from '@/lib/db';
import { subjects, Subject, NewSubject, images, generations, batchPrompts, prompts } from '@/lib/db/schema';
import { eq, desc, and, exists } from 'drizzle-orm';
import { BaseService } from './base.service';
import { ApiError } from '@/lib/api/errors';

/** A subject with its family size and up to three preview image ids. */
export type SubjectSummary = Subject & { versionCount: number; previews: { id: string }[] };

/**
 * Service for managing subjects with versioning support.
 *
 * Subjects represent the main objects/characters in generated images.
 * Like styles, subjects can be versioned for iterative refinement.
 */
export class SubjectsService extends BaseService<typeof subjects, Subject, NewSubject> {
  constructor() {
    super(subjects);
  }

  /**
   * Get all subjects, grouped by subject family (returns only latest version of each family)
   *
   * @param options - Filter options
   * @returns Array of latest subject versions with their version count
   */
  async getLatestSubjects(options: { categoryId?: string; favoritesOnly?: boolean } = {}): Promise<SubjectSummary[]> {
    const { categoryId, favoritesOnly } = options;

    // Build where conditions
    const conditions = [];
    if (categoryId) conditions.push(eq(subjects.categoryId, categoryId));
    if (favoritesOnly) conditions.push(eq(subjects.isFavorite, true));

    const allSubjects = await db.query.subjects.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [desc(subjects.createdAt)],
    });

    const subjectMap = new Map<string, Subject>();
    const versionCounts = new Map<string, number>();

    for (const subject of allSubjects) {
      // Find the root subject
      let rootId = subject.id;
      let current = subject;

      while (current.parentSubjectId) {
        const parent = allSubjects.find(s => s.id === current.parentSubjectId);
        if (!parent) break;
        rootId = parent.id;
        current = parent;
      }

      // Count versions in this family
      const familyVersions = allSubjects.filter(s => {
        let checkId = s.id;
        let checkSubject = s;
        while (checkSubject.parentSubjectId) {
          const parent = allSubjects.find(p => p.id === checkSubject.parentSubjectId);
          if (!parent) break;
          checkId = parent.id;
          checkSubject = parent;
        }
        return checkId === rootId;
      });

      versionCounts.set(rootId, familyVersions.length);

      // Keep only the latest version
      const existing = subjectMap.get(rootId);
      if (!existing || subject.version > existing.version) {
        subjectMap.set(rootId, subject);
      }
    }

    const subjectsWithPreviews = await Promise.all(
      Array.from(subjectMap.values()).map(async subject => {
        const rootId = subject.parentSubjectId ?
          (allSubjects.find(s => {
            let root = subject;
            while (root.parentSubjectId) {
              const p = allSubjects.find(x => x.id === root.parentSubjectId);
              if (!p) break;
              root = p;
            }
            return s.id === root.id;
          })?.id || subject.id)
          : subject.id;

        // Get preview images for this subject family
        // This is a bit expensive in a loop, but fine for small number of families
        const previews = await db.query.images.findMany({
          where: exists(
            db.select()
              .from(generations)
              .innerJoin(batchPrompts, eq(generations.batchPromptId, batchPrompts.id))
              .innerJoin(prompts, eq(batchPrompts.promptId, prompts.id))
              .where(
                and(
                  eq(images.generationId, generations.id),
                  eq(prompts.subjectId, subject.id) // Just use current version's images for simplicity
                )
              )
          ),
          orderBy: [desc(images.createdAt)],
          limit: 3,
        });

        return {
          ...subject,
          versionCount: versionCounts.get(rootId) || 1,
          previews: previews.map(p => ({ id: p.id })),
        };
      })
    );

    return subjectsWithPreviews;
  }

  /**
   * Get a subject by ID with its lineage (parent and children)
   *
   * @param id - Subject ID
   * @returns Subject with parent and child subjects, or undefined if not found
   */
  async getSubjectWithLineage(id: string) {
    return db.query.subjects.findFirst({
      where: eq(subjects.id, id),
      with: {
        parentSubject: true,
        childSubjects: {
          orderBy: [desc(subjects.version)],
        },
      },
    });
  }

  /**
   * Get all versions of a subject family
   *
   * @param subjectId - Any subject ID in the family
   * @returns All versions ordered by version number (newest first)
   */
  async getSubjectVersions(subjectId: string): Promise<Subject[]> {
    const subject = await this.findById(subjectId);
    if (!subject) return [];

    let rootSubject = subject;
    while (rootSubject.parentSubjectId) {
      const parent = await this.findById(rootSubject.parentSubjectId);
      if (!parent) break;
      rootSubject = parent;
    }

    const allSubjects = await this.findAll(false);
    const familySubjects: Subject[] = [rootSubject];

    const findChildren = (parentId: string) => {
      const children = allSubjects.filter(s => s.parentSubjectId === parentId);
      for (const child of children) {
        familySubjects.push(child);
        findChildren(child.id);
      }
    };

    findChildren(rootSubject.id);

    return familySubjects.sort((a, b) => b.version - a.version);
  }

  /**
   * Create a new subject
   *
   * @param data - Subject data
   * @returns Created subject
   */
  async createSubject(data: {
    name: string;
    description?: string;
    isTransparent?: boolean;
    categoryId?: string;
  }): Promise<Subject> {
    return this.create({
      name: data.name,
      description: data.description,
      isTransparent: data.isTransparent ?? true,
      categoryId: data.categoryId,
      version: 1,
    });
  }

  /**
   * Create a new version of an existing subject
   *
   * @param parentSubjectId - ID of the parent subject
   * @param data - Updated subject data
   * @returns Created subject version
   */
  async createSubjectVersion(
    parentSubjectId: string,
    data: {
      name?: string;
      description?: string;
      isTransparent?: boolean;
      categoryId?: string;
    }
  ): Promise<Subject> {
    const parentSubject = await this.findById(parentSubjectId);
    if (!parentSubject) {
      throw new ApiError(404, `Parent subject ${parentSubjectId} not found`);
    }

    return this.create({
      name: data.name ?? parentSubject.name,
      description: data.description ?? parentSubject.description,
      isTransparent: data.isTransparent ?? parentSubject.isTransparent,
      categoryId: data.categoryId ?? parentSubject.categoryId,
      parentSubjectId,
      version: parentSubject.version + 1,
    });
  }

  /**
   * Update an existing subject
   *
   * @param id - Subject ID
   * @param data - Updated subject data
   * @returns Updated subject
   */
  async updateSubject(
    id: string,
    data: {
      name?: string;
      description?: string;
      isTransparent?: boolean;
      categoryId?: string;
    }
  ): Promise<Subject | undefined> {
    return this.update(id, data);
  }

  /**
   * Delete a subject and all its versions
   * WARNING: This will fail if the subject is referenced by prompts
   *
   * @param id - Subject ID (any version in the family)
   * @returns Number of deleted subjects
   */
  async deleteSubjectFamily(id: string): Promise<number> {
    return this.transaction(async (tx) => {
      const versions = await this.getSubjectVersions(id);
      const versionIds = versions.map(v => v.id);

      let deletedCount = 0;
      for (const versionId of versionIds) {
        await tx.delete(subjects).where(eq(subjects.id, versionId));
        deletedCount++;
      }

      return deletedCount;
    });
  }

  /**
   * Toggle favorite status for a subject
   *
   * @param id - Subject ID
   * @returns Updated subject
   */
  async toggleFavorite(id: string): Promise<Subject | undefined> {
    const subject = await this.findById(id);
    if (!subject) {
      throw new Error(`Subject ${id} not found`);
    }

    return this.update(id, { isFavorite: !subject.isFavorite });
  }
}

// Export singleton instance
export const subjectsService = new SubjectsService();
