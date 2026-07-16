'use client';

interface GlobalIndexData {
  symbol: string;
  name: string;
  nameKr: string | null;
  price: number;
  change: number;
  changeRate: number;
}

interface GlobalIndexCardProps {
  index: GlobalIndexData;
}

export function GlobalIndexCard({ index }: GlobalIndexCardProps) {
  const isPositive = index.changeRate >= 0;
  const changeColor = isPositive ? 'text-red-500' : 'text-blue-500';
  const bgColor = isPositive ? 'bg-red-50' : 'bg-blue-50';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all cursor-pointer">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">{index.nameKr || index.name}</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold tabular-nums">{index.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className={`flex items-center gap-1 mt-1 ${changeColor}`}>
            {isPositive ? '▲' : '▼'}
            <span className={`text-sm font-medium ${changeColor}`}>
              {Math.abs(index.change).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({index.changeRate >= 0 ? '+' : ''}{index.changeRate.toFixed(2)}%)
            </span>
          </div>
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 rounded ${bgColor} ${changeColor} text-sm`}>
          {isPositive ? '▲' : '▼'}
          <span className="font-medium">
            {Math.abs(index.change).toLocaleString()} ({index.changeRate >= 0 ? '+' : ''}{index.changeRate.toFixed(2)}%)
          </span>
        </div>
      </div>
    </div>
  );
}

export default GlobalIndexCard;
