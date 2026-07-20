import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '경제뉴스 | 국내외 경제 뉴스 아그리게이터',
    short_name: '경제뉴스',
    description:
      '한국경제, 매일경제, 연준(Fed) 등 주요 경제 뉴스를 한 곳에서 확인하세요.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#2563eb',
    lang: 'ko',
    categories: ['news', 'finance'],
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icon-maskable.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  }
}
