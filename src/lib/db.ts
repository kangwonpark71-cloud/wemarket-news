import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// SQLite on slow filesystems (e.g. network mounts) can hit P1008 socket timeouts
// on first query. Append resilience pragmas + a longer timeout when running locally.
function resolveDatasourceUrl(): string | undefined {
  const url = process.env.DATABASE_URL
  if (!url || !url.startsWith('file:')) return undefined
  const params = 'connection_limit=1&socket_timeout=30&connect_timeout=30&pool_timeout=30'
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}${params}`
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(
    resolveDatasourceUrl()
      ? { datasources: { db: { url: resolveDatasourceUrl() } } }
      : undefined,
  )

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
