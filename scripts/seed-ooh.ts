import { PrismaClient } from '@prisma/client'
import { OOH_SOURCES } from '../src/lib/rss/sources'

const prisma = new PrismaClient()

async function main() {
  console.log(`Seeding ${OOH_SOURCES.length} OOH sources...`)

  for (const source of OOH_SOURCES) {
    await prisma.source.upsert({
      where: { nameEn: source.nameEn },
      update: {
        name: source.name,
        url: source.url,
        category: source.category,
        subcategory: source.subcategory,
        icon: source.icon,
        fetchInterval: source.fetchInterval || 3,
        isActive: true,
      },
      create: {
        name: source.name,
        nameEn: source.nameEn,
        url: source.url,
        category: source.category,
        subcategory: source.subcategory,
        icon: source.icon,
        fetchInterval: source.fetchInterval || 3,
        isActive: true,
      },
    })
    console.log(`✓ ${source.name} (${source.nameEn})`)
  }

  console.log('OOH sources seeded')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
