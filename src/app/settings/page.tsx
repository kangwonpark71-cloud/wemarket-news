import { Metadata } from 'next';
import { SettingsPage } from './SettingsPage';

export const metadata: Metadata = {
  title: '개인화 설정 - 위마켓_뉴스',
  description: '나의 관심 데이터, 차단 소스, 수집 제외 채널 등을 개인 맞춤 설정하세요.',
};

export default function Page() {
  return <SettingsPage />;
}
