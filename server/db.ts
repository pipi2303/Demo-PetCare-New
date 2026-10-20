import { Pool, type QueryResultRow } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL belum dikonfigurasi. Set env var ini (lihat .env.example) sebelum menjalankan server.");
}

export const pool = new Pool({ connectionString: DATABASE_URL });

export async function query<T extends QueryResultRow = any>(text: string, params?: any[]) {
  return pool.query<T>(text, params);
}

export async function closePool() {
  await pool.end();
}

/** Run `fn` inside a single client transaction (BEGIN/COMMIT/ROLLBACK). */
export async function withTransaction<T>(fn: (client: import("pg").PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
