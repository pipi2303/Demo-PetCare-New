import fs from "fs";
import path from "path";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { PGlite } from "@electric-sql/pglite";

const DATABASE_URL = process.env.DATABASE_URL;

interface QueryResultLike<T = any> {
  rows: T[];
  rowCount: number | null;
}

interface PoolLike {
  query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResultLike<T>>;
  connect(): Promise<{
    query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResultLike<T>>;
    release(): void;
  }>;
  end(): Promise<void>;
}

function createPGlitePool(): PoolLike {
  let dbPromise: Promise<PGlite> | null = null;

  function getDb(): Promise<PGlite> {
    if (!dbPromise) {
      dbPromise = (async () => {
        try {
          const dataDir = path.join(process.cwd(), ".data", "pglite");
          fs.mkdirSync(dataDir, { recursive: true });
          console.log(`[DB] DATABASE_URL tidak diset — menggunakan embedded Postgres (PGlite) di ${dataDir}`);
          return await PGlite.create(dataDir);
        } catch (err) {
          console.warn("[DB] Gagal membuka direktori PGlite, fallback ke in-memory Postgres:", (err as Error).message);
          return await PGlite.create();
        }
      })();
    }
    return dbPromise;
  }

  async function execQuery<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResultLike<T>> {
    const db = await getDb();
    // PGlite built-in PostgreSQL 16+ already provides gen_random_uuid() natively without pgcrypto extension
    const cleanedText = text.replace(/CREATE\s+EXTENSION\s+IF\s+NOT\s+EXISTS\s+pgcrypto\s*;/gi, "");
    const trimmed = cleanedText.trim();
    if (!trimmed) {
      return { rows: [], rowCount: 0 };
    }

    // Multi-statement SQL without parameters (e.g. migration files, BEGIN/COMMIT)
    const hasMultipleStatements = (!params || params.length === 0) && trimmed.slice(0, -1).includes(";");
    if (hasMultipleStatements) {
      const results = await db.exec(cleanedText);
      const last = results[results.length - 1];
      return {
        rows: (last?.rows as T[]) ?? [],
        rowCount: last?.affectedRows ?? last?.rows?.length ?? 0,
      };
    }

    const res = await db.query<T>(cleanedText, params);
    return {
      rows: res.rows,
      rowCount: res.affectedRows ?? res.rows.length,
    };
  }

  // Mutex lock so concurrent pool.connect() transactions don't interleave BEGIN/COMMIT
  let lockChain: Promise<void> = Promise.resolve();

  return {
    query: execQuery,
    async connect() {
      let releaseLock!: () => void;
      const prevLock = lockChain;
      lockChain = new Promise<void>((resolve) => {
        releaseLock = resolve;
      });
      await prevLock;

      let released = false;
      return {
        query: execQuery,
        release() {
          if (!released) {
            released = true;
            releaseLock();
          }
        },
      };
    },
    async end() {
      if (dbPromise) {
        const db = await dbPromise;
        await db.close();
        dbPromise = null;
      }
    },
  };
}

export const pool: PoolLike = DATABASE_URL
  ? new Pool({ connectionString: DATABASE_URL })
  : createPGlitePool();

export async function query<T extends QueryResultRow = any>(text: string, params?: any[]) {
  return pool.query<T>(text, params);
}

export async function closePool() {
  await pool.end();
}

/** Run `fn` inside a single client transaction (BEGIN/COMMIT/ROLLBACK). */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client as unknown as PoolClient);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

