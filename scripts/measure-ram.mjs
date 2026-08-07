#!/usr/bin/env node
/**
 * RAM Measurement
 * Boots the production server (next start), samples its RSS over a window,
 * and writes a normalized measurement for fit-check.mjs.
 *
 * Usage: node scripts/measure-ram.mjs [--duration 30] [--port 3111]
 * Exit code: 0 = measured, 1 = failed to boot/measure
 */

import { spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const OUTPUT_PATH = join(projectRoot, '.ram', 'measurement.json');

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const DURATION_SEC = Number(getArg('--duration', '30'));
const PORT = Number(getArg('--port', '3111'));
const SAMPLE_INTERVAL_MS = 2000;
const BOOT_TIMEOUT_MS = 60_000;
const HEALTH_PATH = '/api/health';

/** Read RSS in MB from /proc/<pid>/status (Linux only). */
function readRssMb(pid) {
  try {
    const status = readFileSync(`/proc/${pid}/status`, 'utf-8');
    const match = status.match(/^VmRSS:\s+(\d+)\s+kB$/m);
    return match ? Number(match[1]) / 1024 : null;
  } catch {
    return null;
  }
}

async function waitForHealth(port, childPid, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  const url = `http://127.0.0.1:${port}${HEALTH_PATH}`;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (res.ok) return true;
    } catch {
      /* server not up yet */
    }
    // If the booted process died, bail early.
    if (childPid && !existsSync(`/proc/${childPid}`)) {
      return false;
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  return false;
}

async function main() {
  const nextBin = join(projectRoot, 'node_modules', '.bin', 'next');
  if (!existsSync(join(projectRoot, '.next', 'BUILD_ID'))) {
    console.error('❌ Build output (.next/BUILD_ID) not found. Run `npm run build` first.');
    process.exit(1);
  }

  console.log(`🚀 Booting production server (port ${PORT}, sampling ${DURATION_SEC}s)...`);
  // DISABLE_SCHEDULERS=1: prevent cron jobs from hitting the production DB
  // during measurement — we want steady-state web-server memory, not a fetch spike.
  const server = spawn(nextBin, ['start', '-p', String(PORT)], {
    cwd: projectRoot,
    env: { ...process.env, NODE_ENV: 'production', PORT: String(PORT), DISABLE_SCHEDULERS: '1' },
    stdio: 'ignore',
  });

  let childPid = server.pid;

  const booted = await waitForHealth(PORT, childPid, BOOT_TIMEOUT_MS);
  if (!booted) {
    console.error('❌ Server failed to boot within timeout (or process died).');
    server.kill('SIGKILL');
    process.exit(1);
  }
  console.log(`✅ Server healthy at ${HEALTH_PATH}. Sampling RSS every ${SAMPLE_INTERVAL_MS}ms...`);

  const samples = [];
  const samplesCount = Math.floor(DURATION_SEC / (SAMPLE_INTERVAL_MS / 1000));
  for (let i = 0; i < samplesCount; i++) {
    const rssMb = readRssMb(childPid);
    if (rssMb !== null) {
      samples.push(rssMb);
    }
    await new Promise((r) => setTimeout(r, SAMPLE_INTERVAL_MS));
  }

  server.kill('SIGTERM');

  if (samples.length === 0) {
    console.error('❌ No RSS samples collected. Cannot read /proc/<pid>/status?');
    process.exit(1);
  }

  const total = samples.reduce((a, b) => a + b, 0);
  const result = {
    measuredAt: new Date().toISOString(),
    durationSec: DURATION_SEC,
    sampleCount: samples.length,
    rssMb: {
      min: Math.round(Math.min(...samples) * 10) / 10,
      avg: Math.round((total / samples.length) * 10) / 10,
      max: Math.round(Math.max(...samples) * 10) / 10,
    },
  };

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2) + '\n');

  console.log('\n📊 RAM Measurement (RSS):');
  console.log(`   Min:   ${result.rssMb.min} MB`);
  console.log(`   Avg:   ${result.rssMb.avg} MB`);
  console.log(`   Max:   ${result.rssMb.max} MB`);
  console.log(`   Saved: ${OUTPUT_PATH}`);
  console.log('   Next:  npm run ram:fit');
}

main().catch((err) => {
  console.error('measure-ram failed:', err.message);
  process.exit(1);
});
