/**
 * Database utility functions for cross-provider compatibility.
 *
 * Prisma's `mode: 'insensitive'` works with PostgreSQL (→ ILIKE) but is
 * unsupported by SQLite.  SQLite's LIKE is case-insensitive for ASCII by
 * default, so we simply omit the mode flag when using SQLite.
 */

function isSQLite(): boolean {
  return (process.env.DATABASE_URL ?? '').startsWith('file:');
}

/**
 * Returns a Prisma string filter that does case-insensitive `contains`.
 *
 * - PostgreSQL: uses `mode: 'insensitive'` (→ ILIKE)
 * - SQLite:     omits the mode flag (LIKE is case-insensitive for ASCII)
 */
export function containsFilter(term: string): { contains: string; mode?: 'insensitive' } {
  return isSQLite()
    ? { contains: term }
    : { contains: term, mode: 'insensitive' };
}
