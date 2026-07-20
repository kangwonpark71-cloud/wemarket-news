import { runRssFetch } from '../src/lib/rss/scheduler'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const sourceArg = process.argv[2]

  console.log(`[dev:fetch] Starting RSS fetch${sourceArg ? ` for source: ${sourceArg}` : ' for all sources'}...`)

  const startTime = Date.now()

  try {
    const results = await runRssFetch(sourceArg)
    const duration = Date.now() - startTime

    console.log('\n')
    console.log('='.repeat(60))
    console.log(`[dev:fetch] Complete in ${duration}ms`)
    console.log('='.repeat(60))

    for (const r of results) {
      const icon = r.status === 'success' ? '✓' : r.status === 'partial' ? '~' : '✗'
      const detail = r.status === 'success' || r.status === 'partial'
        ? `${r.new} new / ${r.total} total (${r.duration}ms)`
        : `${r.error} (${r.duration}ms)`
      console.log(`  ${icon} ${r.source.padEnd(20)} ${detail}`)
    }

    const ok = results.filter(r => r.status === 'success' || r.status === 'partial').length
    const err = results.filter(r => r.status === 'error').length
    console.log('-'.repeat(60))
    console.log(`Result: ${ok} ok, ${err} errors, ${results.length} total`)
  } catch (err) {
    console.error('[dev:fetch] Fatal error:', err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
