/**
 * briefing-service.test.ts
 * Unit tests for pure helpers: extractKeywords, buildOverview.
 * (DB/network-backed getTodayBriefing is exercised via e2e/api smoke tests.)
 */
import { extractKeywords, buildOverview } from '@/lib/services/briefing/briefing-service';

jest.mock('@/lib/db', () => ({
  prisma: {},
}));

describe('extractKeywords', () => {
  it('counts tokens repeated across titles', () => {
    const result = extractKeywords(['삼성전자 주가 급등', '삼성전자 실적 발표', '삼성전자 신제품 공개']);
    const samsung = result.find((k) => k.keyword === '삼성전자');
    expect(samsung).toBeDefined();
    expect(samsung!.count).toBe(3);
  });

  it('filters stopwords', () => {
    const result = extractKeywords(['합니다 뉴스 기자 시장 경제 코스피']);
    const keywords = result.map((k) => k.keyword);
    expect(keywords).not.toContain('합니다');
    expect(keywords).not.toContain('뉴스');
    expect(keywords).toContain('코스피');
  });

  it('keeps english acronyms', () => {
    const result = extractKeywords(['FOMC 회의 결과 발표', 'FOMC 금리 결정']);
    expect(result.find((k) => k.keyword === 'FOMC')).toBeDefined();
  });

  it('respects the limit', () => {
    const result = extractKeywords(['A 하나 둘 셋 넷 다섯 여섯 일곱 여덟 아홉 열', 'B 하나 둘 셋 넷 다섯 여섯 일곱 여덟 아홉 열'], 3);
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it('returns empty array for empty input', () => {
    expect(extractKeywords([])).toEqual([]);
  });

  it('extracts recurring n-grams from long hangul tokens', () => {
    const result = extractKeywords([
      '반도체수출호조 전망 밝아',
      '반도체수출호조 기록 세워',
      '반도체수출호조 지속',
    ]);
    const gram = result.find((k) => k.keyword === '반도체수출호조' || k.keyword === '반도체수출' || k.keyword === '도체수출');
    expect(gram).toBeDefined();
    expect(gram!.count).toBeGreaterThanOrEqual(2);
  });
});

describe('buildOverview', () => {
  it('returns undefined for undefined snapshot', () => {
    expect(buildOverview(undefined)).toBeUndefined();
  });

  it('returns undefined for empty snapshot', () => {
    expect(buildOverview({})).toBeUndefined();
  });

  it('composes korean overview from available quotes', () => {
    const overview = buildOverview({
      kospi: { value: 2650.12, change: 22.3, changeRate: 0.85 },
      usdKrw: { price: 1330.5, changeRate: -0.2 },
      btc: { price: 120000000, changeRate: 2.5 },
    });
    expect(overview).toBeDefined();
    expect(overview).toContain('코스피 2,650');
    expect(overview).toContain('+0.85%');
    expect(overview).toContain('원/달러 1330.5원');
    expect(overview).toContain('비트코인');
  });

  it('formats negative rates with minus sign', () => {
    const overview = buildOverview({
      kospi: { value: 2600, change: -20, changeRate: -0.76 },
    });
    expect(overview).toContain('-0.76%');
  });
});
