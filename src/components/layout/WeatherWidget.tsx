'use client'

import { useEffect, useState } from 'react'

interface WeatherData {
  stationId: string
  stationName: string
  time: string
  temperature: number
  humidity: number
  windSpeed: number
  rain: number
  status: string
}

export default function WeatherWidget() {
  const [weather, setWeatherData] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [station, setStation] = useState('108')

  useEffect(() => {
    async function loadWeather() {
      try {
        setLoading(true)
        const res = await fetch(`/api/weather?stn=${station}`)
        const data = await res.json()
        if (data.success) {
          setWeatherData(data.data)
        }
      } catch (err) {
        console.error('Failed to load weather:', err)
      } finally {
        setLoading(false)
      }
    }
    loadWeather()
  }, [station])

  if (loading && !weather) {
    return (
      <div className="flex items-center justify-center p-4 bg-white dark:bg-slate-900 rounded-sm border border-slate-200 dark:border-slate-800 h-28">
        <span className="text-slate-400 dark:text-slate-500 text-xs animate-pulse">☀️ 날씨를 불러오는 중...</span>
      </div>
    )
  }

  const weatherIcons: Record<string, string> = {
    '맑음': '☀️',
    '비': '🌧️',
    '흐림': '☁️',
    '구름많음': '⛅',
    '추움': '❄️',
  }

  return (
    <div className="p-4 bg-white dark:bg-slate-900 rounded-sm border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-4">
        <div className="text-4xl">
          {weatherIcons[weather?.status || '맑음'] || '☀️'}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 dark:text-slate-200">{weather?.stationName || '서울'} 날씨</span>
            <select
              value={station}
              onChange={(e) => setStation(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-sm text-slate-600 dark:text-slate-300 text-[10px] px-1 py-0.5 focus:outline-none cursor-pointer"
            >
              <option value="108">서울</option>
              <option value="112">인천</option>
              <option value="119">수원</option>
              <option value="133">대전</option>
              <option value="156">광주</option>
              <option value="143">대구</option>
              <option value="159">부산</option>
              <option value="184">제주</option>
            </select>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {weather?.temperature?.toFixed(1) ?? '26.0'}°C
          </div>
        </div>
      </div>

      <div className="text-right text-xs text-slate-500 dark:text-slate-400 space-y-1">
        <div>습도: <span className="font-semibold text-slate-700 dark:text-slate-300">{weather?.humidity ?? 70}%</span></div>
        <div>풍속: <span className="font-semibold text-slate-700 dark:text-slate-300">{weather?.windSpeed ?? 1.5}m/s</span></div>
        {weather?.rain ? weather.rain > 0 && (
          <div>강수량: <span className="font-semibold text-slate-700 dark:text-slate-300">{weather.rain}mm</span></div>
        ) : null}
        <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{weather?.time?.split(' ')[1] || '12:00'} 기상청 관측</div>
      </div>
    </div>
  )
}