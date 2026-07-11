'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface StockData {
  code: string;
  name: string;
  price: number;
  change: number;
  changeRate: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
  tradingValue: number;
  marketCap?: number;
  timestamp: string;
}

interface StockCardProps {
  stock: StockData;
  onClick?: () => void;
}

export function StockCard({ stock, onClick }: StockCardProps) {
  const [showChart, setShowChart] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [timeframe, setTimeframe] = useState('1d');

  const isPositive = stock.change >= 0;
  const changeColor = isPositive ? 'text-red-500' : 'text-blue-500';
  const bgColor = isPositive ? 'bg-red-50' : 'bg-blue-50';

  const fetchChartData = async () => {
    setChartLoading(true);
    try {
      const res = await fetch(`/api/financial/charts?symbol=${stock.code}&type=STOCK&timeframe=${timeframe}&limit=100`);
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

  const renderChartContent = () => {
    if (chartLoading) {
      return (
        <div className="flex items-center justify-center h-full text-gray-400">차트 데이터 로딩 중...</div>
      );
    }
    if (chartData.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-gray-400">차트 데이터가 없습니다</div>
      );
    }
    return (
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
            formatter={(value: any) => value !== undefined ? [typeof value === 'number' ? value.toLocaleString() : value, '가격'] : ['-', '가격']}
            labelFormatter={(value) => new Date(value).toLocaleString()}
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
          />
          <Line
            type="monotone"
            dataKey="close"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#3b82f6' }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all cursor-pointer">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-bold text-gray-900 truncate">{stock.name}</span>
            <span className="text-xs text-gray-500 px-2 py-0.5 rounded bg-gray-100">{stock.code}</span>
          </div>

          <div className="text-2xl font-bold text-gray-900 mb-1">
            {stock.price.toLocaleString()} KRW
          </div>

          <div className="flex items-center gap-3 text-sm">
            <span className={`font-medium ${stock.change >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
              {stock.change >= 0 ? '▲' : '▼'} {Math.abs(stock.change).toLocaleString()}
            </span>
            <span className={`font-medium ${stock.change >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
              ({stock.changeRate >= 0 ? '+' : ''}{stock.changeRate.toFixed(2)}%)
            </span>
            <span className="text-gray-500">
              거래량: {Number(stock.volume).toLocaleString()}
            </span>
          </div>

          <div className="mt-2 text-xs text-gray-500 flex gap-4">
            <span>시가: {stock.openPrice.toLocaleString()}</span>
            <span>고가: {stock.highPrice.toLocaleString()}</span>
            <span>저가: {stock.lowPrice.toLocaleString()}</span>
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
                onClick={() => handleTimeframeChange(tf)}
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
                    formatter={(value: any) => value !== undefined ? [typeof value === 'number' ? value.toLocaleString() : value, '가격'] : ['-', '가격']}
                    labelFormatter={(value) => new Date(value).toLocaleString()}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="close"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: '#3b82f6' }}
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

export default StockCard;