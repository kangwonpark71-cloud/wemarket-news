'use client';

interface ForexData {
  baseCurrency: string;
  quoteCurrency: string;
  rate: number;
  change: number;
  changeRate: number;
  source: string;
  timestamp: string;
}

interface ForexCardProps {
  forex: ForexData;
}

export function ForexCard({ forex }: ForexCardProps) {
  const flags: Record<string, string> = {
    USD: '🇺🇸',
    JPY: '🇯🇵',
    EUR: '🇪🇺',
    CNY: '🇨🇳',
  };

  const currencyNames: Record<string, string> = {
    USD: '미국 달러',
    JPY: '일본 엔',
    EUR: '유로',
    CNY: '중국 위안',
  };

  return (
    <div className="bg-white rounded-none border border-gray-200 p-4 hover:shadow-md transition-all cursor-pointer">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{flags[forex.baseCurrency] || '🏳️'}</span>
          <div>
            <div className="font-bold text-gray-900">{forex.baseCurrency}/{forex.quoteCurrency}</div>
            <div className="text-xs text-gray-500">{currencyNames[forex.baseCurrency] || forex.baseCurrency}</div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xl font-bold text-gray-900">
            {forex.rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className={`text-sm font-medium ${forex.changeRate >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
            {forex.changeRate >= 0 ? '▲' : '▼'} {Math.abs(forex.changeRate).toFixed(2)}%
          </div>
          <div className="text-xs text-gray-500">
            {forex.change >= 0 ? '▲' : '▼'} {Math.abs(forex.change).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
        <span>출처: {forex.source}</span>
        <span>갱신: {new Date(forex.timestamp).toLocaleTimeString()}</span>
      </div>
    </div>
  );
}

export default ForexCard;