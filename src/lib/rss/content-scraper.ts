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
  yonhapnewstv: {
    selector: '.news_CNT, .article_body, .article-content, [itemprop="articleBody"], article .content',
    clean: [
      '.ad', '.banner', '.related_news', '.recommend', '.sns_area', '.btn_area',
      '.video_area', '.player_area', '.tag_area', '.news_keyword', '.article_tag',
      '.social_share', '.share_area', '.comment_area', '.replay_area',
    ],
  },
  default: {
    selector: 'article, [role="main"], main, .post-content, .entry-content, #content, .content',
    clean: ['.ad', '.banner', '.sidebar', '.comments', '.nav'],
  },
}

function identifySource(url: string): string {
  if (url.includes('hankyung.com')) return 'hankyung'
  if (url.includes('mk.co.kr')) return 'mk'
  if (url.includes('yonhapnewstv.co.kr')) return 'yonhapnewstv'
  if (url.includes('federalreserve.gov')) return 'fed'
  return 'default'
}

function cleanText(text: string): string {
  let cleaned = text
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/&nbsp;/g, ' ')
    .trim();

  // 이메일 주소 제거
  cleaned = cleaned.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '');

  // 네이버 구독/바로가기
  cleaned = cleaned
    .replace(/▶\s*네이버\s*(에서)?\s*(메인)?\s*에서\s*.*구독하기/gi, '')
    .replace(/▶\s*.*바로가기/g, '');

  // 저작권/무단전재 고지
  cleaned = cleaned
    .replace(/무단\s*전재\s*및?\s*재배포\s*(금지|합니다)/gi, '')
    .replace(/저작권자\s*ⓒ\s*.*금지/gi, '')
    .replace(/Copyrights?\s*ⓒ\s*.*All\s*rights?\s*reserved/gi, '')
    .replace(/ⓒ\s*\S+.*무단\s*전재-재배포/gi, '')
    .replace(/ⓒ\S+.*(?:전재|재배포|학습|활용)\s*금지/gi, '');

  // 관련기사
  cleaned = cleaned.replace(/\[\s*관련\s*기사\s*\]/gi, '');

  // 비디오 태그 미지원 메시지
  cleaned = cleaned
    .replace(/브라우저가\s*video\s*태그를\s*지원하지\s* 않습니다[^.]*\./gi, '')
    .replace(/죄송하지만\s*다른\s*브라우저를\s*사용하여\s*주십시오\.?/gi, '');

  // SNS/메신저 홍보 (카카오톡, 라인, 텔레그램 등)
  cleaned = cleaned
    .replace(/.*(?:카카오톡|카톡)\s*앱에서\s*['"]?\w+['"]?\s*친구\s*추가.*/gi, '')
    .replace(/.*라인\s*앱에서\s*['"]?\w+['"]?\s*친구\s*추가.*/gi, '')
    .replace(/.*텔레그램에서\s*['"]?\w+['"]?\s*(친구|채널)\s*추가.*/gi, '')
    .replace(/.*당신이\s*담은\s*순간이\s*뉴스입니다.*/gi, '');

  // 좋아요/응원해요/후속원해요 등 버튼 텍스트
  cleaned = cleaned
    .replace(/좋아요\s*\d+/g, '')
    .replace(/응원해요\s*\d+/g, '')
    .replace(/후속\s*원해요\s*\d+/g, '')
    .replace(/댓글\s*\d+/g, '')
    .replace(/공유\s*\d*/g, '');

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

    if (tag === 'video') {
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

export function stripJunkPatterns(text: string): string {
  let cleaned = text;

  cleaned = cleaned.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '');

  cleaned = cleaned
    .replace(/▶\s*네이버\s*(에서)?\s*(메인)?\s*에서\s*.*구독하기/gi, '')
    .replace(/▶\s*.*바로가기/g, '');

  cleaned = cleaned
    .replace(/무단\s*전재\s*및?\s*재배포\s*(금지|합니다)/gi, '')
    .replace(/저작권자\s*ⓒ\s*.*금지/gi, '')
    .replace(/Copyrights?\s*ⓒ\s*.*All\s*rights?\s*reserved/gi, '')
    .replace(/ⓒ\s*\S+.*무단\s*전재-재배포/gi, '')
    .replace(/ⓒ\S+.*(?:전재|재배포|학습|활용)\s*금지/gi, '');

  cleaned = cleaned.replace(/\[\s*관련\s*기사\s*\]/gi, '');

  cleaned = cleaned
    .replace(/브라우저가\s*video\s*태그를\s*지원하지\s* 않습니다[^.]*\./gi, '')
    .replace(/죄송하지만\s*다른\s*브라우저를\s*사용하여\s*주십시오\.?/gi, '');

  cleaned = cleaned
    .replace(/.*(?:카카오톡|카톡)\s*앱에서\s*['"]?\w+['"]?\s*친구\s*추가.*/gim, '')
    .replace(/.*라인\s*앱에서\s*['"]?\w+['"]?\s*친구\s*추가.*/gim, '')
    .replace(/.*텔레그램에서\s*['"]?\w+['"]?\s*(친구|채널)\s*추가.*/gim, '')
    .replace(/.*당신이\s*담은\s*순간이\s*뉴스입니다.*/gim, '');

  cleaned = cleaned
    .replace(/좋아요\s*\d+/g, '')
    .replace(/응원해요\s*\d+/g, '')
    .replace(/후속\s*원해요\s*\d+/g, '')
    .replace(/댓글\s*\d+/g, '')
    .replace(/공유\s*\d*/g, '');

  return cleaned.replace(/\n{3,}/g, '\n\n').trim();
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