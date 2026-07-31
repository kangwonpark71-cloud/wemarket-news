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

interface FinancialChartProps {
  symbol: string;
  type: 'STOCK' | 'CRYPTO' | 'INDEX' | 'FOREX';
  timeframe?: '1m' | '5m' | '15m' | '30m' | '1h' | '1d' | '1w' | '1M';
  height?: number;
  showVolume?: boolean;
}

interface ChartDataPoint {
  timestamp: number;
  closePrice: number;
}

export function FinancialChart({
  symbol,
  type,
  timeframe = '1d',
  height = 300,
}: FinancialChartProps) {
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/financial/charts?symbol=${symbol}&type=${type}&timeframe=${timeframe}`);
        const json = await res.json();

        if (json.success) {
          setData(json.data || []);
        } else {
          setError(json.error || 'Failed to fetch chart data');
        }
      } catch {
        setError('Failed to fetch chart data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [symbol, type, timeframe]);

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="animate-pulse bg-gray-200 rounded w-full h-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <p className="text-sm text-gray-400">데이터가 없습니다</p>
      </div>
    );
  }

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
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
            domain={['auto', 'auto']}
          />
          <Tooltip
            formatter={(value) => [typeof value === 'number' ? value.toLocaleString() : String(value ?? ''), '가격']}
            labelFormatter={(value) => new Date(String(value)).toLocaleString()}
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
          />
          <Line
            type="monotone"
            dataKey="closePrice"
            name="종가"
            stroke="#2563eb"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#2563eb' }}
          />
          <Legend />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default FinancialChart;
