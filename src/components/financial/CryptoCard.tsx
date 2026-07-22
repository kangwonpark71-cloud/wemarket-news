'use client';

import { formatKRW, formatNumber } from '@/lib/utils/format';

interface CryptoData {
  symbol: string;
  name: string;
  nameKr: string | null;
  tradePrice: number;
  signedChangePrice: number;
  signedChangeRate: number;
  accTradeVolume24h: number;
}

interface CryptoCardProps {
  crypto: CryptoData;
}

export function CryptoCard({ crypto }: CryptoCardProps) {
  const changeColor = crypto.signedChangeRate >= 0 ? 'text-red-500' : 'text-blue-500';
  const bgColor = crypto.signedChangeRate >= 0 ? 'bg-red-50' : 'bg-blue-50';

  return (
    <div className="bg-background rounded-none border border-border p-4 hover:shadow-md transition-all cursor-pointer">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{crypto.nameKr || crypto.name}</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold tabular-nums">{formatKRW(crypto.tradePrice)}</span>
          </div>
          <div className={`flex items-center gap-1 mt-1 ${changeColor}`}>
            {crypto.signedChangeRate >= 0 ? '▲' : '▼'}
            <span className={`text-sm font-medium ${changeColor}`}>
              {formatNumber(Math.abs(crypto.signedChangePrice))} ({crypto.signedChangeRate >= 0 ? '+' : ''}{(crypto.signedChangeRate * 100).toFixed(2)}%)
            </span>
          </div>
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-sm ${bgColor} ${changeColor} text-sm`}>
          {crypto.signedChangeRate >= 0 ? '▲' : '▼'}
          <span className="font-medium">
            {formatNumber(Math.abs(crypto.signedChangePrice))} ({(crypto.signedChangeRate >= 0 ? '+' : '')}{(crypto.signedChangeRate * 100).toFixed(2)}%)
          </span>
        </div>
      </div>
    </div>
  );
}

export default CryptoCard;
