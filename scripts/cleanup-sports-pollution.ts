import { PrismaClient } from '@prisma/client'
import { getSourceByName } from '../src/lib/rss/sources'

const prisma = new PrismaClient()

// 키워드 단일 소스: sources.ts의 excludeKeywords 설정과 동기화
function getExcludeKeywords(): string[] {
  const keywords = new Set<string>()
  for (const nameEn of SPORTS_SOURCES) {
    const source = getSourceByName(nameEn)
    for (const kw of source?.excludeKeywords ?? []) keywords.add(kw)
  }
  return [...keywords]
}

const SPORTS_SOURCES = ['yonhapnewstv_sports', 'ytn_sports']

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const EXCLUDE_KEYWORDS = getExcludeKeywords()

  const sources = await prisma.source.findMany({
    where: { nameEn: { in: SPORTS_SOURCES } },
    select: { id: true, nameEn: true },
  })
  if (sources.length === 0) {
    console.log('No sports sources found — nothing to do.')
    return
  }
  const sourceIds = sources.map((s) => s.id)

  const articles = await prisma.article.findMany({
    where: { sourceId: { in: sourceIds } },
    select: { id: true, title: true },
  })
  console.log(`Found ${articles.length} articles from sports sources`)

  const matched = articles.filter((a) =>
    EXCLUDE_KEYWORDS.some((k) => a.title.includes(k)),
  )
  console.log(`Matched ${matched.length} polluted articles:`)
  for (const a of matched.slice(0, 30)) console.log(`  - ${a.title}`)
  if (matched.length > 30) console.log(`  ... and ${matched.length - 30} more`)

  if (dryRun) {
    console.log('\n[dry-run] No deletions performed.')
    return
  }

  const result = await prisma.article.deleteMany({
    where: { id: { in: matched.map((a) => a.id) } },
  })
  console.log(`\nDeleted ${result.count} polluted articles`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
