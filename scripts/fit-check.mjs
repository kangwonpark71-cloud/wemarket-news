#!/usr/bin/env node
/**
 * Railway Free Tier Fit Check
 * Compares measured RAM (local RSS measurement and/or Railway live metrics)
 * against the Railway Free plan limit (0.5 GB RAM per service).
 *
 * Usage:
 *   node scripts/fit-check.mjs                          # reads .ram/measurement.json
 *   node scripts/fit-check.mjs --avg 420 --max 996      # explicit values (MB)
 *   node scripts/fit-check.mjs --limit 512              # override limit (default 512)
 *
 * Exit code: 0 = fit, 1 = borderline, 2 = over limit (OOM risk)
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const MEASUREMENT_PATH = join(projectRoot, '.ram', 'measurement.json');

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? Number(args[i + 1]) : fallback;
};

const LIMIT_MB = getArg('--limit', 512); // Railway Free: 0.5 GB RAM per service
const BORDERLINE_RATIO = 0.8; // 80% of the limit = borderline threshold

/** Load measurement from CLI args or from the saved measurement file. */
function loadMeasurement() {
  const avg = getArg('--avg', null);
  const max = getArg('--max', null);
  const min = getArg('--min', null);
  if (avg !== null && max !== null) {
    return { source: 'cli', rssMb: { min: min ?? 0, avg, max } };
  }
  if (existsSync(MEASUREMENT_PATH)) {
    const raw = readFileSync(MEASUREMENT_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    return { source: MEASUREMENT_PATH, rssMb: parsed.rssMb, measuredAt: parsed.measuredAt };
  }
  console.error('❌ No measurement found. Run `npm run ram:measure` first or pass --avg/--max.');
  process.exit(2);
}

function verdict(maxMb, avgMb) {
  if (maxMb >= LIMIT_MB) {
    return { code: 2, label: '❌ OVER LIMIT — OOM risk', emoji: '🔴' };
  }
  if (maxMb >= LIMIT_MB * BORDERLINE_RATIO || avgMb >= LIMIT_MB * BORDERLINE_RATIO) {
    return { code: 1, label: '⚠️ BORDERLINE — inside limit, little headroom', emoji: '🟡' };
  }
  return { code: 0, label: '✅ FIT — comfortable headroom', emoji: '🟢' };
}

const { source, rssMb, measuredAt } = loadMeasurement();
const v = verdict(rssMb.max, rssMb.avg);

console.log('🏷️  Railway Free Tier Fit Check');
console.log(`   Limit:     ${LIMIT_MB} MB (0.5 GB RAM per service)`);
console.log(`   Source:    ${source}${measuredAt ? ` (${measuredAt})` : ''}`);
console.log(`   Min/Avg/Max: ${rssMb.min ?? '-'} / ${rssMb.avg} / ${rssMb.max} MB`);
console.log(`   Headroom:  ${Math.round((LIMIT_MB - rssMb.max) * 10) / 10} MB below max (${Math.round((rssMb.max / LIMIT_MB) * 100)}% of limit)`);
console.log('');
console.log(`   Verdict:   ${v.emoji} ${v.label}`);

if (v.code === 2) {
  console.log('\n   💡 Action: reduce peak memory — check cron/batch fetch concurrency,');
  console.log('      translation queue bounds, or node heap (NODE_OPTIONS=--max-old-space-size).');
} else if (v.code === 1) {
  console.log('\n   💡 Action: monitor; optimize if max approaches the limit after deploys.');
}

process.exit(v.code);
