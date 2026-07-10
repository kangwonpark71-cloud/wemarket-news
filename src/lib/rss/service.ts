import prisma from '@/lib/db'
import { ALL_SOURCES } from './sources'

export async function seedSources() {
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
  }

  console.log(`Seeded ${ALL_SOURCES.length} RSS sources`)
}

export async function getSourceIdByNameEn(nameEn: string): Promise<string | null> {
  const source = await prisma.source.findUnique({
    where: { nameEn },
    select: { id: true },
  })
  return source?.id || null
}

export async function getAllActiveSources() {
  return prisma.source.findMany({
    where: { isActive: true },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  })
}

export async function logFetch(
  sourceId: string,
  status: 'success' | 'error' | 'partial',
  count: number,
  newCount: number,
  duration: number,
  error?: string
) {
  return prisma.fetchLog.create({
    data: {
      sourceId,
      status,
      count,
      newCount,
      duration,
      error,
    },
  })
}
