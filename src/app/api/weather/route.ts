import { NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger';

const log = createLogger('ApiWeather')

const STATION_NAMES: Record<string, string> = {
  '108': '서울',
  '112': '인천',
  '119': '수원',
  '159': '부산',
  '143': '대구',
  '156': '광주',
  '133': '대전',
  '184': '제주',
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const stn = searchParams.get('stn') || '108'
  const authKey = process.env.KMA_AUTH_KEY
  if (!authKey) {
    // KMA_AUTH_KEY not configured — return mock data so the endpoint stays functional.
    log.warn('KMA_AUTH_KEY not set, returning mock weather data')
    return NextResponse.json({
      success: true,
      data: {
        stationId: '108',
        stationName: '서울',
        time: new Date().toISOString().slice(0, 16).replace('T', ' '),
        temperature: 22,
        dewPoint: 18,
        humidity: 65,
        windSpeed: 3,
        windDirection: 0,
        rain: 0,
        status: '맑음',
        mock: true,
      },
    })
  }

  try {
    const url = `https://apihub.kma.go.kr/api/typ01/url/kma_sfctm2.php?stn=${stn}&authKey=${authKey}`
    const response = await fetch(url, { next: { revalidate: 600 } })

    if (!response.ok) {
      throw new Error(`Weather API returned status: ${response.status}`)
    }

    const text = await response.text()
    const lines = text.split('\n')
    
    const dataLine = lines.find(line => line.trim() && !line.startsWith('#'))

    if (!dataLine) {
      throw new Error('No weather data line found in response')
    }

    const tokens = dataLine.trim().split(/\s+/)

    if (tokens.length < 16) {
      throw new Error('Weather data tokens are incomplete')
    }

    const timestamp = tokens[0]
    const stationId = tokens[1]
    const windDirectionRaw = parseFloat(tokens[2])
    const windSpeed = parseFloat(tokens[3])
    const tempCelsius = parseFloat(tokens[11])
    const dewPoint = parseFloat(tokens[12])
    const humidity = parseFloat(tokens[13])
    const rainRaw = parseFloat(tokens[15])

    let formattedTime = timestamp
    if (timestamp.length === 12) {
      const year = timestamp.substring(0, 4)
      const month = timestamp.substring(4, 6)
      const day = timestamp.substring(6, 8)
      const hour = timestamp.substring(8, 10)
      const min = timestamp.substring(10, 12)
      formattedTime = `${year}-${month}-${day} ${hour}:${min}`
    }

    const rain = rainRaw === -9 || rainRaw < 0 ? 0 : rainRaw

    let status = '맑음'
    if (rain > 0) {
      status = '비'
    } else if (humidity > 85) {
      status = '흐림'
    } else if (humidity > 60 && tempCelsius > 20) {
      status = '구름많음'
    } else if (tempCelsius < 0) {
      status = '추움'
    }

    return NextResponse.json({
      success: true,
      data: {
        stationId,
        stationName: STATION_NAMES[stationId] || `지점 ${stationId}`,
        time: formattedTime,
        temperature: tempCelsius,
        dewPoint,
        humidity,
        windSpeed,
        windDirection: windDirectionRaw,
        rain,
        status,
      },
    })
  } catch (error) {
    log.error('Failed to fetch weather data:', error)
    return NextResponse.json(
      { success: false, error: '기상청 날씨 데이터를 가져오는 데 실패했습니다.' },
      { status: 500 }
    )
  }
}