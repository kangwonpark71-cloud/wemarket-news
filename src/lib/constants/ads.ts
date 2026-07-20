// Shared advertisement contract.
// The Advertisement model stores `adType` and `position` as free Strings, but
// only a fixed set of values are understood by <AdDisplay> / <SidebarAds>.
// Centralizing the allowed values keeps admin input and rendering in sync.
export const AD_TYPES = [
  { value: 'image', label: '이미지' },
  { value: 'text', label: '텍스트' },
  { value: 'html', label: 'HTML' },
] as const

export type AdType = (typeof AD_TYPES)[number]['value']

export const AD_TYPE_VALUES: readonly AdType[] = AD_TYPES.map((t) => t.value)

export function isAdType(value: unknown): value is AdType {
  return typeof value === 'string' && (AD_TYPE_VALUES as readonly string[]).includes(value)
}

export const AD_POSITIONS = [
  { value: 'sidebar', label: '사이드바' },
  { value: 'in-content', label: '본문 내' },
  { value: 'header', label: '헤더' },
  { value: 'footer', label: '푸터' },
] as const

export type AdPosition = (typeof AD_POSITIONS)[number]['value']

export const AD_POSITION_VALUES: readonly AdPosition[] = AD_POSITIONS.map((p) => p.value)

export function isAdPosition(value: unknown): value is AdPosition {
  return typeof value === 'string' && (AD_POSITION_VALUES as readonly string[]).includes(value)
}
