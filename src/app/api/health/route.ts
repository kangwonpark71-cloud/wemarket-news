import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createLogger } from '@/lib/logger'

const log = createLogger('ApiHealth')

export async function GET() {
  const timestamp = new Date().toISOString()

  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      timestamp,
    })
  } catch (error) {
    log.warn('Database health check failed', error)
    return NextResponse.json(
      {
        status: 'unhealthy',
        database: 'unavailable',
        error: 'Service unavailable',
        timestamp,
      },
      { status: 503 },
    )
  }
}
