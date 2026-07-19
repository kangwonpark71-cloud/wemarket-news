import { Metadata } from 'next';
import { LoginPage } from './LoginPage';

export const metadata: Metadata = {
  title: '로그인 및 회원가입 - 위마켓_뉴스',
  description: '회원가입 후 나만의 맞춤형 뉴스 및 필터링 설정을 시작하세요.',
};

export default function Page() {
  return <LoginPage />;
}
