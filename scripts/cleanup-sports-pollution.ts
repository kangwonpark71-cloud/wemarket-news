import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const EXCLUDE_KEYWORDS = [
  '코스피', '코스닥', '비트코인', '가상자산', 'ETF', '증시', '주가',
  '시세', '환율', '금리', '사이드카', '미수거래', '레버리지', '예탁금',
  '반대매매', '폭등', '급락', '삼성전자', 'SK하이닉스', '퇴근길머니',
]

const SPORTS_SOURCES = ['yonhapnewstv_sports', 'ytn_sports']

async function main() {
  const dryRun = process.argv.includes('--dry-run')

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
