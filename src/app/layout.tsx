import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import HeaderWrapper from "@/components/layout/HeaderWrapper";
import { FetchStatusBar } from "@/components/news/FetchStatusBar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "경제뉴스 | 국내외 경제 뉴스 아그리게이터",
  description: "한국경제, 매일경제, 연준(Fed) 등 주요 경제 뉴스를 한 곳에서 확인하세요. 3시간마다 자동 업데이트됩니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                var prefs = JSON.parse(localStorage.getItem('economy-news:preferences') || '{}');
                var theme = prefs.theme || 'system';
                if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                }
              } catch(e) {}
            })();
          `,
        }}
      />
      <body className="min-h-full flex flex-col bg-background">
        <HeaderWrapper />
        <main className="flex-1">{children}</main>
        <FetchStatusBar />
      </body>
    </html>
  );
}
