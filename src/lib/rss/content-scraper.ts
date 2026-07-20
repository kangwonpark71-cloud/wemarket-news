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
  let cleaned = text
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/&nbsp;/g, ' ')
    .trim();

  cleaned = cleaned.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '');

  cleaned = cleaned
    .replace(/▶\s*네이버\s*(에서)?\s*(메인)?\s*에서\s*.*구독하기/gi, '')
    .replace(/▶\s*.*바로가기/g, '')
    .replace(/무단\s*전재\s*및\s*재배포\s*금지/gi, '')
    .replace(/저작권자\s*ⓒ\s*.*금지/gi, '')
    .replace(/Copyrights\s*ⓒ\s*.*All\s*rights\s*reserved/gi, '')
    .replace(/\[\s*관련\s*기사\s*\]/gi, '');

  return cleaned.replace(/\s+/g, ' ').trim();
}

function isAdOrIcon(src: string, alt: string, className: string): boolean {
  const adKeywords = ['/ad/', 'ad-', '-ad', 'banner', 'promo', 'logo', 'button', 'btn', 'icon', 'share', 'widget', 'loader', 'spinner', 'tracking', 'pixel', 'advertisement', 'pop-up', 'popup'];
  const lowerSrc = src.toLowerCase();
  const lowerAlt = alt.toLowerCase();
  const lowerClass = className.toLowerCase();

  const matchKeyword = adKeywords.some(k => lowerSrc.includes(k) || lowerAlt.includes(k) || lowerClass.includes(k));
  if (matchKeyword) return true;

  if (lowerSrc.includes('spacer.gif') || lowerSrc.includes('pixel.gif') || lowerSrc.includes('blank.gif') || lowerSrc.includes('tracker')) {
    return true;
  }

  return false;
}

function extractFedContent($: cheerio.CheerioAPI): string {
  const paragraphs: string[] = []
  $('p, .article-body, .col-xs-12, .press-release').each((_, el) => {
    const text = $(el).text().trim()
    if (text.length > 20) paragraphs.push(text)
  })
  return paragraphs.join('\n\n')
}

function extractGeneralContent($: cheerio.CheerioAPI, sourceKey: string, articleUrl: string): string {
  const config = SOURCE_PATTERNS[sourceKey] || SOURCE_PATTERNS.default
  const contentEl = $(config.selector).first()

  if (contentEl.length === 0) {
    const paragraphs: string[] = []
    $('p').each((_, el) => {
      const text = $(el).text().trim()
      if (text.length > 30) paragraphs.push(text)
    })
    return paragraphs.join('\n\n')
  }

  if (config.clean) {
    config.clean.forEach((sel) => contentEl.find(sel).remove())
  }

  const paragraphs: string[] = []
  contentEl.find('p, h1, h2, h3, h4, li, img, iframe, a').each((_, el) => {
    const tag = $(el).prop('tagName')?.toLowerCase() || ''
    const text = $(el).text().trim()

    if (tag === 'img') {
      const src = $(el).attr('src') || $(el).attr('data-src') || '';
      const alt = $(el).attr('alt') || '';
      const className = $(el).attr('class') || '';
      const width = parseInt($(el).attr('width') || '100', 10);
      const height = parseInt($(el).attr('height') || '100', 10);

      if (src && !isAdOrIcon(src, alt, className) && width >= 50 && height >= 50) {
        try {
          const resolvedSrc = new URL(src, articleUrl).href;
          paragraphs.push(`![${alt || '기사이미지'}](${resolvedSrc})`);
        } catch {}
      }
      return;
    }

    if (tag === 'iframe') {
      const src = $(el).attr('src') || '';
      if (src.includes('youtube.com') || src.includes('youtu.be')) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = src.match(regExp);
        const videoId = (match && match[2].length === 11) ? match[2] : null;
        if (videoId) {
          paragraphs.push(`[![유튜브 동영상](https://img.youtube.com/vi/${videoId}/0.jpg)](https://www.youtube.com/watch?v=${videoId})`);
        }
      }
      return;
    }

    if (tag === 'a') {
      const href = $(el).attr('href') || '';
      if (href.includes('youtube.com/watch') || href.includes('youtu.be/')) {
        paragraphs.push(`[🎥 유튜브 영상 링크](${href})`);
      }
      return;
    }

    if (text.length < 10) return

    if (tag === 'li') {
      paragraphs.push(`* ${text}`)
    } else if (tag === 'h1') {
      paragraphs.push(`# ${text}`)
    } else if (tag === 'h2') {
      paragraphs.push(`## ${text}`)
    } else if (tag === 'h3') {
      paragraphs.push(`### ${text}`)
    } else if (tag === 'h4') {
      paragraphs.push(`#### ${text}`)
    } else {
      paragraphs.push(text)
    }
  })

  if (paragraphs.length === 0) {
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
      content = extractGeneralContent($, sourceKey, url)
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
