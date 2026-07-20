import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function getSiteUrl(): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL
  if (base) return base.replace(/\/$/, '')
  return ''
}

export function absoluteUrl(path: string): string {
  const base = getSiteUrl()
  if (!base || /^https?:\/\//.test(path)) return path
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`
}

export function formatDate(date: Date | string, language: 'ko' | 'en' = 'ko'): string {
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (language === 'ko') {
    if (diffMins < 1) return '방금 전'
    if (diffMins < 60) return `${diffMins}분 전`
    if (diffHours < 24) return `${diffHours}시간 전`
    if (diffDays < 7) return `${diffDays}일 전`
  } else {
    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
  }

  return d.toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

export async function sendNotificationWebhook(title: string, url: string, sourceName: string, description?: string) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL || process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  const keywords = ['금리', '연준', 'fed', 'bitcoin', '비트코인', 'openai', 'chatgpt', 'claude', 'gemini', 'sora', '시총', 'nvidia', '엔비디아', '삼성전자'];
  const lowercaseTitle = title.toLowerCase();
  const isImportant = keywords.some(k => lowercaseTitle.includes(k));
  if (!isImportant) return;

  try {
    const isDiscord = webhookUrl.includes('discord.com');
    let body = '';

    if (isDiscord) {
      body = JSON.stringify({
        content: `🚨 **[핫 브레이킹 뉴스]** ${title}`,
        embeds: [{
          title: title,
          url: url,
          description: description || '본문 요약 및 정보 확인은 위마켓_뉴스 지면을 확인하세요.',
          color: 15158332,
          footer: { text: `출처: ${sourceName} | 위마켓_뉴스 3시간 알림 비서` },
        }]
      });
    } else {
      body = JSON.stringify({
        text: `🚨 *[핫 브레이킹 뉴스]*\n*제목*: <${url}|${title}>\n*출처*: ${sourceName}\n*요약*: ${description || '본문 요약 및 정보 확인은 위마켓_뉴스 지면을 확인하세요.'}`
      });
    }

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
  } catch {
  }
}
