import { db } from '@/lib/db';
import { composerLayouts, ComposerLayout, NewComposerLayout } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import { BaseService } from './base.service';

/**
 * Service for managing composer scene layouts.
 */
export class ComposerLayoutsService extends BaseService<typeof composerLayouts, ComposerLayout, NewComposerLayout> {
    constructor() {
        super(composerLayouts);
    }

    /**
     * Get all layouts ordered by most recently updated
     */
    async getAllLayouts(): Promise<ComposerLayout[]> {
        return db
            .select()
            .from(composerLayouts)
            .orderBy(desc(composerLayouts.updatedAt));
    }

    /**
     * Create a new layout
     */
    async createLayout(data: {
        name: string;
        data: NewComposerLayout['data'];
    }): Promise<ComposerLayout> {
        return this.create({
            name: data.name,
            data: data.data,
        });
    }
}

// Export singleton instance
export const composerLayoutsService = new ComposerLayoutsService();
