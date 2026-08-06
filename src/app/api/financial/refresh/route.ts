import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-response'
import { koreaInvestmentService } from '@/lib/services/financial/financial-service'
import { upbitService } from '@/lib/services/crypto/crypto-service'
import { marketService } from '@/lib/services/market/market-service'
import { createLogger } from '@/lib/logger';

const log = createLogger('ApiFinancialRefresh')

async function updateStockPrices(): Promise<void> {
  await koreaInvestmentService.syncStockMasterToDb()
  const stocks = await koreaInvestmentService.getStockMaster()
  const codes = stocks.map(s => s.code)
  const prices = await koreaInvestmentService.getStockPrices(codes)
  const pricesArray = Array.from(prices.values())
  await koreaInvestmentService.saveStockPricesToDb(pricesArray)
}

async function updateCryptoTickers(): Promise<void> {
  const tickers = await upbitService.getAllTickers()
  await upbitService.saveTickersToDb(tickers)
}

async function updateForexRates(): Promise<void> {
  const rates = await marketService.getAllExchangeRates()
  await marketService.saveExchangeRatesToDb(rates)
}

async function updateGlobalIndices(): Promise<void> {
  const indices = await marketService.getGlobalIndices()
  await marketService.saveGlobalIndicesToDb(indices)
}

export async function POST() {
  try {
    const startTime = Date.now()

    await Promise.all([
      updateStockPrices().catch(err => {
        log.warn('[Admin] Stock price update failed during manual refresh:', err.message || err)
      }),
      updateCryptoTickers().catch(err => {
        log.warn('[Admin] Crypto ticker update failed during manual refresh:', err.message || err)
      }),
      updateForexRates().catch(err => {
        log.warn('[Admin] Forex rates update failed during manual refresh:', err.message || err)
      }),
      updateGlobalIndices().catch(err => {
        log.warn('[Admin] Global indices update failed during manual refresh:', err.message || err)
      }),
    ])

    const duration = Date.now() - startTime

    return NextResponse.json({
      success: true,
      duration,
      message: '시장 데이터가 성공적으로 갱신되었습니다.',
    })
  } catch (error) {
    log.error('[Admin] Manual financial data refresh failed:', error)
    return apiError('시장 데이터 갱신에 실패했습니다.', 500)
  }
}
