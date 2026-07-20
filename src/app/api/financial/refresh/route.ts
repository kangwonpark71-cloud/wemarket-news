import { NextResponse } from 'next/server'
import { schedulerService } from '@/lib/services/scheduler/scheduler-service'

export async function POST() {
  try {
    const startTime = Date.now()

    await Promise.all([
      schedulerService.updateStockPrices().catch(err => {
        console.warn('[Admin] Stock price update failed during manual refresh:', err.message || err)
      }),
      schedulerService.updateCryptoTickers().catch(err => {
        console.warn('[Admin] Crypto ticker update failed during manual refresh:', err.message || err)
      }),
      schedulerService.updateForexRates().catch(err => {
        console.warn('[Admin] Forex rates update failed during manual refresh:', err.message || err)
      }),
      schedulerService.updateGlobalIndices().catch(err => {
        console.warn('[Admin] Global indices update failed during manual refresh:', err.message || err)
      }),
    ])

    const duration = Date.now() - startTime

    return NextResponse.json({
      success: true,
      duration,
      message: '시장 데이터가 성공적으로 갱신되었습니다.',
    })
  } catch (error) {
    console.error('[Admin] Manual financial data refresh failed:', error)
    return NextResponse.json(
      { success: false, error: '시장 데이터 갱신에 실패했습니다.' },
      { status: 500 }
    )
  }
}