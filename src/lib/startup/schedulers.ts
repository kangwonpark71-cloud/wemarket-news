import { createDefaultSchedulers } from '@/lib/scheduler/scheduler-manager'

let started = false

export async function startAllSchedulers() {
  if (started) return
  started = true

  if (process.env.DISABLE_SCHEDULERS === '1' || process.env.PIPELINE_TEST === '1') {
    return
  }

  const schedulerManager = createDefaultSchedulers()
  await schedulerManager.startAll()
}
