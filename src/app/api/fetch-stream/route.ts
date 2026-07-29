import { fetchProgressPubSub } from '@/lib/sse/pubsub'
import { createLogger } from '@/lib/logger';

const log = createLogger('ApiFetchstream')

export const dynamic = 'force-dynamic'

export async function GET() {
  const encoder = new TextEncoder()
  let reqCleanup: (() => void) | null = null
  let isClosed = false

  const safeEnqueue = (controller: ReadableStreamDefaultController, chunk: string): boolean => {
    if (isClosed) return false
    try {
      controller.enqueue(encoder.encode(chunk))
      return true
    } catch {
      isClosed = true
      return false
    }
  }

  const stream = new ReadableStream({
    start(controller) {
      try {
        if (!safeEnqueue(controller, 'event: connected\ndata: {"status":"connected"}\n\n')) return

        const unsubscribe = fetchProgressPubSub.subscribe('fetch-progress', (data) => {
          try {
            safeEnqueue(controller, `event: progress\ndata: ${JSON.stringify(data)}\n\n`)
          } catch (e) {
            log.error('[SSE] Failed to enqueue progress:', e)
          }
        })

        const heartbeat = setInterval(() => {
          try {
            safeEnqueue(controller, 'event: heartbeat\ndata: {}\n\n')
          } catch {
            clearInterval(heartbeat)
          }
        }, 15000)

        const unsubscribeComplete = fetchProgressPubSub.subscribe('fetch-complete', (data) => {
          try {
            safeEnqueue(controller, `event: complete\ndata: ${JSON.stringify(data)}\n\n`)
          } catch (e) {
            log.error('[SSE] Failed to enqueue complete:', e)
          }
        })

        reqCleanup = () => {
          unsubscribe()
          unsubscribeComplete()
          clearInterval(heartbeat)
          isClosed = true
        }
      } catch (error) {
        log.error('[SSE] Stream setup failed:', error)
        controller.error(error)
      }
    },
    cancel() {
      if (reqCleanup) reqCleanup()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
