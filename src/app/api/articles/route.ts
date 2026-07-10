import { NextResponse } from 'next/server'
import { getArticles } from '@/lib/rss/db-service'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const category = searchParams.get('category') || undefined
  const source = searchParams.get('source') || undefined
  const language = searchParams.get('language') || undefined
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = parseInt(searchParams.get('limit') || '20', 10)
  const search = searchParams.get('search') || undefined

  try {
    const result = await getArticles({
      category,
      sourceName: source,
      language,
      page,
      limit: Math.min(limit, 100),
      search,
    })

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('Failed to fetch articles:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch articles' },
      { status: 500 }
    )
  }
}
