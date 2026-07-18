'use client'

import { useState, useEffect } from 'react'

interface Source {
  id: string
  name: string
  nameEn: string
  url: string
  sourceType: 'RSS' | 'AI_IT'
  category: string
  isActive: boolean
  fetchInterval: number
  fetchType: string
}

export default function AdminPage() {
  const [sources, setSources] = useState<Source[]>([])
  const [loading, setLoading] = useState(true)
  const [triggeringId, setTriggeringId] = useState<string | null>(null)
  const [triggerResults, setTriggerResults] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchSources()
  }, [])

  const fetchSources = async () => {
    try {
      const res = await fetch('/api/admin/sources')
      const data = await res.json()
      if (data.success) {
        setSources(data.sources)
      }
    } catch (err) {
      console.error('Failed to load sources:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async (id: string, fetchInterval: number, isActive: boolean) => {
    try {
      const res = await fetch('/api/admin/sources', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, fetchInterval, isActive }),
      })
      const data = await res.json()
      if (data.success) {
        setSources(prev => prev.map(s => (s.id === id ? data.source : s)))
      }
    } catch (err) {
      console.error('Failed to update source:', err)
    }
  }

  const handleTrigger = async (id: string) => {
    setTriggeringId(id)
    setTriggerResults(prev => ({ ...prev, [id]: '🔄 수집 기동 중...' }))
    try {
      const res = await fetch('/api/admin/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: id }),
      })
      const data = await res.json()
      if (data.success) {
        const result = data.result
        if (result.status === 'success' || result.status === 'partial') {
          setTriggerResults(prev => ({
            ...prev,
            [id]: `✅ 성공: 총 ${result.total ?? 0}개 중 신규 ${result.new ?? 0}개`,
          }))
        } else {
          setTriggerResults(prev => ({
            ...prev,
            [id]: `❌ 실패: ${result.error || '알 수 없는 오류'}`,
          }))
        }
      } else {
        setTriggerResults(prev => ({
          ...prev,
          [id]: `❌ 에러: ${data.error || '서버 통신 실패'}`,
        }))
      }
    } catch (err) {
      setTriggerResults(prev => ({
        ...prev,
        [id]: `❌ 통신 실패: ${err instanceof Error ? err.message : String(err)}`,
      }))
    } finally {
      setTriggeringId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 text-slate-600">
        <div className="text-lg font-semibold animate-pulse">⚙️ 관리자 대시보드 로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 border-b border-slate-200 pb-4">
          <h1 className="text-3xl font-bold text-slate-900">🛡️ 위마켓_뉴스 관리자 대시보드</h1>
          <p className="text-slate-500 mt-1">수집 매체 관리, 수집 주기 설정 및 수동 크롤링 강제 기동 컨트롤러</p>
        </header>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600 font-semibold text-sm border-b border-slate-200">
                  <th className="py-4 px-6">매체명 / 영문ID</th>
                  <th className="py-4 px-6">유형</th>
                  <th className="py-4 px-6">카테고리</th>
                  <th className="py-4 px-6">수집 상태</th>
                  <th className="py-4 px-6">수집 주기</th>
                  <th className="py-4 px-6 text-center">동작</th>
                  <th className="py-4 px-6">수집 결과 및 디버깅</th>
                </tr>
              </thead>
              <tbody>
                {sources.map(source => (
                  <tr key={source.id} className="border-b border-slate-100 hover:bg-slate-50 text-sm">
                    <td className="py-4 px-6">
                      <div className="font-semibold text-slate-900">{source.name}</div>
                      <div className="text-slate-400 text-xs">{source.nameEn}</div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${source.sourceType === 'RSS' ? 'bg-orange-50 text-orange-600 border border-orange-200' : 'bg-blue-50 text-blue-600 border border-blue-200'}`}>
                        {source.sourceType}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-500 capitalize">{source.category}</td>
                    <td className="py-4 px-6">
                      <button
                        onClick={() => handleUpdate(source.id, source.fetchInterval, !source.isActive)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all ${source.isActive ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-rose-100 text-rose-700 hover:bg-rose-200'}`}
                      >
                        {source.isActive ? '● 활성화' : '○ 비활성화'}
                      </button>
                    </td>
                    <td className="py-4 px-6">
                      <select
                        value={source.fetchInterval}
                        onChange={(e) => handleUpdate(source.id, parseInt(e.target.value, 10), source.isActive)}
                        className="bg-white border border-slate-300 rounded px-2 py-1 text-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                      >
                        {source.sourceType === 'RSS' ? (
                          <>
                            <option value={1}>1시간</option>
                            <option value={3}>3시간</option>
                            <option value={6}>6시간</option>
                            <option value={12}>12시간</option>
                            <option value={24}>24시간</option>
                          </>
                        ) : (
                          <>
                            <option value={15}>15분</option>
                            <option value={30}>30분</option>
                            <option value={60}>60분</option>
                            <option value={180}>180분</option>
                          </>
                        )}
                      </select>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button
                        disabled={triggeringId !== null}
                        onClick={() => handleTrigger(source.id)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-3 py-1.5 rounded text-xs transition-colors cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
                      >
                        ⚡ 강제수집
                      </button>
                    </td>
                    <td className="py-4 px-6">
                      <div className={`font-medium ${triggerResults[source.id]?.includes('❌') ? 'text-rose-600' : triggerResults[source.id]?.includes('✅') ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {triggerResults[source.id] || <span className="text-slate-300 text-xs">수집 대기 중</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}