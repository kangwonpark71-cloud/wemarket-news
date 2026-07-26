import { NextResponse } from 'next/server'
import { seedSources } from '@/lib/rss/service'

export async function POST() {
  try {
    await seedSources()
    return NextResponse.json({ success: true, message: 'All sources seeded successfully' })
  } catch (error) {
    console.error('Seed sources failed:', error)
    return NextResponse.json({ success: false, error: 'Seed failed' }, { status: 500 })
  }
}
