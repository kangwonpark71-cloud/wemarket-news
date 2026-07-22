/**
 * @jest-environment node
 */

import { GET } from '@/app/api/health/route'

describe('/api/health', () => {
  it('returns 200 with status healthy', async () => {
    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.status).toBe('healthy')
    expect(body.timestamp).toBeDefined()
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp)
  })

  it('returns a valid ISO timestamp', async () => {
    const before = Date.now()
    const response = await GET()
    const body = await response.json()
    const after = Date.now()

    const ts = new Date(body.timestamp).getTime()
    expect(ts).toBeGreaterThanOrEqual(before - 1000)
    expect(ts).toBeLessThanOrEqual(after + 1000)
  })
})
