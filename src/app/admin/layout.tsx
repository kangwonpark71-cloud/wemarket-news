'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { SessionUser } from '@/lib/utils/auth';

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: '대시보드', href: '/admin', icon: '📊' },
  { label: '시스템 상태', href: '/admin/health', icon: '🏥' },
  { label: '수집 성과', href: '/admin/sources-health', icon: '📡' },
  { label: '기사 관리', href: '/admin/articles', icon: '📰' },
  { label: '배너 관리', href: '/admin/banners', icon: '🖼️' },
  { label: '광고 관리', href: '/admin/ads', icon: '📢' },
  { label: '활동 로그', href: '/admin/logs', icon: '📋' },
  { label: '키워드 알림', href: '/admin/alerts', icon: '🔔' },
  { label: '추천 통계', href: '/admin/recommendations', icon: '🎯' },
  { label: '푸시 알림', href: '/admin/push', icon: '📬' },
  { label: '뉴스레터', href: '/admin/newsletter', icon: '📧' },
  { label: '계정 관리', href: '/admin/users', icon: '👥' },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null | 'loading'>('loading');

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (!res.ok) throw new Error('Not authenticated');
        return res.json();
      })
      .then((json) => {
        if (json.success && json.data.role === 'ADMIN') {
          setUser(json.data);
        } else {
          setUser(null);
        }
      })
      .catch(() => {
        setUser(null);
      });
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  if (user === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 text-slate-600">
        <div className="text-lg font-semibold animate-pulse">⚙️ 확인 중...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="max-w-md text-center p-8">
          <div className="text-5xl mb-4" aria-hidden="true">🔒</div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">접근 권한이 없습니다</h1>
          <p className="text-sm text-slate-500 mb-6">
            관리자 계정으로 로그인 후 이용해주세요.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-sm hover:bg-primary-hover transition-colors cursor-pointer"
          >
            로그인 페이지로 이동
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      
      <aside className="w-56 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-5 border-b border-slate-200">
          <div className="text-sm font-bold text-slate-900">🛡️ 관리자</div>
          <div className="text-xs text-slate-400 mt-1 truncate">{user.email}</div>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href);
            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-sm text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="text-sm" aria-hidden="true">{item.icon}</span>
                {item.label}
              </a>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-200">
          <button
            onClick={handleLogout}
            className="w-full px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-sm transition-colors text-left cursor-pointer"
          >
            로그아웃
          </button>
        </div>
      </aside>

      
      <main className="flex-1 p-8 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
