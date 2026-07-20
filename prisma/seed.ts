import { PrismaClient } from '@prisma/client'
import { ALL_SOURCES } from '../src/lib/rss/sources'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  for (const source of ALL_SOURCES) {
    await prisma.source.upsert({
      where: { nameEn: source.nameEn },
      update: {
        name: source.name,
        url: source.url,
        category: source.category,
        subcategory: source.subcategory,
        icon: source.icon,
        fetchInterval: source.fetchInterval || 3,
      },
      create: {
        name: source.name,
        nameEn: source.nameEn,
        url: source.url,
        category: source.category,
        subcategory: source.subcategory,
        icon: source.icon,
        fetchInterval: source.fetchInterval || 3,
      },
    })
    console.log(`✓ ${source.name}`)
  }

  console.log(`\nSeeded ${ALL_SOURCES.length} RSS sources`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
