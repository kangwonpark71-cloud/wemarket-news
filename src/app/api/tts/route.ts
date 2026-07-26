import { NextRequest, NextResponse } from 'next/server'
import { synthesizeText, type PremiumVoice } from '@/lib/tts/tts-service'

export async function POST(request: NextRequest) {
  try {
    const { text, voice } = (await request.json()) as {
      text: string
      voice?: PremiumVoice
    }

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'text field is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    const normalizedVoice: PremiumVoice =
      voice === 'onyx' ? 'onyx' : 'nova'

    const audioBuffer = await synthesizeText(text.trim(), normalizedVoice)
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
    console.error('[TTS API] Failed to synthesize speech:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
