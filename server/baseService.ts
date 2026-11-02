import { pool } from './db';

export const d = (v: any): string =>
  v instanceof Date ? v.toISOString().substring(0, 10) : v ? String(v) : '';

export const dt = (v: any): string =>
  v instanceof Date ? v.toISOString().replace('T', ' ').substring(0, 19) : v ? String(v) : '';

export async function dbQuery(text: string, params?: any[]) {
  const { rows } = await pool.query(text, params);
  return rows;
}
