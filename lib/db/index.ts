import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;

// Disable prefetch as it is not supported for "Transaction" pool mode
const client = postgres(connectionString, { prepare: false });

/**
 * Drizzle ORM database instance configured for PostgreSQL.
 * Uses the DATABASE_URL environment variable for connection.
 */
export const db = drizzle(client, { schema });

/**
 * Check if the database connection is working.
 *
 * @returns Promise resolving to true if connected, false if connection failed
 *
 * @example
 * ```typescript
 * if (await checkDatabaseConnection()) {
 *   console.log("Database ready");
 * }
 * ```
 */
export async function checkDatabaseConnection() {
  try {
    await client`SELECT 1`;
    console.log('✅ Database connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}
