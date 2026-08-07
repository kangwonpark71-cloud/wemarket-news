import { KoreaInvestmentService, koreaInvestmentService, KoreaInvestmentClient, YahooFinanceClient } from '@/lib/services/financial/financial-service';

// Force fallback-mock mode: no real KIS credentials present.
process.env.KOREA_INVEST_APP_KEY = '';
process.env.KOREA_INVEST_APP_SECRET = '';

describe('KoreaInvestmentService (mock / simulated mode)', () => {
  const service = new KoreaInvestmentService();

  it('reports isSimulated=true when no real credentials are configured', () => {
    expect(service.isSimulated).toBe(true);
  });

  it('getMarketOverview returns indices tagged with simulated:true', async () => {
    const overview = await service.getMarketOverview();
    expect(overview.simulated).toBe(true);
    expect(typeof overview.kospi.value).toBe('number');
    expect(typeof overview.kosdaq.value).toBe('number');
    expect(Number.isFinite(overview.kospi.value)).toBe(true);
  });

  it('getStockPrice returns a deterministic mock entry for a known code', async () => {
    const price = await service.getStockPrice('005930');
    expect(price).not.toBeNull();
    expect(price!.code).toBe('005930');
    expect(price!.name).toBe('삼성전자');
    expect(typeof price!.price).toBe('number');
    expect(Number.isFinite(price!.changeRate)).toBe(true);
  });

  it('getStockPrices returns a map keyed by code', async () => {
    const prices = await service.getStockPrices(['005930', '000660']);
    expect(prices.size).toBe(2);
    expect(prices.get('005930')!.name).toBe('삼성전자');
    expect(prices.get('000660')!.name).toBe('SK하이닉스');
  });

  it('re-exports the koreaInvestmentService singleton', async () => {
    const price = await koreaInvestmentService.getStockPrice('005930');
    expect(price?.code).toBe('005930');
  });

  it('re-exports KoreaInvestmentClient usable in mock mode', () => {
    const client = new KoreaInvestmentClient();
    expect(client.isConfigured()).toBe(false);
  });

  it('re-exports YahooFinanceClient', () => {
    const client = new YahooFinanceClient();
    expect(typeof client.getStockPrice).toBe('function');
  });
});
