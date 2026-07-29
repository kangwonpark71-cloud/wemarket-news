import { NextResponse } from 'next/server'
import { seedSources } from '@/lib/rss/service'
import { getSessionUser } from '@/lib/utils/auth'
import { createLogger } from '@/lib/logger';

const log = createLogger('ApiAdminSeedsources')

export async function POST(request: Request) {
  const user = await getSessionUser(request)
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await seedSources()
    return NextResponse.json({ success: true, message: 'All sources seeded successfully' })
  } catch (error) {
    log.error('Seed sources failed:', error)
    return NextResponse.json({ success: false, error: 'Seed failed' }, { status: 500 })
  }
}
