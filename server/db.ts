
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

// Make database optional - if DATABASE_URL is not set, exports will be null
// This allows the app to run with in-memory storage only
export let pool: pg.Pool | null = null;
export let db: ReturnType<typeof drizzle> | null = null;

if (process.env.DATABASE_URL) {
  console.log("📦 Database URL detected - initializing PostgreSQL connection");
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle(pool, { schema });
} else {
  console.log("⚠️  No DATABASE_URL - running with in-memory storage only");
}
