'use client'

import { useState, useEffect } from 'react'
import { createLogger } from '@/lib/logger'

const log = createLogger('AdminAlertsPage')

interface AlertUser {
  userId: string
  email: string
  name: string | null
  keywords: string[]
}

interface AlertResult {
  totalUsers: number
  usersWithAlerts: number
  totalArticles: number
  matches: Array<{
    articleId: string
    articleTitle: string
    articleUrl: string
    publishedAt: string
    matchedKeywords: string[]
    userId: string
    userEmail: string
  }>
}

export default function AdminAlertsPage() {
  const [alertUsers, setAlertUsers] = useState<AlertUser[]>([])
  const [loading, setLoading] = useState(true)
  const [checkResult, setCheckResult] = useState<AlertResult | null>(null)
  const [running, setRunning] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [hoursBack, setHoursBack] = useState(24)

  const fetchConfig = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/alerts')
      const json = await res.json()
      if (json.success) setAlertUsers(json.data.alertUsers)
    } catch (err) {
      log.error('Failed to load alert config:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConfig()
  }, [])

  const handleCheck = async () => {
    setRunning(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check', hoursBack }),
      })
      const json = await res.json()
      if (json.success) {
        setCheckResult(json.data)
        setMessage(`✅ 확인 완료: ${json.data.matches.length}건 매치 (${json.data.totalArticles}개 기사 스캔)`)
      } else {
        setMessage(`❌ ${json.error || '확인 실패'}`)
      }
    } catch (err) {
      setMessage(`❌ 통신 오류: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setRunning(false)
      setTimeout(() => setMessage(null), 8000)
    }
  }

  const handleDispatch = async () => {
    setRunning(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dispatch', hoursBack }),
      })
      const json = await res.json()
      if (json.success) {
        setMessage(`✅ ${json.data.message}`)
      } else {
        setMessage(`❌ ${json.error || '디스패치 실패'}`)
      }
    } catch (err) {
      setMessage(`❌ 통신 오류: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setRunning(false)
      setTimeout(() => setMessage(null), 8000)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh] text-slate-600 animate-pulse">⏳ 로딩 중...</div>
  }

  return (
    <div className="space-y-6">
      <header className="mb-6 border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold text-slate-900">🔔 키워드 알림 관리</h1>
        <p className="text-sm text-slate-500 mt-1">사용자별 키워드 알림 설정 현황 및 기사 매치 확인</p>
      </header>

      {/* Controls */}
      <div className="bg-white rounded-none shadow-sm border border-slate-200 p-5">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">조회 시간 범위</label>
            <select
              value={hoursBack}
              onChange={(e) => setHoursBack(Number(e.target.value))}
              className="h-9 rounded-sm border border-slate-300 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value={1}>최근 1시간</option>
              <option value={6}>최근 6시간</option>
              <option value={12}>최근 12시간</option>
              <option value={24}>최근 24시간</option>
              <option value={48}>최근 48시간</option>
              <option value={72}>최근 72시간</option>
            </select>
          </div>
          <button
            onClick={handleCheck}
            disabled={running}
            className="h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-sm text-xs transition-colors cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {running ? '🔄 확인 중...' : '🔍 키워드 매치 확인'}
          </button>
          <button
            onClick={handleDispatch}
            disabled={running}
            className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-sm text-xs transition-colors cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            📬 알림 디스패치
          </button>
        </div>
        {message && (
          <div className={`mt-3 text-xs font-semibold ${message.includes('✅') ? 'text-emerald-600' : 'text-rose-600'}`}>
            {message}
          </div>
        )}
      </div>

      {/* Users with alerts */}
      <div className="bg-white rounded-none shadow-sm border border-slate-200 overflow-hidden">
        <div className="py-4 px-6 bg-slate-50/50 border-b border-slate-200 font-bold text-sm text-slate-700">
          👥 키워드 알림 설정 사용자 ({alertUsers.length}명)
        </div>
        {alertUsers.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">키워드 알림을 설정한 사용자가 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/50 text-slate-600 font-semibold text-xs border-b border-slate-200">
                  <th className="py-3 px-4">이메일</th>
                  <th className="py-3 px-4">이름</th>
                  <th className="py-3 px-4">알림 키워드</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {alertUsers.map((u) => (
                  <tr key={u.userId} className="hover:bg-slate-50 text-sm">
                    <td className="py-3 px-4 text-slate-700">{u.email}</td>
                    <td className="py-3 px-4 text-slate-500">{u.name || '-'}</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {u.keywords.map((kw) => (
                          <span key={kw} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-sm text-xs font-semibold">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Match results */}
      {checkResult && (
        <div className="bg-white rounded-none shadow-sm border border-slate-200 overflow-hidden">
          <div className="py-4 px-6 bg-slate-50/50 border-b border-slate-200 flex items-center justify-between">
            <span className="font-bold text-sm text-slate-700">
              📊 매치 결과 ({checkResult.matches.length}건)
            </span>
            <span className="text-xs text-slate-400">
              {checkResult.totalArticles}개 기사 / {checkResult.usersWithAlerts}명 알림 사용자 스캔
            </span>
          </div>
          {checkResult.matches.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">매치된 기사가 없습니다.</div>
          ) : (
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/50 text-slate-600 font-semibold text-xs border-b border-slate-200 sticky top-0">
                    <th className="py-3 px-4">사용자</th>
                    <th className="py-3 px-4">매치된 키워드</th>
                    <th className="py-3 px-4">기사 제목</th>
                    <th className="py-3 px-4">발행 시간</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {checkResult.matches.map((m, i) => (
                    <tr key={`${m.articleId}-${m.userId}-${i}`} className="hover:bg-slate-50 text-xs">
                      <td className="py-3 px-4 text-slate-700 font-semibold">{m.userEmail}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {m.matchedKeywords.map((kw) => (
                            <span key={kw} className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-sm font-semibold">
                              {kw}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <a
                          href={m.articleUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-800 hover:underline font-medium"
                        >
                          {m.articleTitle}
                        </a>
                      </td>
                      <td className="py-3 px-4 text-slate-500 tabular-nums">
                        {new Date(m.publishedAt).toLocaleString('ko-KR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
