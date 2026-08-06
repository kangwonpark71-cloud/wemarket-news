import { NextRequest, NextResponse } from 'next/server'
import { synthesizeText, type PremiumVoice } from '@/lib/tts/tts-service'
import { getSessionUser } from '@/lib/utils/auth'
import { apiError } from '@/lib/api-response'
import { createLogger } from '@/lib/logger';

const log = createLogger('ApiTts')

const MAX_TTS_CHARS = 4000

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return apiError('Unauthorized', 401)
    }

    const { text, voice } = (await request.json()) as {
      text: string
      voice?: PremiumVoice
    }

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return apiError('text field is required and must be a non-empty string', 400)
    }

    const trimmed = text.trim()
    if (trimmed.length > MAX_TTS_CHARS) {
      return apiError(`Text exceeds maximum length of ${MAX_TTS_CHARS} characters`, 400)
    }

    const normalizedVoice: PremiumVoice =
      voice === 'onyx' ? 'onyx' : 'nova'

    const audioBuffer = await synthesizeText(trimmed, normalizedVoice)
    const blob = new Blob([new Uint8Array(audioBuffer)], { type: 'audio/mpeg' })

    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': blob.size.toString(),
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (error) {
    log.error('[TTS API] Failed to synthesize speech:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return apiError(message, 500)
  }
}
