import { NextResponse } from 'next/server'
import { getAllActiveSources } from '@/lib/rss/service'

export async function GET() {
  try {
    const sources = await getAllActiveSources()
    return NextResponse.json({
      success: true,
      data: sources,
    })
  } catch (error) {
    console.error('Failed to fetch sources:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sources' },
      { status: 500 }
    )
  }
}
