// Shared banner position contract.
// The Banner model stores `position` as a free String, but only these three
// layouts are rendered by <BannerDisplay>. Centralizing the allowed values
// prevents an invalid position (e.g. "header") from silently falling through
// to the default (bottom) grid layout.
export const BANNER_POSITIONS = [
  { value: 'top', label: '상단' },
  { value: 'sidebar', label: '사이드바' },
  { value: 'bottom', label: '하단' },
] as const

export type BannerPosition = (typeof BANNER_POSITIONS)[number]['value']

export const BANNER_POSITION_VALUES: readonly BannerPosition[] = BANNER_POSITIONS.map(
  (p) => p.value,
)

export function isBannerPosition(value: unknown): value is BannerPosition {
  return (
    typeof value === 'string' &&
    (BANNER_POSITION_VALUES as readonly string[]).includes(value)
  )
}
