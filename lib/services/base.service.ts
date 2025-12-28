import { db } from '@/lib/db';
import { PgTable } from 'drizzle-orm/pg-core';
import { eq, desc } from 'drizzle-orm';

/**
 * Base service class providing common database operations.
 * All domain services should extend this class.
 */
export abstract class BaseService<
  TTable extends PgTable,
  TSelect = TTable['$inferSelect'],
  TInsert = TTable['$inferInsert']
> {
  constructor(protected readonly table: TTable) {}

  /**
   * Find a record by ID
   */
  async findById(id: string): Promise<TSelect | undefined> {
    const records = await db
      .select()
      .from(this.table)
      .where(eq(this.table.id, id))
      .limit(1);

    return records[0] as TSelect | undefined;
  }

  /**
   * Find all records, optionally ordered by creation date
   */
  async findAll(orderByCreatedAt = true): Promise<TSelect[]> {
    if (orderByCreatedAt) {
      return db
        .select()
        .from(this.table)
        .orderBy(desc(this.table.createdAt)) as Promise<TSelect[]>;
    }
    return db.select().from(this.table) as Promise<TSelect[]>;
  }

  /**
   * Create a new record
   */
  async create(data: TInsert): Promise<TSelect> {
    const [record] = await db
      .insert(this.table)
      .values(data)
      .returning();

    return record as TSelect;
  }

  /**
   * Update a record by ID
   */
  async update(id: string, data: Partial<TInsert>): Promise<TSelect | undefined> {
    const [record] = await db
      .update(this.table)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(this.table.id, id))
      .returning();

    return record as TSelect | undefined;
  }

  /**
   * Delete a record by ID
   */
  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(this.table)
      .where(eq(this.table.id, id));

    return (result as any).rowCount > 0;
  }

  /**
   * Execute a database transaction
   */
  async transaction<T>(callback: (tx: typeof db) => Promise<T>): Promise<T> {
    return db.transaction(callback);
  }
}
