import { Metadata } from 'next';
import { StockPage } from './StockPage';

export const metadata: Metadata = {
  title: '주식 시장 | 경제뉴스',
  description: 'KOSPI, KOSDAQ 실시간 시세와 종목별 상세 정보를 확인하세요.',
};

export default function StocksPage() {
  return <StockPage />;
}