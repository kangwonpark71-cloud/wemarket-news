#!/usr/bin/env node
/**
 * Schema Drift Check
 * Compares prisma/schema.prisma (PG source of truth) against the
 * auto-generated prisma/schema.sqlite.prisma to detect manual drift.
 *
 * Usage: node scripts/check-schema-drift.mjs
 * Exit code: 0 = clean, 1 = drift detected
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const prismaDir = join(__dirname, '..', 'prisma');

/**
 * Apply the same transformations as generate-sqlite-schema.mjs
 * to produce the expected SQLite schema from the PG schema.
 */
function transformToSqlite(input) {
  return input
    .split('\n')
    .map((line) => {
      if (line.trim().startsWith('provider') && line.includes('"postgresql"')) {
        return line.replace('"postgresql"', '"sqlite"');
      }
      if (line.includes('@db.')) {
        line = line.replace(/@db\.\w+(\([^)]*\))?/g, '');
      }
      if (line.includes('Decimal')) {
        line = line.replace(/\bDecimal\b/g, 'Float');
      }
      if (line.includes('BigInt')) {
        line = line.replace(/\bBigInt\b/g, 'Int');
      }
      if (line.includes('String[]')) {
        line = line.replace(/String\[\]/g, 'String');
      }
      if (line.includes('@default([])')) {
        line = line.replace('@default([])', '@default("")');
      }
      return line;
    })
    .join('\n');
}

function stripWhitespace(s) {
  return s.replace(/\s+/g, ' ').trim();
}

function stripComments(s) {
  return s
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n');
}

try {
  const pgSchema = readFileSync(join(prismaDir, 'schema.prisma'), 'utf-8');
  const actualSqlite = readFileSync(join(prismaDir, 'schema.sqlite.prisma'), 'utf-8');
  const expectedSqlite = transformToSqlite(pgSchema);

  const expected = stripWhitespace(stripComments(expectedSqlite));
  const actual = stripWhitespace(stripComments(actualSqlite));

  if (expected === actual) {
    console.log('✅ Schema drift check PASSED — SQLite schema is in sync with PostgreSQL schema.');
    process.exit(0);
  } else {
    console.log('❌ Schema drift DETECTED — prisma/schema.sqlite.prisma is out of sync with prisma/schema.prisma.');
    console.log('');
    console.log('  Run:  npm run db:dev:generate');
    console.log('  To auto-regenerate the SQLite schema from the PG source of truth.');
    console.log('');

    // Show diff summary
    const expectedLines = expectedSqlite.split('\n');
    const actualLines = actualSqlite.split('\n');
    const minLen = Math.min(expectedLines.length, actualLines.length);

    const diffs = [];
    for (let i = 0; i < minLen; i++) {
      if (expectedLines[i] !== actualLines[i]) {
        const lineNum = i + 1;
        if (expectedLines[i].trim() !== actualLines[i].trim()) {
          diffs.push({ line: lineNum, expected: expectedLines[i].trim(), actual: actualLines[i].trim() });
        }
      }
    }

    if (expectedLines.length !== actualLines.length) {
      console.log(`  Line count: expected ${expectedLines.length}, got ${actualLines.length}`);
    }

    if (diffs.length > 0) {
      console.log('  Significant differences:');
      for (const d of diffs.slice(0, 20)) {
        console.log(`    L${d.line}`);
        console.log(`      expected: ${d.expected}`);
        console.log(`      actual:   ${d.actual}`);
      }
      if (diffs.length > 20) {
        console.log(`    ... and ${diffs.length - 20} more differences`);
      }
    }

    process.exit(1);
  }
} catch (err) {
  console.error('Failed to check schema drift:', err.message);
  process.exit(1);
}
