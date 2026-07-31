'use client'

import { useState, useEffect } from 'react'

export default function AdminPushPage() {
  const [subCount, setSubCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  // Broadcast form
  const [bcTitle, setBcTitle] = useState('')
  const [bcBody, setBcBody] = useState('')
  const [bcUrl, setBcUrl] = useState('/')
  const [bcSending, setBcSending] = useState(false)

  // Keyword alert
  const [kaHours, setKaHours] = useState(24)
  const [kaRunning, setKaRunning] = useState(false)
  const [kaResult, setKaResult] = useState<string | null>(null)

  // Results
  const [bcResult, setBcResult] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/push-stats')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setSubCount(json.data.subscriberCount)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleBroadcast = async () => {
    if (!bcTitle || !bcBody) return
    setBcSending(true)
    setBcResult(null)
    try {
      const res = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'all', title: bcTitle, body: bcBody, url: bcUrl }),
      })
      const json = await res.json()
      if (json.success) {
        const ok = json.result.filter((r: { success: boolean }) => r.success).length
        const fail = json.result.length - ok
        setBcResult(`✅ ${ok}명 전송 성공, ${fail}명 실패`)
      } else {
        setBcResult(`❌ ${json.error || '전송 실패'}`)
      }
    } catch (err) {
      setBcResult(`❌ 통신 오류: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBcSending(false)
    }
  }

  const handleKeywordAlert = async () => {
    setKaRunning(true)
    setKaResult(null)
    try {
      const res = await fetch('/api/admin/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dispatch', hoursBack: kaHours }),
      })
      const json = await res.json()
      if (json.success) {
        setKaResult(
          `✅ 감지: ${json.data.matches}개 매치, 푸시: ${json.data.pushed ?? 0}건 성공, ${json.data.pushFail ?? 0}건 실패`,
        )
      } else {
        setKaResult(`❌ ${json.error || '알림 발송 실패'}`)
      }
    } catch (err) {
      setKaResult(`❌ 통신 오류: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setKaRunning(false)
    }
  }

  return (
    <div className="space-y-8">
      <header className="border-b border-slate-200 pb-4">
        <h1 className="text-3xl font-bold text-slate-900">📬 푸시 알림 관리</h1>
        <p className="text-slate-500 mt-1 text-sm">Web Push 알림 발송 및 키워드 알림 제어</p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase">구독자 수</span>
          <span className="text-2xl font-black text-slate-900 mt-2">
            {loading ? (
              <span className="text-slate-300 animate-pulse">로딩 중...</span>
            ) : (
              <>{subCount ?? 0} <span className="text-xs text-slate-400 font-medium">명</span></>
            )}
          </span>
        </div>
        <div className="bg-white p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase">VAPID 상태</span>
          <span className="text-2xl font-black text-slate-900 mt-2">
            {process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ? (
              <span className="text-emerald-600">✅ 설정됨</span>
            ) : (
              <span className="text-amber-600">⚠️ 개발 모드 (자동 생성)</span>
            )}
          </span>
        </div>
      </div>

      {/* Broadcast */}
      <div className="bg-white rounded-none shadow-sm border border-slate-200 p-6">
        <h2 className="text-base font-bold text-slate-900 mb-4">📢 전체 발송</h2>
        <div className="space-y-3 max-w-lg">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">제목</label>
            <input
              value={bcTitle}
              onChange={(e) => setBcTitle(e.target.value)}
              className="w-full h-10 border border-slate-300 rounded-sm px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="푸시 알림 제목"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">내용</label>
            <textarea
              value={bcBody}
              onChange={(e) => setBcBody(e.target.value)}
              className="w-full border border-slate-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={3}
              placeholder="푸시 알림 본문"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">클릭 시 이동 URL</label>
            <input
              value={bcUrl}
              onChange={(e) => setBcUrl(e.target.value)}
              className="w-full h-10 border border-slate-300 rounded-sm px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            onClick={handleBroadcast}
            disabled={bcSending || !bcTitle || !bcBody}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-sm transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed cursor-pointer"
          >
            {bcSending ? '📤 발송 중...' : '📤 전체 발송'}
          </button>
          {bcResult && (
            <div className={`text-sm font-medium ${bcResult.startsWith('✅') ? 'text-emerald-600' : 'text-rose-600'}`}>
              {bcResult}
            </div>
          )}
        </div>
      </div>

      {/* Keyword Alert Dispatch */}
      <div className="bg-white rounded-none shadow-sm border border-slate-200 p-6">
        <h2 className="text-base font-bold text-slate-900 mb-4">🔔 키워드 알림 발송</h2>
        <p className="text-xs text-slate-500 mb-4">
          사용자가 설정한 키워드 알림을 기준으로 최근 N시간 동안의 신규 기사를 검사하여 푸시 알림을 발송합니다.
        </p>
        <div className="flex items-end gap-3 max-w-lg">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-500 mb-1">검사 범위 (시간)</label>
            <select
              value={kaHours}
              onChange={(e) => setKaHours(Number(e.target.value))}
              className="h-10 border border-slate-300 rounded-sm px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
            onClick={handleKeywordAlert}
            disabled={kaRunning}
            className="px-5 py-2 h-10 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm rounded-sm transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed cursor-pointer"
          >
            {kaRunning ? '⏳ 검사 중...' : '🔍 검사 및 발송'}
          </button>
        </div>
        {kaResult && (
          <div className={`mt-3 text-sm font-medium ${kaResult.startsWith('✅') ? 'text-emerald-600' : 'text-rose-600'}`}>
            {kaResult}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-slate-50 border border-slate-200 p-4 text-xs text-slate-500">
        <strong className="text-slate-700">ℹ️ 참고</strong>
        <ul className="mt-1 space-y-1 list-disc list-inside">
          <li>푸시 알림은 브라우저 Push API를 통해 전송됩니다.</li>
          <li>구독자는 PWA를 통해 알림을 수신합니다.</li>
          <li>VAPID 키가 설정되지 않은 경우 서버에서 자동 생성됩니다 (개발 환경).</li>
          <li>키워드 알림은 사용자가 설정한 alertKeywords 필드를 기준으로 매칭됩니다.</li>
        </ul>
      </div>
    </div>
  )
}
