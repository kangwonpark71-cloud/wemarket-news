'use client';

import { useEffect, useState } from 'react';
import { FinancialDashboard } from '@/components/financial/FinancialDashboard';
import { FinancialChart } from '@/components/financial/FinancialChart';
import { formatKRW, formatNumber } from '@/lib/utils/format';

interface StockData {
  code: string;
  name: string;
  price?: number;
  change?: number;
  changeRate?: number;
  openPrice?: number;
  highPrice?: number;
  lowPrice?: number;
  volume?: number;
  tradingValue?: number;
  marketCap?: number;
  timestamp?: string;
  market?: string;
  sector?: string;
  industry?: string;
  listingDate?: string;
}

interface StockMasterData {
  code: string;
  name: string;
  market: string;
  sector?: string;
  industry?: string;
  listingDate?: string;
}

interface StockPriceData {
  code: string;
  price?: number;
  change?: number;
  changeRate?: number;
  openPrice?: number;
  highPrice?: number;
  lowPrice?: number;
  volume?: number;
  tradingValue?: number;
  marketCap?: number;
  timestamp?: string;
}

interface StockDetailData {
  price: StockData;
  master: { sector?: string; industry?: string; listingDate?: string; market?: string } | null;
  week52: { high: number; highDate: string | null; low: number; lowDate: string | null } | null;
}

