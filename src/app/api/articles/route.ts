import { NextResponse } from 'next/server'
import { getArticles, getArticleStats } from '@/lib/rss/db-service'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const category = searchParams.get('category') || undefined
  const source = searchParams.get('source') || undefined
  const language = searchParams.get('language') || undefined
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = parseInt(searchParams.get('limit') || '20', 10)
  const search = searchParams.get('search') || undefined
  const sortBy = searchParams.get('sortBy') || 'publishedAt'
  const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'
  const includeStats = searchParams.get('stats') === 'true'

  try {
    const result = await getArticles({
      category,
      sourceName: source,
      language,
      page,
      limit: Math.min(limit, 100),
      search,
      sortBy,
      sortOrder,
    })

    let stats = null
    if (includeStats) {
      stats = await getArticleStats()
    }

    return NextResponse.json({
      success: true,
      data: result,
      stats,
    })
  } catch (error) {
    console.error('Failed to fetch articles:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch articles' },
      { status: 500 }
    )
  }
}
