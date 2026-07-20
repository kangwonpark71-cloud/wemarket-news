'use client';

import { useEffect, useState } from 'react';
import { FinancialDashboard } from '@/components/financial/FinancialDashboard';

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

export function StockPage() {
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [masterData, setMasterData] = useState<StockMasterData[]>([]);
  const [loading, setLoading] = useState(true);
  const [market, setMarket] = useState<'KOSPI' | 'KOSDAQ' | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'changeRate' | 'volume' | 'price'>('changeRate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedStock, setSelectedStock] = useState<StockData | null>(null);

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

      fetchPrices();
    }
  }, [masterData, market, search, sortBy, sortOrder]);

  const handleSort = (field: 'changeRate' | 'volume' | 'price') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleRowClick = (stock: StockData) => {
    setSelectedStock(stock);
  };

  if (loading && masterData.length === 0) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-gray-200 bg-gray-50 p-6 h-32" />
          ))}
        </div>
        <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-6 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded animate-pulse" />
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
        <h1 className="text-2xl font-bold text-gray-900">주식 시장</h1>
        <p className="text-sm text-gray-500 mt-1">KOSPI, KOSDAQ 실시간 시세와 종목별 상세 정보</p>
      </div>

          <FinancialDashboard />

          <div className="mt-6 flex flex-wrap gap-2">
            <button
              onClick={() => setMarket('ALL')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                market === 'ALL'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white border border-gray-300 hover:bg-gray-50'
              }`}
            >
              전체
            </button>
            <button
              onClick={() => setMarket('KOSPI')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                market === 'KOSPI'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white border border-gray-300 hover:bg-gray-50'
              }`}
            >
              KOSPI
            </button>
            <button
              onClick={() => setMarket('KOSDAQ')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                market === 'KOSDAQ'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white border border-gray-300 hover:bg-gray-50'
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
                className="w-64 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">순위</th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('price')}
                  >
                    종목명 <span className="ml-1">{sortBy === 'price' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</span>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50" onClick={() => handleSort('price')}>
                    현재가 <span className="ml-1">{sortBy === 'price' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</span>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50" onClick={() => handleSort('changeRate')}>
                    등락률 <span className="ml-1">{sortBy === 'changeRate' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</span>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">전일대비</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50" onClick={() => handleSort('volume')}>
                    거래량 <span className="ml-1">{sortBy === 'volume' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</span>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">거래대금</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">시가총액</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStocks.map((stock, index) => (
                  <tr
                    key={stock.code}
                    onClick={() => handleRowClick(stock)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{stock.name}</div>
                      <div className="text-xs text-gray-500">{stock.code}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {stock.price?.toLocaleString()}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${stock.changeRate && stock.changeRate >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                      {stock.changeRate && stock.changeRate >= 0 ? '▲' : '▼'} {Math.abs(stock.changeRate || 0).toFixed(2)}%
                    </td>
                    <td className={`px-4 py-3 text-right ${stock.change && stock.change >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                      {stock.change && stock.change >= 0 ? '▲' : '▼'} {Math.abs(stock.change || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-500">
                      {(stock.volume || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-500">
                      {(stock.tradingValue || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-500">
                      {stock.marketCap ? stock.marketCap.toLocaleString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedStock && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
              <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">{selectedStock.name} ({selectedStock.code})</h2>
                  <button onClick={() => setSelectedStock(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
                </div>
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">현재가</p>
                      <p className="text-2xl font-bold">{selectedStock.price?.toLocaleString()} KRW</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">전일대비</p>
                      <p className={`text-2xl font-bold ${selectedStock.change && selectedStock.change >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                        {selectedStock.change && selectedStock.change >= 0 ? '▲' : '▼'} {Math.abs(selectedStock.change || 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">등락률</p>
                      <p className={`text-2xl font-bold ${selectedStock.changeRate && selectedStock.changeRate >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                        {selectedStock.changeRate && selectedStock.changeRate >= 0 ? '+' : ''}{selectedStock.changeRate?.toFixed(2)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">거래량</p>
                      <p className="text-2xl font-bold">{selectedStock.volume?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">거래대금</p>
                      <p className="text-2xl font-bold">{(selectedStock.tradingValue || 0).toLocaleString()} 원</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">시가총액</p>
                      <p className="text-2xl font-bold">{selectedStock.marketCap?.toLocaleString() || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">시가</p>
                      <p className="text-2xl font-bold">{selectedStock.openPrice?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">고가</p>
                      <p className="text-2xl font-bold">{selectedStock.highPrice?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">저가</p>
                      <p className="text-2xl font-bold">{selectedStock.lowPrice?.toLocaleString()}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedStock(null)}
                    className="mt-4 w-full py-2 px-4 rounded-lg bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors"
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