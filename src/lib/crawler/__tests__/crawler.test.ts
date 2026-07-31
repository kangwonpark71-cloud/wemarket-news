import {
  createMockSource,
  createMockCrawlerSource,
  createMockArticle,
  createMockArticles,
  createMockFetchResult,
  expectValidArticle,
  expectValidFetchResult,
} from '@/lib/test-utils';
import { isExcludedByKeywords } from '@/lib/crawler/rss-crawler';

describe('Crawler Test Infrastructure', () => {
  describe('Test Utilities', () => {
    it('createMockSource creates valid source with defaults', () => {
      const source = createMockSource();
      expect(source.name).toBe('Test Source');
      expect(source.type).toBe('rss');
      expect(source.url).toContain('example.com');
    });

    it('createMockSource applies overrides', () => {
      const source = createMockSource({
        name: 'Custom',
        nameEn: 'custom',
        type: 'crawler',
      });
      expect(source.name).toBe('Custom');
      expect(source.nameEn).toBe('custom');
      expect(source.type).toBe('crawler');
    });

    it('createMockCrawlerSource includes crawlerConfig', () => {
      const source = createMockCrawlerSource();
      expect(source.type).toBe('crawler');
      expect(source.crawlerConfig).toBeDefined();
      expect(source.crawlerConfig!.selector).toBe('.article');
    });

    it('createMockArticle creates valid article with defaults', () => {
      const article = createMockArticle();
      expectValidArticle(article);
      expect(article.title).toBe('Test Article Title');
    });

    it('createMockArticle applies overrides', () => {
      const article = createMockArticle({
        title: 'Custom Title',
        url: 'https://custom.example.com',
      });
      expect(article.title).toBe('Custom Title');
      expect(article.url).toBe('https://custom.example.com');
    });

    it('createMockArticles generates correct count', () => {
      const articles = createMockArticles(5);
      expect(articles).toHaveLength(5);
      expect(articles[0].title).toBe('Test Article 1');
      expect(articles[4].title).toBe('Test Article 5');
    });

    it('createMockFetchResult creates valid result', () => {
      const source = createMockSource();
      const articles = createMockArticles(3);
      const result = createMockFetchResult(source, articles);
      expectValidFetchResult(result);
      expect(result.articles).toHaveLength(3);
    });

    it('expectValidArticle passes for valid article', () => {
      const article = createMockArticle();
      expect(() => expectValidArticle(article)).not.toThrow();
    });

    it('expectValidArticle fails for invalid article', () => {
      const article = createMockArticle({ title: '' });
      expect(() => expectValidArticle(article)).toThrow();
    });
  });

  describe('RSSCrawler', () => {
    let RSSCrawler: typeof import('@/lib/crawler/rss-crawler').RSSCrawler;

    beforeAll(async () => {
      jest.resetModules();
      jest.doMock('rss-parser', () => {
        return jest.fn().mockImplementation(() => ({
          parseURL: jest.fn().mockResolvedValue({
            feed: {
              items: [
                {
                  title: 'Mock RSS Article',
                  link: 'https://example.com/rss-article',
                  contentSnippet: 'RSS snippet',
                  pubDate: 'Mon, 15 Jan 2024 10:30:00 GMT',
                },
              ],
            },
          }),
        }));
      });
      const mod = await import('@/lib/crawler/rss-crawler');
      RSSCrawler = mod.RSSCrawler;
    });

    it('has correct name', () => {
      const crawler = new RSSCrawler();
      expect(crawler.name).toBe('RSSCrawler');
    });

    it('fetch returns parsed articles from mock RSS', async () => {
      const crawler = new RSSCrawler();
      const source = createMockSource({ url: 'https://mock.example.com/feed' });

      const result = await crawler.fetch(source);

      expect(result.error).toBeUndefined();
      expect(result.articles.length).toBeGreaterThan(0);
      expect(result.articles[0].title).toBe('Mock RSS Article');
      expectValidFetchResult(result);
    });

    it('fetch returns error result when parser fails', async () => {
      const crawler = new RSSCrawler();
      const source = createMockSource({ url: 'https://fail.example.com/feed' });

      jest.spyOn(crawler['parser'], 'parseURL').mockRejectedValue(
        new Error('Network error'),
      );

      const result = await crawler.fetch(source);

      expect(result.error).toBeDefined();
      expect(result.articles).toHaveLength(0);
      expect(result.sourceNameEn).toBe(source.nameEn);
    }, 30000);

    it('fetchAll handles multiple sources', async () => {
      jest.resetModules();
      jest.doMock('rss-parser', () => {
        return jest.fn().mockImplementation(() => ({
          parseURL: jest.fn().mockResolvedValue({
            feed: {
              items: [
                {
                  title: 'Multi Article',
                  link: 'https://example.com/multi',
                  contentSnippet: 'Multi snippet',
                  pubDate: 'Mon, 15 Jan 2024 10:30:00 GMT',
                },
              ],
            },
          }),
        }));
      });
      const { RSSCrawler: MultiRSSCrawler } = await import('@/lib/crawler/rss-crawler');

      const crawler = new MultiRSSCrawler();
      const sources = [
        createMockSource({ nameEn: 'source1', url: 'https://rss1.example.com/feed' }),
        createMockSource({ nameEn: 'source2', url: 'https://rss2.example.com/feed' }),
      ];

      const results = await crawler.fetchAll(sources);

      expect(results.size).toBe(2);
      expect(results.has('source1')).toBe(true);
      expect(results.has('source2')).toBe(true);
    });
  });

  describe('UnifiedCrawler routing', () => {
    it('creates instance without errors', async () => {
      const { UnifiedCrawler } = await import('@/lib/crawler');
      const crawler = new UnifiedCrawler();
      expect(crawler.name).toBe('UnifiedCrawler');
    });

    it('fetchAll handles empty source list', async () => {
      const { UnifiedCrawler } = await import('@/lib/crawler');
      const crawler = new UnifiedCrawler();
      const results = await crawler.fetchAll([]);
      expect(results.size).toBe(0);
    });
  });
});

describe('isExcludedByKeywords', () => {
  it('returns false when no keywords configured', () => {
    expect(isExcludedByKeywords('코스피 폭등', undefined)).toBe(false);
    expect(isExcludedByKeywords('코스피 폭등', [])).toBe(false);
  });

  it('returns true when title contains a keyword', () => {
    expect(isExcludedByKeywords('코스피, 단숨에 6,400선 회복', ['코스피'])).toBe(true);
  });

  it('returns false when title does not match', () => {
    expect(isExcludedByKeywords('EPL 토트넘, 리버풀 꺾고 4강 진출', ['코스피', '비트코인'])).toBe(false);
  });

  it('matches case-insensitively', () => {
    expect(isExcludedByKeywords('Bitcoin surges to new high', ['bitcoin'])).toBe(true);
  });

  it('skips empty keyword strings', () => {
    expect(isExcludedByKeywords('일반 스포츠 뉴스', ['', '  '])).toBe(false);
  });
});
