import { NextResponse } from 'next/server'
import { summarizeWithLLM } from '@/lib/ai/llm-service'
import { createLogger } from '@/lib/logger';

const log = createLogger('ApiAiSummarize')

export async function POST(request: Request) {
  try {
    const { title, description, content } = await request.json()

    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { success: false, error: 'title is required (string)' },
        { status: 400 }
      )
    }

    const result = await summarizeWithLLM(title, description, content)

    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    log.error('[POST /api/ai/summarize]', message)
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
