'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { label: '홈', href: '/', icon: '\u{1F3E0}' },
  { label: '국내', href: '/domestic', icon: '\u{1F1F0}\u{1F1F7}' },
  { label: '해외', href: '/overseas', icon: '\u{1F30D}' },
  { label: 'AI/IT', href: '/ai-it', icon: '\u{1F916}' },
  { label: '설정', href: '/settings', icon: '\u{2699}\u{FE0F}' },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  // Hide on admin pages
  if (pathname.startsWith('/admin') || pathname.startsWith('/login')) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background md:hidden">
      <div className="flex h-14 items-center justify-around">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium transition-colors ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="text-lg" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
