import { Metadata } from 'next';
import { GlobalPage } from './GlobalPage';

export const metadata: Metadata = {
  title: '글로벌 증시 | 경제뉴스',
  description: '다우존스, 나스닥, S&P 500, 니케이, 상해종합 등 글로벌 주요 증시 지수를 한눈에 확인하세요.',
};

export default function GlobalMarketPage() {
  return <GlobalPage />;
}
