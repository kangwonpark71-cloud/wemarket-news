'use client';

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
  market: string;
}

interface StockCardProps {
  stock: StockData;
}

export function StockCard({ stock }: StockCardProps) {
  const isPositive = stock.change >= 0;
  const changeColor = isPositive ? 'text-red-500' : 'text-blue-500';
  const bgColor = isPositive ? 'bg-red-50' : 'bg-blue-50';

  return (
    <div className="bg-background rounded-none border border-border p-4 hover:shadow-md transition-all cursor-pointer">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-foreground">{stock.name}</p>
            <span className="text-xs text-muted-foreground">{stock.code}</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold tabular-nums">{stock.price.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground">KRW</span>
          </div>
          <div className={`flex items-center gap-1 mt-1 ${changeColor}`}>
            {isPositive ? '▲' : '▼'}
            <span className={`text-sm font-medium ${changeColor}`}>
              {Math.abs(stock.change).toLocaleString()} ({stock.changeRate != null && stock.changeRate != undefined ? (stock.changeRate >= 0 ? '+' : '') + Number(stock.changeRate).toFixed(2) + '%' : 'N/A'})
            </span>
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span>시가: {stock.openPrice.toLocaleString()}</span>
            <span>고가: {stock.highPrice.toLocaleString()}</span>
            <span>저가: {stock.lowPrice.toLocaleString()}</span>
            <span>거래량: {stock.volume.toLocaleString()}</span>
          </div>
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-sm ${bgColor} ${changeColor} text-sm`}>
          {isPositive ? '▲' : '▼'}
          <span className="font-medium">
            {Math.abs(stock.change).toLocaleString()} ({stock.changeRate >= 0 ? '+' : ''}{stock.changeRate.toFixed(2)}%)
          </span>
        </div>
      </div>
    </div>
  );
}

export default StockCard;
