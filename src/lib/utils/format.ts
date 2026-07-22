'use client';

/**
 * 한국 원화(KRW) 통화 포맷터
 * Intl.NumberFormat을 사용하여 ₩ 기호와 천단위 구분자를 포함한 포맷 반환
 */
const krwFormatter = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const krwDecimalFormatter = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * 숫자를 한국 원화 포맷으로 변환 (소수점 없음)
 * @example formatKRW(1234567) → "₩1,234,567"
 */
export function formatKRW(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '-';
  return krwFormatter.format(value);
}

/**
 * 숫자를 한국 원화 포맷으로 변환 (소수점 2자리)
 * @example formatKRWDecimal(1234.56) → "₩1,235"
 */
export function formatKRWDecimal(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '-';
  return krwDecimalFormatter.format(value);
}

/**
 * 숫자를 천단위 구분자 포함 포맷으로 변환 (통화 기호 없음)
 * @example formatNumber(1234567) → "1,234,567"
 */
const numberFormatter = new Intl.NumberFormat('ko-KR');

export function formatNumber(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '-';
  return numberFormatter.format(value);
}