export function StockPage() {
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [masterData, setMasterData] = useState<StockMasterData[]>([]);
  const [loading, setLoading] = useState(true);
  const [market, setMarket] = useState<'KOSPI' | 'KOSDAQ' | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'changeRate' | 'volume' | 'price'>('changeRate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedStock, setSelectedStock] = useState<StockData | null>(null);
  const [stockDetail, setStockDetail] = useState<StockDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchMasterData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/financial/stocks?action=master');
      const json = await res.json();
      if (json.success) {
        setMasterData(json.data);
      }
    } catch (error) {
      console.error('Failed to fetch stock master:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchMasterData();
    const interval = setInterval(fetchMasterData, 60000);
    return () => clearInterval(interval);
  }, [market]);

  useEffect(() => {
    if (masterData.length === 0) return;

    const filtered = masterData.filter((stock) => {
      if (market !== 'ALL' && stock.market !== market) return false;
      if (search && !stock.name.toLowerCase().includes(search.toLowerCase()) && !stock.code.includes(search)) return false;
      return true;
    });

    const codes = filtered.map((s) => s.code).slice(0, 200);

    const fetchPrices = async () => {
      if (codes.length === 0) {
        setStocks([]);
        return;
      }

      try {
        const res = await fetch(`/api/financial/stocks?action=prices&codes=${codes.join(',')}`);
        const json = await res.json();
        if (json.success) {
          const priceMap = new Map(json.data.map((s: StockPriceData) => [s.code, s]));
          const stocksWithPrices = filtered.map((stock) => {
            const priceData = priceMap.get(stock.code);
            return priceData ? { ...stock, ...priceData } : stock;
          }) as StockData[];

          stocksWithPrices.sort((a, b) => {
            const aVal = a[sortBy] ?? 0;
            const bVal = b[sortBy] ?? 0;
            return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
          });

          setStocks(stocksWithPrices);
        }
      } catch (error) {
        console.error('Failed to fetch prices:', error);
      }
    };

    void fetchPrices();
  }, [masterData, market, search, sortBy, sortOrder]);

  const handleSort = (field: 'changeRate' | 'volume' | 'price') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleRowClick = async (stock: StockData) => {
    setSelectedStock(stock);
    setStockDetail(null);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/financial/stocks?action=detail&code=${stock.code}`);
      const json = await res.json();
      if (json.success) {
        setStockDetail(json.data);
      }
    } catch (error) {
      console.error('Failed to fetch stock detail:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  if (loading && masterData.length === 0) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-border bg-muted p-6 h-32" />
          ))}
        </div>
        <div className="mt-6 rounded-xl border border-border bg-muted p-6 animate-pulse">
          <div className="h-4 bg-border rounded w-1/4 mb-4"></div>
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-border rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const filteredStocks = stocks.filter((s) => s.price !== undefined);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">주식 시장</h1>
        <p className="text-sm text-muted-foreground mt-1">KOSPI, KOSDAQ 실시간 시세와 종목별 상세 정보</p>
      </div>

          <FinancialDashboard />

          <div className="mt-6 flex flex-wrap gap-2">
            <button
              onClick={() => setMarket('ALL')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                market === 'ALL'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background border border-border hover:bg-muted'
              }`}
            >
              전체
            </button>
            <button
              onClick={() => setMarket('KOSPI')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                market === 'KOSPI'
                  ? 'bg-blue-500 text-white'
                  : 'bg-background border border-border hover:bg-muted'
              }`}
            >
              KOSPI
            </button>
            <button
              onClick={() => setMarket('KOSDAQ')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                market === 'KOSDAQ'
                  ? 'bg-blue-500 text-white'
                  : 'bg-background border border-border hover:bg-muted'
              }`}
            >
              KOSDAQ
            </button>
            <div className="ml-auto flex items-center gap-2">
              <input
                type="search"
                placeholder="종목명/코드 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary sm:w-64"
              />
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">순위</th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted"
                    onClick={() => handleSort('price')}
                  >
                    종목명 <span className="ml-1">{sortBy === 'price' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</span>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted" onClick={() => handleSort('price')}>
                    현재가 <span className="ml-1">{sortBy === 'price' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</span>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted" onClick={() => handleSort('changeRate')}>
                    등락률 <span className="ml-1">{sortBy === 'changeRate' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</span>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">전일대비</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted" onClick={() => handleSort('volume')}>
                    거래량 <span className="ml-1">{sortBy === 'volume' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</span>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">거래대금</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">시가총액</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredStocks.map((stock, index) => (
                  <tr
                    key={stock.code}
                    onClick={() => handleRowClick(stock)}
                    className="hover:bg-muted cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-muted-foreground">{index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{stock.name}</div>
                      <div className="text-xs text-muted-foreground">{stock.code}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-foreground">
                      {formatKRW(stock.price)}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${stock.changeRate && stock.changeRate >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                      {stock.changeRate && stock.changeRate >= 0 ? '▲' : '▼'} {Math.abs(stock.changeRate || 0).toFixed(2)}%
                    </td>
                    <td className={`px-4 py-3 text-right ${stock.change && stock.change >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                      {stock.change && stock.change >= 0 ? '▲' : '▼'} {formatNumber(Math.abs(stock.change || 0))}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                      {formatNumber(stock.volume || 0)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                      {formatNumber(stock.tradingValue || 0)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                      {stock.marketCap ? formatNumber(stock.marketCap) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedStock && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
              <div className="bg-background rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
                <div className="p-4 border-b border-border flex items-center justify-between sticky top-0 bg-background z-10">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-bold text-foreground">{selectedStock.name}</h2>
                    <span className="text-sm text-muted-foreground">({selectedStock.code})</span>
                    {stockDetail?.master?.market && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">{stockDetail.master.market}</span>
                    )}
                    {stockDetail?.master?.sector && (
                      <span className="px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">{stockDetail.master.sector}</span>
                    )}
                    {stockDetail?.master?.industry && (
                      <span className="px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">{stockDetail.master.industry}</span>
                    )}
                  </div>
                  <button onClick={() => { setSelectedStock(null); setStockDetail(null); }} className="text-muted-foreground hover:text-foreground text-xl">×</button>
                </div>

                <div className="p-4 space-y-4">
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-bold text-foreground">{formatKRW(selectedStock.price)}</span>
                    <span className={`text-lg font-bold ${selectedStock.change && selectedStock.change >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                      {selectedStock.change && selectedStock.change >= 0 ? '▲' : '▼'} {formatNumber(Math.abs(selectedStock.change || 0))}
                    </span>
                    <span className={`text-lg font-bold ${selectedStock.changeRate && selectedStock.changeRate >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                      ({selectedStock.changeRate && selectedStock.changeRate >= 0 ? '+' : ''}{Number(selectedStock.changeRate ?? 0).toFixed(2)}%)
                    </span>
                  </div>

                  <div className="border border-border rounded-lg overflow-hidden">
                    {detailLoading ? (
                      <div className="h-[240px] bg-muted animate-pulse flex items-center justify-center text-sm text-muted-foreground">차트 로딩 중...</div>
                    ) : (
                      <FinancialChart symbol={selectedStock.code} type="STOCK" height={240} />
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: '현재가', value: formatKRW(selectedStock.price) },
                      { label: '전일대비', value: `${selectedStock.change && selectedStock.change >= 0 ? '▲' : '▼'} ${formatNumber(Math.abs(selectedStock.change || 0))}`, color: selectedStock.change && selectedStock.change >= 0 ? 'text-red-500' : 'text-blue-500' },
                      { label: '등락률', value: `${selectedStock.changeRate && selectedStock.changeRate >= 0 ? '+' : ''}${Number(selectedStock.changeRate ?? 0).toFixed(2)}%`, color: selectedStock.changeRate && selectedStock.changeRate >= 0 ? 'text-red-500' : 'text-blue-500' },
                      { label: '거래량', value: formatNumber(selectedStock.volume || 0) },
                      { label: '거래대금', value: formatKRW(selectedStock.tradingValue || 0) },
                      { label: '시가총액', value: selectedStock.marketCap ? formatKRW(selectedStock.marketCap) : '-' },
                      { label: '시가', value: formatKRW(selectedStock.openPrice) },
                      { label: '고가', value: formatKRW(selectedStock.highPrice) },
                      { label: '저가', value: formatKRW(selectedStock.lowPrice) },
                      { label: '52주 최고', value: stockDetail?.week52 ? formatKRW(stockDetail.week52.high) : '-' },
                      { label: '52주 최저', value: stockDetail?.week52 ? formatKRW(stockDetail.week52.low) : '-' },
                      { label: '상장일', value: stockDetail?.master?.listingDate || '-' },
                    ].map((item) => (
                      <div key={item.label} className="bg-muted/30 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                        <p className={`text-sm font-bold mt-0.5 ${item.color || 'text-foreground'}`}>{item.value}</p>
                      </div>
                    ))}
                  </div>

                  {stockDetail?.week52 && (
                    <div className="border border-border rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-2">52주 가격 범위</p>
                      <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                        <div
                          className="absolute h-full bg-primary/60 rounded-full"
                          style={{
                            left: 0,
                            width: `${Math.min(100, Math.max(0, ((selectedStock.price || 0) - stockDetail.week52.low) / (stockDetail.week52.high - stockDetail.week52.low) * 100))}%`,
                          }}
                        />
                      </div>
                      <div className="flex justify-between mt-1 text-xs">
                        <span className="text-blue-500 font-medium">{formatKRW(stockDetail.week52.low)}</span>
                        <span className="text-muted-foreground">현재: {formatKRW(selectedStock.price)}</span>
                        <span className="text-red-500 font-medium">{formatKRW(stockDetail.week52.high)}</span>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => { setSelectedStock(null); setStockDetail(null); }}
                    className="w-full py-2 px-4 rounded-lg bg-muted text-foreground font-medium hover:bg-muted/70 transition-colors"
                  >
                    닫기
                  </button>
                </div>
              </div>
            </div>
          )}
    </div>
  );
}