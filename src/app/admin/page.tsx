'use client'

import { useState, useEffect, useMemo } from 'react'
import { createLogger } from '@/lib/logger';

const log = createLogger('AdminPage')

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

interface FetchLogEntry {
  id: string
  status: string
  count: number
  newCount: number
  error: string | null
  duration: number | null
  fetchedAt: string
  source: { name: string } | null
  sourceId: string
}

interface StatsData {
  totalArticles?: number
  totalSources?: number
  lastFetchAt?: string
  lastFetchStatus?: string
  lastFetchNewCount?: number
  recentFetchLogs?: FetchLogEntry[]
  sourceHealth?: SourceHealthEntry[]
}

interface SourceHealthEntry {
  id: string
  name: string
  nameEn: string
  category: string
  sourceType: string
  articleCount: number
  fetchCount: number
  successRate: number
  lastFetchAt: string | null
  lastFetchStatus: string | null
  lastFetchCount: number
  avgDuration: number | null
}

export default function AdminPage() {
  const [sources, setSources] = useState<Source[]>([])
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [triggeringId, setTriggeringId] = useState<string | null>(null)
  const [triggerResults, setTriggerResults] = useState<Record<string, string>>({})

  const successRate = useMemo(() => {
    if (!stats?.recentFetchLogs || stats.recentFetchLogs.length === 0) return 100;
    const successCount = stats.recentFetchLogs.filter(
      (l: FetchLogEntry) => l.status === 'success' || l.status === 'partial'
    ).length;
    return Math.round((successCount / stats.recentFetchLogs.length) * 100);
  }, [stats]);

  useEffect(() => {
    fetchSources()
  }, [])

  const fetchSources = async () => {
    try {
      const [sourcesRes, statsRes] = await Promise.all([
        fetch('/api/admin/sources'),
        fetch('/api/stats'),
      ])
      const sourcesData = await sourcesRes.json()
      const statsData = await statsRes.json()

      if (sourcesData.success) {
        setSources(sourcesData.sources)
      }
      if (statsData.success) {
        setStats(statsData.data)
      }
    } catch (err) {
      log.error('Failed to load sources:', err)
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
      log.error('Failed to update source:', err)
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
          
          const statsRes = await fetch('/api/stats')
          const statsData = await statsRes.json()
          if (statsData.success) {
            setStats(statsData.data)
          }
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
    <div className="max-w-7xl mx-auto">
        <header className="mb-8 border-b border-slate-200 pb-4">
          <h1 className="text-3xl font-bold text-slate-900">🛡️ 대시보드</h1>
          <p className="text-slate-500 mt-1 text-sm">수집 매체 관리, 수집 주기 설정, 시스템 현황</p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 border border-slate-200 rounded-none shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">수집된 전체 기사 수</span>
            <span className="text-2xl font-black text-slate-900 mt-2">
              {stats?.totalArticles?.toLocaleString() || '0'} <span className="text-xs text-slate-400 font-medium">건</span>
            </span>
          </div>

          <div className="bg-white p-5 border border-slate-200 rounded-none shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">활성화된 수집 비서</span>
            <span className="text-2xl font-black text-slate-900 mt-2">
              {stats?.totalSources || '0'} <span className="text-xs text-slate-400 font-medium">개 채널</span>
            </span>
          </div>

          <div className="bg-white p-5 border border-slate-200 rounded-none shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">수집기 작동 성공률 (최근 20회)</span>
            <span className="text-2xl font-black text-emerald-600 mt-2">
              {successRate}%
            </span>
          </div>

          <div className="bg-white p-5 border border-slate-200 rounded-none shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">마지막 수집 기동 및 상태</span>
            <span className="text-sm font-bold text-slate-700 mt-2 truncate">
              {stats?.lastFetchAt ? (
                <span className="flex items-center gap-1.5">
                  <span className={`inline-block h-2.5 w-2.5 rounded-full ${stats.lastFetchStatus === 'success' || stats.lastFetchStatus === 'partial' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  {new Date(stats.lastFetchAt).toLocaleTimeString('ko-KR')} ({stats.lastFetchNewCount}개 수집)
                </span>
              ) : '대기 중'}
            </span>
          </div>
        </div>

        {stats?.sourceHealth && stats.sourceHealth.length > 0 && (
          <div className="bg-white rounded-none shadow-sm border border-slate-200 overflow-hidden mb-8">
            <div className="py-4 px-6 bg-slate-50/50 border-b border-slate-200 font-bold text-sm text-slate-700">
              📊 소스별 건강 상태
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/50 text-slate-600 font-semibold text-xs border-b border-slate-200">
                    <th className="py-3 px-4">소스명</th>
                    <th className="py-3 px-4 text-center">기사 수</th>
                    <th className="py-3 px-4 text-center">수집 횟수</th>
                    <th className="py-3 px-4 text-center">성공률</th>
                    <th className="py-3 px-4">마지막 수집</th>
                    <th className="py-3 px-4 text-center">상태</th>
                    <th className="py-3 px-4 text-right">평균 소요</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.sourceHealth.map((source: SourceHealthEntry) => {
                    const isStale = source.lastFetchAt
                      ? (Date.now() - new Date(source.lastFetchAt).getTime()) > 4 * 60 * 60 * 1000
                      : true;
                    return (
                      <tr key={source.id} className="hover:bg-slate-50 text-sm">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{source.name}</div>
                          <div className="text-slate-400 text-xs">{source.nameEn}</div>
                        </td>
                        <td className="py-3 px-4 text-center tabular-nums font-medium text-slate-700">
                          {source.articleCount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center tabular-nums text-slate-500">
                          {source.fetchCount}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`font-bold ${
                            source.successRate >= 90 ? 'text-emerald-600' :
                            source.successRate >= 70 ? 'text-amber-600' : 'text-rose-600'
                          }`}>
                            {source.successRate}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500">
                          {source.lastFetchAt
                            ? new Date(source.lastFetchAt).toLocaleString('ko-KR')
                            : <span className="text-slate-300">수집 기록 없음</span>}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-semibold ${
                            isStale
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : source.lastFetchStatus === 'success'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${
                              isStale ? 'bg-amber-500' :
                              source.lastFetchStatus === 'success' ? 'bg-emerald-500' : 'bg-rose-500'
                            }`} />
                            {isStale ? 'STALE' : source.lastFetchStatus === 'success' ? 'OK' : 'ERROR'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums text-slate-500 text-xs">
                          {source.avgDuration ? `${source.avgDuration.toLocaleString()}ms` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="bg-white rounded-none shadow-sm border border-slate-200 overflow-hidden mb-8">
          <div className="py-4 px-6 bg-slate-50/50 border-b border-slate-200 font-bold text-sm text-slate-700">
            수집 매체 및 스케줄러 세부 설정
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/50 text-slate-600 font-semibold text-xs border-b border-slate-200">
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
                      <span className={`px-2 py-1 rounded-sm text-xs font-semibold ${source.sourceType === 'RSS' ? 'bg-orange-50 text-orange-600 border border-orange-200' : 'bg-blue-50 text-blue-600 border border-blue-200'}`}>
                        {source.sourceType}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-500 capitalize">{source.category}</td>
                    <td className="py-4 px-6">
                      <button
                        onClick={() => handleUpdate(source.id, source.fetchInterval, !source.isActive)}
                        className={`px-3 py-1 rounded-sm text-xs font-semibold cursor-pointer transition-all ${source.isActive ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-rose-100 text-rose-700 hover:bg-rose-200'}`}
                      >
                        {source.isActive ? '● 활성화' : '○ 비활성화'}
                      </button>
                    </td>
                    <td className="py-4 px-6">
                      <select
                        value={source.fetchInterval}
                        onChange={(e) => handleUpdate(source.id, parseInt(e.target.value, 10), source.isActive)}
                        className="bg-white border border-slate-300 rounded-sm px-2 py-1 text-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
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
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-3 py-1.5 rounded-sm text-xs transition-colors cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
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

        <div className="bg-white rounded-none border border-slate-200 shadow-sm p-6">
          <h2 className="text-base font-bold text-slate-900 mb-2">📑 최근 20회의 백엔드 수집 세부 이력 및 디버그</h2>
          <p className="text-xs text-slate-500 mb-4">크롤러 및 RSS 수집 비서의 실시간 오류 추적 및 처리 시간 통계 리포트</p>

          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 sticky top-0 z-10">
                  <th className="py-3 px-4">기동시간</th>
                  <th className="py-3 px-4">매체 소스명</th>
                  <th className="py-3 px-4 text-center">상태</th>
                  <th className="py-3 px-4 text-right">총 기사</th>
                  <th className="py-3 px-4 text-right">신규 기사</th>
                  <th className="py-3 px-4 text-right">소요 시간 (ms)</th>
                  <th className="py-3 px-4">발생 오류 내용 및 요약</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {stats?.recentFetchLogs?.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      수집된 백엔드 이력이 존재하지 않습니다.
                    </td>
                  </tr>
                ) : (
                  stats?.recentFetchLogs?.map((log: FetchLogEntry) => {
                    const isSuccess = log.status === 'success' || log.status === 'partial';
                    return (
                      <tr key={log.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 text-slate-500 tabular-nums">
                          {new Date(log.fetchedAt).toLocaleString('ko-KR')}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-700">
                          {log.source?.name || log.sourceId}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-sm font-bold text-[10px] ${isSuccess ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                            {log.status === 'success' ? 'SUCCESS' : log.status === 'partial' ? 'PARTIAL' : 'ERROR'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums text-slate-600">{log.count}</td>
                        <td className="py-3 px-4 text-right tabular-nums text-emerald-600 font-bold">+{log.newCount}</td>
                        <td className="py-3 px-4 text-right tabular-nums text-slate-500">{log.duration?.toLocaleString() || '-'}</td>
                        <td className="py-3 px-4 text-rose-600 max-w-xs truncate" title={log.error || ''}>
                          {log.error || <span className="text-slate-300 font-normal">-</span>}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
      </div>
    </div>
  )
}