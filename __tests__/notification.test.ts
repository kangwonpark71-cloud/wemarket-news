/**
 * Notification / Webhook Tests
 *
 * Tests for sendNotificationWebhook in src/lib/utils.ts:
 * - No webhook URL configured → skip silently
 * - Title matches hot keyword → POST to webhook
 * - Title does not match → skip silently
 * - Discord format (webhook URL contains discord.com)
 * - Slack format (any other webhook URL)
 * - Fetch fails → handled gracefully (no throw)
 */

// global.fetch is available in next/jest jsdom environment;
// assign a mock before importing the module under test
const mockFetch = jest.fn()
global.fetch = mockFetch as unknown as typeof global.fetch

import { sendNotificationWebhook } from '@/lib/utils'

describe('sendNotificationWebhook', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    mockFetch.mockReset()
  })

  afterAll(() => {
    process.env = originalEnv
    global.fetch = undefined as unknown as typeof global.fetch
  })

  it('does nothing when no webhook URL is configured', async () => {
    delete process.env.DISCORD_WEBHOOK_URL
    delete process.env.SLACK_WEBHOOK_URL

    await sendNotificationWebhook('Test Title', 'https://example.com', 'TestSource')

    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('skips notification when title has no hot keyword', async () => {
    process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/test'
    mockFetch.mockResolvedValue({ ok: true } as Response)

    await sendNotificationWebhook(
      '일반 경제 뉴스입니다',
      'https://example.com',
      '한국경제',
    )

    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('sends Discord webhook when title contains 금리', async () => {
    process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/test123'
    mockFetch.mockResolvedValue({ ok: true } as Response)

    await sendNotificationWebhook(
      '한국은행 금리 인상 발표',
      'https://example.com/123',
      '한국경제',
      '금리 인상 관련 기사입니다',
    )

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toBe('https://discord.com/api/webhooks/test123')
    expect(options?.method).toBe('POST')

    const body = JSON.parse(options?.body as string)
    expect(body.content).toContain('금리')
    expect(body.embeds[0].title).toContain('금리')
    expect(body.embeds[0].url).toBe('https://example.com/123')
    expect(body.embeds[0].footer.text).toContain('한국경제')
  })

  it('sends Slack webhook when SLACK_WEBHOOK_URL is set', async () => {
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/test456'
    delete process.env.DISCORD_WEBHOOK_URL
    mockFetch.mockResolvedValue({ ok: true } as Response)

    await sendNotificationWebhook(
      '비트코인 1억 돌파',
      'https://example.com/btc',
      '매일경제',
    )

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toBe('https://hooks.slack.com/services/test456')

    const body = JSON.parse(options?.body as string)
    expect(body.text).toContain('비트코인')
    expect(body.text).toContain('매일경제')
  })

  it('sends Discord when both DISCORD and SLACK are configured (Discord優先)', async () => {
    process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/discord'
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/slack'
    mockFetch.mockResolvedValue({ ok: true } as Response)

    await sendNotificationWebhook(
      'Fed 금리 결정 발표',
      'https://example.com/fed',
      'Fed Press',
    )

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url] = mockFetch.mock.calls[0]
    expect(url).toBe('https://discord.com/api/webhooks/discord')
  })

  it('handles fetch failure gracefully (no throw)', async () => {
    process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/test'
    mockFetch.mockRejectedValue(new Error('Network error'))

    await expect(
      sendNotificationWebhook('엔비디아 주가 급등', 'https://example.com/nvda', '한국경제'),
    ).resolves.toBeUndefined()

    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('detects English keywords (openai, chatgpt, nvidia, etc.)', async () => {
    process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/test'
    mockFetch.mockResolvedValue({ ok: true } as Response)

    await sendNotificationWebhook(
      'OpenAI announces ChatGPT Pro with GPT-5 integration',
      'https://example.com/openai',
      'TechCrunch',
    )

    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('detects Korean keywords (시총, 삼성전자)', async () => {
    process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/test'
    mockFetch.mockResolvedValue({ ok: true } as Response)

    await sendNotificationWebhook(
      '삼성전자 시총 500조 돌파',
      'https://example.com/samsung',
      '한국경제',
    )

    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})