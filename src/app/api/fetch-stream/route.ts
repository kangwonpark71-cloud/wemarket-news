import { fetchProgressPubSub } from '@/lib/sse/pubsub'

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
      if (!safeEnqueue(controller, 'event: connected\ndata: {"status":"connected"}\n\n')) return

      const unsubscribe = fetchProgressPubSub.subscribe('fetch-progress', (data) => {
        safeEnqueue(controller, `event: progress\ndata: ${JSON.stringify(data)}\n\n`)
      })

      const heartbeat = setInterval(() => {
        safeEnqueue(controller, 'event: heartbeat\ndata: {}\n\n')
      }, 15000)

      const unsubscribeComplete = fetchProgressPubSub.subscribe('fetch-complete', (data) => {
        safeEnqueue(controller, `event: complete\ndata: ${JSON.stringify(data)}\n\n`)
      })

      reqCleanup = () => {
        unsubscribe()
        unsubscribeComplete()
        clearInterval(heartbeat)
        isClosed = true
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
