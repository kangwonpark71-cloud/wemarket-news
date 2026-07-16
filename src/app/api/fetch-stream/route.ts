import { fetchProgressPubSub } from '@/lib/sse/pubsub'

export const dynamic = 'force-dynamic'

export async function GET() {
  const encoder = new TextEncoder()
  let reqCleanup: (() => void) | null = null

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode('event: connected\ndata: {"status":"connected"}\n\n'))

      const unsubscribe = fetchProgressPubSub.subscribe('fetch-progress', (data) => {
        const message = `event: progress\ndata: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(message))
      })

      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode('event: heartbeat\ndata: {}\n\n'))
      }, 15000)

      const unsubscribeComplete = fetchProgressPubSub.subscribe('fetch-complete', (data) => {
        const message = `event: complete\ndata: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(message))
      })

      reqCleanup = () => {
        unsubscribe()
        unsubscribeComplete()
        clearInterval(heartbeat)
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
