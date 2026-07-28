'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const BATCH_TRANSLATE_API = '/api/articles/translate-batch'
const BATCH_SIZE = 10

export default function AutoTranslator() {
  const router = useRouter()
  const hasTriggered = useRef(false)

  useEffect(() => {
    if (hasTriggered.current) return
    hasTriggered.current = true

    let timeoutId: NodeJS.Timeout

    async function translateBatch() {
      try {
        const res = await fetch(BATCH_TRANSLATE_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ limit: BATCH_SIZE }),
        })
        const data = await res.json()

        if (data.success && data.translated > 0) {
          // Refresh the page to show translated titles
          router.refresh()
        }
      } catch {
        // Silently fail — user can still manually translate
      }
    }

    // Delay translation slightly so page renders first
    timeoutId = setTimeout(translateBatch, 1000)

    return () => clearTimeout(timeoutId)
  }, [router])

  return null
}
