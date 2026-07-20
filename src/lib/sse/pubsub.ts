type Listener = (data: unknown) => void

class PubSub {
  private listeners: Map<string, Set<Listener>> = new Map()

  subscribe(event: string, listener: Listener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(listener)
    return () => {
      this.listeners.get(event)?.delete(listener)
    }
  }

  publish(event: string, data: unknown): void {
    const subs = this.listeners.get(event)
    if (subs) {
      for (const listener of subs) {
        try {
          listener(data)
        } catch { /* ignore failed listeners */ }
      }
    }
  }
}

export const fetchProgressPubSub = new PubSub()
