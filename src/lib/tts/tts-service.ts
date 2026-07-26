const TTS_API_URL = 'https://api.openai.com/v1/audio/speech'

export type PremiumVoice = 'nova' | 'onyx'

function getApiKey(): string {
  const key = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY
  if (!key) {
    throw new Error('TTS API key not configured.')
  }
  return key
}

/**
 * Split Korean/English text into sentence-sized chunks under maxChars.
 * Keeps sentences intact — splits at punctuation (., !, ?) or newlines.
 */
function chunkText(text: string, maxChars = 3800): string[] {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (cleaned.length <= maxChars) return [cleaned]

  const chunks: string[] = []
  const sentenceEnd = /(?<=[.!?…])\s+|(?<=[.!?…])$|(?<=[.!?…])\n/gm

  let start = 0
  while (start < cleaned.length) {
    if (cleaned.length - start <= maxChars) {
      chunks.push(cleaned.slice(start))
      break
    }

    const slice = cleaned.slice(start, start + maxChars)
    const lastBreak = slice.search(sentenceEnd)

    if (lastBreak > 0) {
      chunks.push(slice.slice(0, lastBreak + 1).trim())
      start += lastBreak + 1
    } else {
      const lastSpace = slice.lastIndexOf(' ')
      if (lastSpace > 0) {
        chunks.push(slice.slice(0, lastSpace).trim())
        start += lastSpace + 1
      } else {
        chunks.push(slice.trim())
        start += maxChars
      }
    }
  }

  return chunks.filter((c) => c.length > 0)
}

/**
 * Synthesize a short text chunk via OpenAI TTS API.
 * Returns raw MP3 bytes as Buffer.
 */
async function synthesizeChunk(text: string, voice: PremiumVoice): Promise<Buffer> {
  const response = await fetch(TTS_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: 'tts-1-hd',
      voice,
      input: text,
      response_format: 'mp3',
      speed: 1.0,
    }),
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => 'unknown')
    throw new Error(`TTS API error ${response.status}: ${errText}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/**
 * Synthesize full text to MP3 audio.
 * Handles long text by splitting into chunks and concatenating MP3 buffers.
 */
export async function synthesizeText(text: string, voice: PremiumVoice = 'nova'): Promise<Buffer> {
  const chunks = chunkText(text)
  if (chunks.length === 0) throw new Error('No text to synthesize')

  const buffers = await Promise.all(chunks.map((chunk) => synthesizeChunk(chunk, voice)))
  return Buffer.concat(buffers)
}
