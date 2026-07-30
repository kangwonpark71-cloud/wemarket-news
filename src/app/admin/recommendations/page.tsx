'use client'

import { useState, useEffect } from 'react'
import { createLogger } from '@/lib/logger'

const log = createLogger('AdminRecommendationsPage')

interface KeywordStat {
  keyword: string
  count: number
}

interface TrendingArticle {
  id: string
  title: string
  url: string
  viewCount: number
  publishedAt: string
  source: { name: string } | null
}

export default function AdminRecommendationsPage() {
  const [keywordStats, setKeywordStats] = useState<KeywordStat[]>([])
  const [trending, setTrending] = useState<TrendingArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'keywords' | 'trending'>('keywords')
  const [articleId, setArticleId] = useState('')
  const [recommendResult, setRecommendResult] = useState<{
    articleTitle: string
    recommendations: Array<{ id: string; title: string; url: string; relevanceScore: number; source: { name: string } | null }>
  } | null>(null)
  const [recommendLoading, setRecommendLoading] = useState(false)
  const [recommendError, setRecommendError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/recommendations?mode=keyword-stats&limit=30').then((r) => r.json()),
      fetch('/api/admin/recommendations?mode=trending&limit=10').then((r) => r.json()),
    ])
      .then(([kwRes, trRes]) => {
        if (kwRes.success) setKeywordStats(kwRes.data.stats)
        if (trRes.success) setTrending(trRes.data.articles)
      })
      .catch((err) => log.error('Failed to load data:', err))
      .finally(() => setLoading(false))
  }, [])

  const handleRecommend = async () => {
    if (!articleId.trim()) return
    setRecommendLoading(true)
    setRecommendError(null)
    setRecommendResult(null)
    try {
      const res = await fetch(`/api/admin/recommendations?mode=recommend&articleId=${encodeURIComponent(articleId.trim())}&limit=6`)
      const json = await res.json()
      if (json.success) {
        setRecommendResult(json.data)
      } else {
        setRecommendError(json.error || 'Failed')
      }
    } catch (err) {
      setRecommendError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setRecommendLoading(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh] text-slate-600 animate-pulse">⏳ 로딩 중...</div>
  }

  return (
    <div className="space-y-6">
      <header className="mb-6 border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold text-slate-900">🎯 추천 엔진 통계</h1>
        <p className="text-sm text-slate-500 mt-1">키워드 빈도, 트렌딩 기사, 연관 기사 추천</p>
      </header>

      {/* Mode tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-0">
        <button
          onClick={() => setMode('keywords')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            mode === 'keywords' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          📊 키워드 통계
        </button>
        <button
          onClick={() => setMode('trending')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            mode === 'trending' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          🔥 트렌딩 기사
        </button>
      </div>

      {mode === 'keywords' ? (
        <div className="bg-white rounded-none shadow-sm border border-slate-200 overflow-hidden">
          <div className="py-4 px-6 bg-slate-50/50 border-b border-slate-200 font-bold text-sm text-slate-700">
            🔑 상위 키워드 (최근 2000개 기사)
          </div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/50 text-slate-600 font-semibold text-xs border-b border-slate-200 sticky top-0">
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">키워드</th>
                  <th className="py-3 px-4 text-right">등장 횟수</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {keywordStats.map((ks, i) => (
                  <tr key={ks.keyword} className="hover:bg-slate-50 text-sm">
                    <td className="py-2 px-4 text-slate-400 tabular-nums">{i + 1}</td>
                    <td className="py-2 px-4 font-semibold text-slate-800">{ks.keyword}</td>
                    <td className="py-2 px-4 text-right tabular-nums text-slate-600">{ks.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Trending */}
          <div className="bg-white rounded-none shadow-sm border border-slate-200 overflow-hidden">
            <div className="py-4 px-6 bg-slate-50/50 border-b border-slate-200 font-bold text-sm text-slate-700">
              🔥 트렌딩 기사 (조회수 기준)
            </div>
            {trending.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">트렌딩 기사가 없습니다.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/50 text-slate-600 font-semibold text-xs border-b border-slate-200">
                      <th className="py-3 px-4">제목</th>
                      <th className="py-3 px-4">소스</th>
                      <th className="py-3 px-4 text-right">조회수</th>
                      <th className="py-3 px-4">발행일</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {trending.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50 text-sm">
                        <td className="py-3 px-4 max-w-xs truncate">
                          <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-medium">
                            {a.title}
                          </a>
                        </td>
                        <td className="py-3 px-4 text-slate-500">{a.source?.name || '-'}</td>
                        <td className="py-3 px-4 text-right tabular-nums font-semibold text-slate-700">{a.viewCount}</td>
                        <td className="py-3 px-4 text-xs text-slate-500">{new Date(a.publishedAt).toLocaleDateString('ko-KR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recommendation Tester */}
          <div className="bg-white rounded-none shadow-sm border border-slate-200 p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-4">🎯 연관 기사 추천 테스트</h3>
            <div className="flex gap-3 mb-4">
              <input
                type="text"
                value={articleId}
                onChange={(e) => setArticleId(e.target.value)}
                placeholder="기사 ID (UUID) 입력..."
                className="flex-1 h-9 rounded-sm border border-slate-300 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={handleRecommend}
                disabled={recommendLoading || !articleId.trim()}
                className="h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-sm text-xs transition-colors cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                {recommendLoading ? '🔄 조회 중...' : '조회'}
              </button>
            </div>
            {recommendError && (
              <div className="text-xs text-rose-600 font-semibold mb-3">❌ {recommendError}</div>
            )}
            {recommendResult && (
              <div>
                <div className="text-xs text-slate-500 mb-3">
                  기준 기사: <span className="font-semibold text-slate-700">{recommendResult.articleTitle}</span>
                </div>
                <div className="space-y-2">
                  {recommendResult.recommendations.map((rec) => (
                    <div key={rec.id} className="flex items-center justify-between border border-slate-100 px-4 py-2 rounded-sm hover:bg-slate-50">
                      <div className="text-xs">
                        <a href={rec.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-medium">
                          {rec.title}
                        </a>
                        <span className="text-slate-400 ml-2">{rec.source?.name || '-'}</span>
                      </div>
                      <span className="text-xs font-bold text-indigo-600">Score: {rec.relevanceScore}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
