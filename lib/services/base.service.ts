import { db } from '@/lib/db';
import { PgTable, PgColumn } from 'drizzle-orm/pg-core';
import { eq, desc } from 'drizzle-orm';

// Type for tables that have standard id and createdAt columns
// These `any` types are required for Drizzle ORM generic table abstraction
type TableWithIdAndTimestamps = PgTable & {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  id: PgColumn<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createdAt: PgColumn<any>;
};

/**
 * Base service class providing common database operations.
 * All domain services should extend this class.
 *
 * Note: This class uses `any` casts for Drizzle ORM generic table operations.
 * These are required because Drizzle's type system doesn't fully support generic table operations.
 */
export abstract class BaseService<
  TTable extends TableWithIdAndTimestamps,
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from(this.table as any)
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from(this.table as any)
        .orderBy(desc(this.table.createdAt)) as Promise<TSelect[]>;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return db.select().from(this.table as any) as Promise<TSelect[]>;
  }

  /**
   * Create a new record
   */
  async create(data: TInsert): Promise<TSelect> {
    const [record] = await db
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert(this.table as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .values(data as any)
      .returning();

    return record as TSelect;
  }

  /**
   * Update a record by ID
   */
  async update(id: string, data: Partial<TInsert>): Promise<TSelect | undefined> {
    const [record] = await db
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(this.table as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .delete(this.table as any)
      .where(eq(this.table.id, id));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (result as any).rowCount > 0;
  }

  /**
   * Execute a database transaction
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async transaction<T>(callback: (tx: any) => Promise<T>): Promise<T> {
    return db.transaction(callback);
  }
}
