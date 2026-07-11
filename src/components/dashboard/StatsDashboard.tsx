'use client'

import { useEffect, useState } from 'react'

interface FetchLog {
  id: string
  sourceId: string
  status: string
  count: number
  newCount: number
  error: string | null
  duration: number | null
  fetchedAt: string
  source: {
    name: string
    nameEn: string
    category: string
  }
}

interface Stats {
  totalArticles: number
  totalSources: number
  lastFetchAt: string | null
  lastFetchStatus: string | null
  lastFetchCount: number
  lastFetchNewCount: number
  articlesByCategory: { category: string | null; count: number }[]
  recentFetchLogs: FetchLog[]
}

export default function StatsDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => {
        if (data.success) setStats(data.data)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="rounded-lg border border-gray-200 bg-gray-50 p-6 animate-pulse">
            <div className="h-4 w-3/4 bg-gray-200 rounded mb-2" />
            <div className="h-8 w-1/2 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (!stats) return null

  return (
    <section aria-labelledby="stats-heading">
      <h2 id="stats-heading" className="sr-only">
        통계 대시보드
      </h2>

      <div className="grid gap-4 mb-8 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="전체 기사"
          value={stats.totalArticles.toLocaleString()}
          icon="📰"
          color="blue"
        />
        <StatCard
          label="활성 소스"
          value={stats.totalSources}
          icon="📡"
          color="green"
        />
        <StatCard
          label="마지막 수집"
          value={stats.lastFetchAt ? formatRelativeTime(stats.lastFetchAt) : '없음'}
          icon="⏰"
          color="purple"
        />
        <StatCard
          label="마지막 수집량"
          value={`${stats.lastFetchNewCount} / ${stats.lastFetchCount} new`}
          icon="📥"
          color="orange"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold">카테고리별 기사 수</h3>
          <div className="space-y-3">
            {stats.articlesByCategory.map((item) => (
              <div key={item.category} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">
                  {item.category || '분류 없음'}
                </span>
                <span className="font-medium text-gray-900">
                  {item.count.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold">최근 수집 로그</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {stats.recentFetchLogs.slice(0, 10).map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <StatusBadge status={log.status} />
                  <span className="font-medium">{log.source?.name}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-500">
                  <span>{log.count}건 ({log.newCount} new)</span>
                  <span>{formatRelativeTime(log.fetchedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string
  value: string | number
  icon: string
  color: 'blue' | 'green' | 'purple' | 'orange'
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <span className={`rounded-full p-3 ${colors[color]}`} aria-hidden="true">
          {icon}
        </span>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors = {
    success: 'bg-green-100 text-green-700',
    partial: 'bg-yellow-100 text-yellow-700',
    error: 'bg-red-100 text-red-700',
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-700'
      }`}
    >
      {status}
    </span>
  )
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return '방금 전'
  if (diffMins < 60) return `${diffMins}분 전`
  if (diffHours < 24) return `${diffHours}시간 전`
  if (diffDays < 7) return `${diffDays}일 전`
  return date.toLocaleDateString('ko-KR')
}