import { Metadata } from 'next';
import { CryptoPage } from './CryptoPage';

export const metadata: Metadata = {
  title: '암호화폐 시장 | 경제뉴스',
  description: '비트코인, 이더리움 등 주요 가상자산의 실시간 시세와 상세 차트를 확인하세요.',
};

export default function CryptocurrencyPage() {
  return <CryptoPage />;
}
