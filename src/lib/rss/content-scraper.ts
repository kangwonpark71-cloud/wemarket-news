import * as cheerio from 'cheerio'

const TIMEOUT = 15000
const MAX_CONTENT_LENGTH = 50000

const USER_AGENT =
  'Mozilla/5.0 (Linux; Android 14; SM-S928N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36'

interface ScrapeResult {
  content: string
  error?: string
}

const SOURCE_PATTERNS: Record<string, { selector: string; clean?: string[] }> = {
  hankyung: {
    selector: '#articletxt, .article-body, [itemprop="articleBody"]',
    clean: ['.ad', '.banner', '.related_news', '.recommend'],
  },
  mk: {
    selector: '.article-body, .news_cnt, [itemprop="articleBody"]',
    clean: ['.ad', '.banner', '.related_news'],
  },
  default: {
    selector: 'article, [role="main"], main, .post-content, .entry-content, #content, .content',
    clean: ['.ad', '.banner', '.sidebar', '.comments', '.nav'],
  },
}

function identifySource(url: string): string {
  if (url.includes('hankyung.com')) return 'hankyung'
  if (url.includes('mk.co.kr')) return 'mk'
  if (url.includes('federalreserve.gov')) return 'fed'
  return 'default'
}

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/&nbsp;/g, ' ')
    .trim()
}

function extractFedContent($: cheerio.CheerioAPI): string {
  const paragraphs: string[] = []
  $('p, .article-body, .col-xs-12, .press-release').each((_, el) => {
    const text = $(el).text().trim()
    if (text.length > 20) paragraphs.push(text)
  })
  return paragraphs.join('\n\n')
}

function extractGeneralContent($: cheerio.CheerioAPI, sourceKey: string): string {
  const config = SOURCE_PATTERNS[sourceKey] || SOURCE_PATTERNS.default
  const contentEl = $(config.selector).first()

  if (contentEl.length === 0) {
    // Fallback: collect all paragraphs
    const paragraphs: string[] = []
    $('p').each((_, el) => {
      const text = $(el).text().trim()
      if (text.length > 30) paragraphs.push(text)
    })
    return paragraphs.join('\n\n')
  }

  // Remove unwanted elements
  if (config.clean) {
    config.clean.forEach((sel) => contentEl.find(sel).remove())
  }

  // Get text from paragraphs within the content element
  const paragraphs: string[] = []
  contentEl.find('p, h1, h2, h3, h4, li, div').each((_, el) => {
    const tag = $(el).prop('tagName')?.toLowerCase() || ''
    const text = $(el).text().trim()
    if (text.length < 10) return

    if (tag === 'li') {
      paragraphs.push(`- ${text}`)
    } else if (tag.startsWith('h')) {
      paragraphs.push(`\n${text}\n`)
    } else {
      paragraphs.push(text)
    }
  })

  if (paragraphs.length === 0) {
    // Ultimate fallback: just get inner text
    return cleanText(contentEl.text())
  }

  return paragraphs.join('\n\n')
}

export async function scrapeArticleContent(url: string): Promise<ScrapeResult> {
  try {
    const sourceKey = identifySource(url)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT)

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
      },
    })
    clearTimeout(timeout)

    if (!response.ok) {
      return { content: '', error: `HTTP ${response.status}: ${response.statusText}` }
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    let content: string
    if (sourceKey === 'fed') {
      content = extractFedContent($)
    } else {
      content = extractGeneralContent($, sourceKey)
    }

    const cleaned = cleanText(content)

    if (cleaned.length < 20) {
      return { content: '', error: 'Could not extract meaningful content' }
    }

    return { content: cleaned.slice(0, MAX_CONTENT_LENGTH) }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { content: '', error: message }
  }
}
