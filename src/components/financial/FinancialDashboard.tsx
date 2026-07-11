'use client';

import { useEffect, useState } from 'react';
import { StockCard } from './StockCard';
import { CryptoCard } from './CryptoCard';
import { ForexCard } from './ForexCard';
import { GlobalIndexCard } from './GlobalIndexCard';
import { FinancialDashboard as Dashboard } from './FinancialDashboard';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardData {
  kospi: { value: number; change: number; changeRate: number };
  kosdaq: { value: number; change: number; changeRate: number };
  btc: { price: number; change: number; changeRate: number } | null;
  eth: { price: number; change: number; changeRate: number } | null;
  usdKrw: { rate: number; change: number; changeRate: number } | null;
  nasdaq: { price: number; change: number; changeRate: number } | null;
  lastUpdated: string;
}

export function FinancialDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/financial/dashboard');
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        } else {
          setError(json.error);
        }
      } catch (err) {
        setError('데이터를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="animate-pulse bg-white rounded-lg border p-4 h-32" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-4">
        {error}
      </div>
    );
  }

  if (!data) return null;

  const cards = [
    {
      title: 'KOSPI',
      value: data.kospi.value.toLocaleString(),
      change: data.kospi.change,
      changeRate: data.kospi.changeRate,
      color: 'blue',
    },
    {
      title: 'KOSDAQ',
      value: data.kosdaq.value.toLocaleString(),
      change: data.kosdaq.change,
      changeRate: data.kosdaq.changeRate,
      color: 'green',
    },
    {
      title: 'Bitcoin',
      value: data.btc ? data.btc.price.toLocaleString() + ' KRW' : '-',
      change: data.btc?.change || 0,
      changeRate: data.btc?.changeRate || 0,
      color: 'orange',
    },
    {
      title: 'Ethereum',
      value: data.eth ? data.eth.price.toLocaleString() + ' KRW' : '-',
      change: data.eth?.change || 0,
      changeRate: data.eth?.changeRate || 0,
      color: 'purple',
    },
    {
      title: 'USD/KRW',
      value: data.usdKrw ? data.usdKrw.rate.toLocaleString() + ' KRW' : '-',
      change: data.usdKrw?.change || 0,
      changeRate: data.usdKrw?.changeRate || 0,
      color: 'emerald',
    },
    {
      title: 'NASDAQ',
      value: data.nasdaq ? data.nasdaq.price.toLocaleString() : '-',
      change: data.nasdaq?.change || 0,
      changeRate: data.nasdaq?.changeRate || 0,
      color: 'indigo',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">금융 대시보드</h2>
        <span className="text-sm text-gray-500">
          마지막 업데이트: {new Date(data.lastUpdated).toLocaleTimeString()}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {cards.map((card, index) => (
          <FinancialCard key={index} {...card} />
        ))}
      </div>
    </div>
  );
}

interface FinancialCardProps {
  title: string;
  value: string;
  change: number;
  changeRate: number;
  color: string;
}

function FinancialCard({ title, value, change, changeRate, color }: FinancialCardProps) {
  const isPositive = change >= 0;
  const changeColor = isPositive ? 'text-red-500' : 'text-blue-500';
  const bgColor = isPositive ? 'bg-red-50' : 'bg-blue-50';
  const borderColor = isPositive ? 'border-red-200' : 'border-blue-200';
  const colorClass = `text-${color}-600`;

  return (
    <div className={`bg-white rounded-xl border ${borderColor} p-4 hover:shadow-md transition-shadow ${bgColor}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-sm font-medium ${colorClass}`}>{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className={`flex items-center gap-1 ${bgColor} px-2 py-1 rounded ${changeColor}`}>
          {change >= 0 ? '▲' : '▼'}
          <span className="font-medium">
            {Math.abs(change).toLocaleString()} ({changeRate >= 0 ? '+' : ''}{changeRate.toFixed(2)}%)
          </span>
        </div>
      </div>
    </div>
  );
}

export default FinancialDashboard;