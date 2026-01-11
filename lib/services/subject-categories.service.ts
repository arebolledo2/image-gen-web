import { db } from '@/lib/db';
import { subjectCategories, SubjectCategory, NewSubjectCategory } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { BaseService } from './base.service';

/**
 * Service for managing subject categories.
 * 
 * Subject categories help organize subjects for better filtering and management.
 */
export class SubjectCategoriesService extends BaseService<typeof subjectCategories, SubjectCategory, NewSubjectCategory> {
    constructor() {
        super(subjectCategories);
    }

    /**
     * Get all subject categories ordered by name
     */
    async getAllCategories(): Promise<SubjectCategory[]> {
        return db.query.subjectCategories.findMany({
            orderBy: [desc(subjectCategories.name)],
        });
    }

    /**
     * Create a new category
     */
    async createCategory(data: {
        name: string;
        color?: string;
        description?: string;
    }): Promise<SubjectCategory> {
        return this.create({
            name: data.name,
            color: data.color,
            description: data.description,
        });
    }

    /**
     * Get category with its subjects
     */
    async getCategoryWithSubjects(id: string) {
        return db.query.subjectCategories.findFirst({
            where: eq(subjectCategories.id, id),
            with: {
                subjects: true,
            },
        });
    }
}

// Export singleton instance
export const subjectCategoriesService = new SubjectCategoriesService();
