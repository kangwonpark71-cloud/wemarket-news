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
  Legend,
} from 'recharts';

interface ChartDataPoint {
  timestamp: string;
  open?: number;
  high?: number;
  low?: number;
  close: number;
  volume?: number;
}

interface FinancialChartProps {
  symbol: string;
  type: 'STOCK' | 'CRYPTO' | 'INDEX' | 'FOREX';
  timeframe?: '1m' | '5m' | '15m' | '30m' | '1h' | '1d' | '1w' | '1M';
  height?: number;
  showVolume?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  return (
    <div
      style={{
        backgroundColor: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        padding: '12px',
      }}
    >
      <p className="font-medium text-gray-900 mb-2">
        {new Date(label).toLocaleString()}
      </p>
      {payload.map((entry: any, index: number) => (
        <p key={index} style={{ color: entry.color, margin: '2px 0' }}>
          {entry.name}: {entry.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
};

export function FinancialChart({
  symbol,
  type,
  timeframe = '1d',
  height = 300,
  showVolume = true,
}: FinancialChartProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/financial/charts?symbol=${symbol}&type=${type}&timeframe=${timeframe}&limit=200`
        );
        const json = await res.json();
        if (json.success && json.data) {
          setData(json.data);
        } else {
          setError(json.error || 'Failed to fetch chart data');
        }
      } catch (err) {
        setError('Failed to fetch chart data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [symbol, type, timeframe]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-white text-red-500">
        {error}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-white text-gray-400">
        차트 데이터가 없습니다
      </div>
    );
  }

  const chartData = data.map((d: any) => ({
    timestamp: d.timestamp,
    open: d.open,
    high: d.high,
    low: d.low,
    close: d.close,
    volume: d.volume,
timeLabel: new Date(d.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
  }));

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">기간:</span>
          {['1m', '5m', '15m', '30m', '1h', '1d', '1w', '1M'].map((tf) => (
            <button
              key={tf}
              onClick={() => window.location.href = `/api/financial/charts?symbol=${symbol}&type=${type}&timeframe=${tf}`}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                timeframe === tf
                  ? 'bg-primary text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="timeLabel"
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
              labelFormatter={(value) => value}
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            />
            <Legend />
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
      </div>
    </div>
  );
}

export default FinancialChart;