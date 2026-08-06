/**
 * @jest-environment node
 */

jest.mock('@/lib/db', () => ({
  prisma: { $queryRaw: jest.fn() },
}))

import { GET } from '@/app/api/health/route'
import { prisma } from '@/lib/db'

const queryRaw = jest.mocked(prisma.$queryRaw)

describe('/api/health', () => {
  beforeEach(() => {
    queryRaw.mockResolvedValue([{ ok: 1 }])
  })

  it('returns 200 with status healthy', async () => {
    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.status).toBe('healthy')
    expect(body.timestamp).toBeDefined()
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp)
    expect(body.database).toBe('connected')
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

  it('returns 503 when the database is unavailable', async () => {
    queryRaw.mockRejectedValueOnce(new Error('database unavailable'))

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.status).toBe('unhealthy')
    expect(body.database).toBe('unavailable')
    expect(body.error).toBe('Service unavailable')
  })
})
