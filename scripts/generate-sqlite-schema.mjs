import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const prismaDir = join(__dirname, '..', 'prisma');

const input = readFileSync(join(prismaDir, 'schema.prisma'), 'utf-8');

const lines = input.split('\n');
const output = lines
  .map((line) => {
    // replace datasource provider
    if (line.trim().startsWith('provider') && line.includes('"postgresql"')) {
      return line.replace('"postgresql"', '"sqlite"');
    }

    // strip @db.* annotations
    if (line.includes('@db.')) {
      line = line.replace(/@db\.\w+(\([^)]*\))?/g, '');
    }

    // Decimal → Float for SQLite compatibility
    if (line.includes('Decimal')) {
      line = line.replace(/\bDecimal\b/g, 'Float');
    }

    // BigInt → Int for SQLite simplicity
    if (line.includes('BigInt')) {
      line = line.replace(/\bBigInt\b/g, 'Int');
    }

    // Json → String for SQLite (no native JSON type)
    if (line.includes('Json')) {
      line = line.replace(/\bJson\b/g, 'String');
    }

    // String[] → String for SQLite (no native array support)
    if (line.includes('String[]')) {
      line = line.replace(/String\[\]/g, 'String');
    }
    // @default([]) → @default("") for SQLite (list defaults on string fields)
    if (line.includes('@default([])')) {
      line = line.replace('@default([])', '@default("")');
    }

    return line;
  })
  .join('\n');

const outPath = join(prismaDir, 'schema.sqlite.prisma');
writeFileSync(outPath, output, 'utf-8');
console.log(`Generated ${outPath}`);
