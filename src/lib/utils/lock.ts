import { cacheService } from '@/lib/services/cache/cache-service';

const LOCK_RELEASE_DELAY_MS = 10000;

/** Runs jobFn only when the distributed lock is acquired; releases it after a short delay so a stuck instance can't block future runs. */
export async function runJobWithLock(
  name: string,
  jobFn: () => Promise<unknown>,
  ttlSeconds = 300,
): Promise<boolean> {
  const lockName = `scheduler:job:${name}`;
  const acquired = await cacheService.acquireLock(lockName, ttlSeconds);
  if (!acquired) {
    return false;
  }

  try {
    await jobFn();
    return true;
  } finally {
    setTimeout(() => {
      cacheService.releaseLock(lockName).catch(() => {});
    }, LOCK_RELEASE_DELAY_MS);
  }
}
