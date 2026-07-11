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

interface GlobalIndexData {
  symbol: string;
  name: string;
  nameKr?: string;
  price: number;
  change: number;
  changeRate: number;
  openPrice?: number;
  highPrice?: number;
  lowPrice?: number;
  previousClose?: number;
  volume?: number;
  timestamp: string;
}

interface GlobalIndexCardProps {
  index: GlobalIndexData;
}

function ChartContent({ chartData, chartLoading }: { chartData: any[]; chartLoading: boolean }) {
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
          formatter={(value: any) => value !== undefined ? [typeof value === 'number' ? value.toLocaleString() : String(value), '지수'] : ['-', '지수']}
          labelFormatter={(value) => new Date(value).toLocaleString()}
          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
        />
        <Line
          type="monotone"
          dataKey="price"
          stroke="#8b5cf6"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: '#8b5cf6' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function GlobalIndexCard({ index }: GlobalIndexCardProps) {
  const [showChart, setShowChart] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [timeframe, setTimeframe] = useState('1d');

  const isPositive = index.changeRate >= 0;

  const fetchChartData = async () => {
    setChartLoading(true);
    try {
      const res = await fetch(`/api/financial/charts?symbol=${index.symbol}&type=INDEX&timeframe=${timeframe}&limit=200`);
      const json = await res.json();
      if (json.success && json.data) {
        setChartData(json.data);
      }
    } catch (error) {
      console.error('[GlobalIndexCard] Failed to fetch chart data:', error);
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

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all cursor-pointer">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-bold text-gray-900 truncate">{index.nameKr || index.name}</span>
          <span className="text-xs text-gray-500 px-2 py-0.5 rounded bg-gray-100 uppercase">{index.symbol}</span>
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

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{index.nameKr || index.name}</h2>
          <p className="mt-1 text-sm text-gray-500">
            글로벌 지수
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowChart(!showChart);
            }}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {showChart ? '차트 숨기기' : '차트 보기'}
          </button>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleTimeframeChange('1d')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${timeframe === '1d' ? 'bg-primary text-primary-foreground' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            1일
          </button>
          <button
            onClick={() => handleTimeframeChange('1w')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${timeframe === '1w' ? 'bg-primary text-primary-foreground' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            1주
          </button>
          <button
            onClick={() => handleTimeframeChange('1m')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${timeframe === '1m' ? 'bg-primary text-primary-foreground' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            1달
          </button>
          <button
            onClick={() => handleTimeframeChange('3m')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${timeframe === '3m' ? 'bg-primary text-primary-foreground' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            3달
          </button>
          <button
            onClick={() => handleTimeframeChange('1y')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${timeframe === '1y' ? 'bg-primary text-primary-foreground' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            1년
          </button>
        </div>
      </div>

      {showChart && (
        <div className="mt-4 pt-4 border-t border-gray-100 animate-fade-in">
          <div className="h-48">
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
                  formatter={(value: any) => value !== undefined ? [typeof value === 'number' ? value.toLocaleString() : String(value), '지수'] : ['-', '지수']}
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#8b5cf6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

export default GlobalIndexCard;