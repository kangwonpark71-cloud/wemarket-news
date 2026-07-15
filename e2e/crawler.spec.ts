import { test, expect } from '@playwright/test';
import { getSourcesByCategory } from '../src/lib/ai-it/sources';
import type { AIITSourceConfig } from '../src/lib/ai-it/sources';

test.describe('Playwright Crawler Sources', () => {
  let crawlerSources: AIITSourceConfig[];

  test.beforeAll(() => {
    crawlerSources = getSourcesByCategory('ai')
      .concat(getSourcesByCategory('it'))
      .filter((s) => s.type === 'crawler');
  });

  test('crawler sources should exist', () => {
    expect(crawlerSources.length).toBeGreaterThan(0);
  });

  test('each crawler source should have required config', () => {
    for (const source of crawlerSources) {
      expect(source.crawlerConfig).toBeDefined();
      expect(source.crawlerConfig!.selector).toBeTruthy();
      expect(source.crawlerConfig!.titleSelector).toBeTruthy();
      expect(source.crawlerConfig!.linkSelector).toBeTruthy();
    }
  });

  test('crawler sources should be distributed across categories', () => {
    const aiCrawlers = crawlerSources.filter((s) => s.category === 'ai');
    const itCrawlers = crawlerSources.filter((s) => s.category === 'it');
    expect(aiCrawlers.length).toBeGreaterThanOrEqual(1);
    expect(itCrawlers.length).toBeGreaterThanOrEqual(1);
  });

  test('crawler sources should have valid URLs', () => {
    for (const source of crawlerSources) {
      expect(() => new URL(source.url)).not.toThrow();
      expect(source.url).toMatch(/^https?:\/\//);
    }
  });

  test('crawler source names should be unique', () => {
    const names = crawlerSources.map((s) => s.nameEn);
    expect(new Set(names).size).toBe(names.length);
  });
});

test.describe('Playwright Crawler Module', () => {
  test('should export required crawl functions', async () => {
    const mod = await import('../src/lib/ai-it/playwright-crawler');
    expect(mod.crawlWithPlaywright).toBeDefined();
    expect(mod.crawlAllWithPlaywright).toBeDefined();
    expect(mod.closeBrowser).toBeDefined();
  });

  test('should have correct type signatures', async () => {
    const mod = await import('../src/lib/ai-it/playwright-crawler');
    expect(typeof mod.crawlWithPlaywright).toBe('function');
    expect(typeof mod.crawlAllWithPlaywright).toBe('function');
    expect(typeof mod.closeBrowser).toBe('function');
  });
});

test.describe('Crawler config validation', () => {
  test('pagination config should be valid when present', () => {
    const { ALL_AIIT_SOURCES } = require('../src/lib/ai-it/sources');
    const crawlers = ALL_AIIT_SOURCES.filter((s: AIITSourceConfig) => s.type === 'crawler');

    for (const source of crawlers) {
      if (source.crawlerConfig?.pagination) {
        expect(['page', 'scroll']).toContain(source.crawlerConfig.pagination.type);
        if (source.crawlerConfig.pagination.maxPages) {
          expect(source.crawlerConfig.pagination.maxPages).toBeGreaterThan(0);
        }
      }
    }
  });
});

test.describe('RSS fallback when crawler unavailable', () => {
  test('non-crawler sources should have type set to rss', () => {
    const { ALL_AIIT_SOURCES } = require('../src/lib/ai-it/sources');
    const nonCrawlers = ALL_AIIT_SOURCES.filter((s: AIITSourceConfig) => s.type !== 'crawler');
    for (const source of nonCrawlers) {
      expect(source.type).toBe('rss');
    }
  });
});
