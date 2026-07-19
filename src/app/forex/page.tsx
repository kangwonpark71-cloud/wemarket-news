import { Metadata } from 'next';
import { ForexPage } from './ForexPage';

export const metadata: Metadata = {
  title: '환율 시장 | 경제뉴스',
  description: '달러, 엔화, 유로화 등 전 세계 실시간 주요 환율 시세를 편리하게 확인하세요.',
};

export default function ForeignExchangePage() {
  return <ForexPage />;
}
