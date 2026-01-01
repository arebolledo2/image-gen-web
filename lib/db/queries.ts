import { db } from "@/lib/db";
import { batches, styles, subjects, images, generations, batchPrompts } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";

export async function getRecentBatches(count: number = 5) {
    return await db.query.batches.findMany({
        orderBy: [desc(batches.updatedAt)],
        limit: count,
        with: {
            generations: {
                columns: {
                    status: true
                }
            }
        }
    });
}

export async function getBatchDetails(id: string) {
    return await db.query.batches.findFirst({
        where: eq(batches.id, id),
        with: {
            batchPrompts: true,
            generations: {
                with: {
                    images: true
                }
            }
        }
    });
}

export async function getStyleDetails(id: string) {
    return await db.query.styles.findFirst({
        where: eq(styles.id, id)
    });
}

export async function getSubjectDetails(id: string) {
    return await db.query.subjects.findFirst({
        where: eq(subjects.id, id)
    });
}

export async function getImageDetails(id: string) {
    return await db.query.images.findFirst({
        where: eq(images.id, id),
        with: {
            generation: {
                with: {
                    batch: true,
                    batchPrompt: true
                }
            }
        }
    });
}
