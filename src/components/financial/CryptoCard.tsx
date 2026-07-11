'use client';

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface CryptoData {
  symbol: string;
  name: string;
  nameKr?: string;
  tradePrice: number;
  signedChangePrice: number;
  signedChangeRate: number;
  askPrice: number;
  bidPrice: number;
  accTradePrice24h: number;
  accTradeVolume24h: number;
  highPrice24h: number;
  lowPrice24h: number;
  prevClosingPrice: number;
  timestamp: string;
}

interface CryptoCardProps {
  crypto: CryptoData;
}

export function CryptoCard({ crypto }: CryptoCardProps) {
  const [showChart, setShowChart] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [timeframe, setTimeframe] = useState('1d');

  const fetchChartData = async () => {
    setChartLoading(true);
    try {
      const unit = timeframe === '1d' ? 'minutes/1' : 
                   timeframe === '1w' ? 'minutes/30' : 
                   timeframe === '1m' ? 'days' : 'days';
      const count = timeframe === '1d' ? 200 : timeframe === '1w' ? 336 : 120;
      
      const res = await fetch(`/api/financial/charts?symbol=${crypto.symbol}&type=CRYPTO&timeframe=${timeframe}&limit=${count}`);
      const json = await res.json();
      if (json.success && json.data) {
        setChartData(json.data);
      }
    } catch (error) {
      console.error('Failed to fetch chart data:', error);
    } finally {
      setChartLoading(false);
    }
  };

  const handleChartToggle = () => {
    if (!showChart) {
      setShowChart(true);
      fetchChartData();
    } else {
      setShowChart(false);
    }
  };

  const handleTimeframeChange = (tf: string) => {
    setTimeframe(tf);
    if (showChart) {
      fetchChartData();
    }
  };

  const isPositive = crypto.signedChangeRate >= 0;
  const changeColor = crypto.signedChangeRate >= 0 ? 'text-red-500' : 'text-blue-500';
  const bgColor = crypto.signedChangeRate >= 0 ? 'bg-red-50' : 'bg-blue-50';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all cursor-pointer">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-bold text-gray-900 truncate">{crypto.nameKr || crypto.name}</span>
            <span className="text-xs text-gray-500 px-2 py-0.5 rounded bg-gray-100 uppercase">{crypto.symbol}</span>
          </div>

          <div className="text-2xl font-bold text-gray-900 mb-1">
            {crypto.tradePrice.toLocaleString()} KRW
          </div>

          <div className="flex items-center gap-3 text-sm mb-2">
            <span className={`font-medium ${crypto.signedChangeRate >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
              {crypto.signedChangeRate >= 0 ? '▲' : '▼'} {Math.abs(crypto.signedChangeRate).toFixed(2)}%
            </span>
            <span className={crypto.signedChangePrice >= 0 ? 'text-red-500' : 'text-blue-500'}>
              {crypto.signedChangePrice >= 0 ? '▲' : '▼'} {Math.abs(crypto.signedChangePrice).toLocaleString()}
            </span>
          </div>

          <div className="text-xs text-gray-500 flex gap-4">
            <span>24h 고가: {crypto.highPrice24h.toLocaleString()}</span>
            <span>24h 저가: {crypto.lowPrice24h.toLocaleString()}</span>
          </div>

          <div className="mt-2 text-xs text-gray-500 flex gap-4">
            <span>24h 거래대금: {(crypto.accTradePrice24h / 1e8).toFixed(1)}억</span>
            <span>24h 거래량: {crypto.accTradeVolume24h.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowChart(!showChart);
            }}
            className="text-xs px-2 py-1 rounded hover:bg-gray-100 transition-colors"
          >
            {showChart ? '차트 숨기기' : '차트 보기'}
          </button>
        </div>
      </div>

      {showChart && (
        <div className="mt-4 pt-4 border-t border-gray-100 animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-gray-500">기간:</span>
            {['1d', '1w', '1m', '3m', '1y'].map((tf) => (
              <button
                key={tf}
                onClick={() => {
                  setTimeframe(tf);
                  fetchChartData();
                }}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  timeframe === tf
                    ? 'bg-primary text-white'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {tf}
              </button>
            ))}
            {chartLoading && (
              <span className="ml-2 text-xs text-gray-500 animate-pulse">로딩 중...</span>
            )}
          </div>

          <div className="h-48">
            {chartLoading ? (
              <div className="flex items-center justify-center h-full text-gray-400">차트 데이터 로딩 중...</div>
            ) : chartData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400">차트 데이터가 없습니다</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(value) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    tick={{ fontSize: 10, fill: '#6b7280' }}
                    stroke="#e5e7eb"
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#6b7280' }}
                    stroke="#e5e7eb"
                    tickFormatter={(value) => value.toLocaleString()}
                  />
                  <Tooltip
                    formatter={(value: any) => value !== undefined ? [typeof value === 'number' ? value.toLocaleString() : String(value), '가격'] : ['-', '가격']}
                    labelFormatter={(value) => new Date(value).toLocaleString()}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="tradePrice"
                    stroke="#f97316"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: '#f97316' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CryptoCard;