/**
 * Newsletter Interest Options
 * Shared pure module (no prisma/DB imports) — safe to use in both client and server code.
 * Defines the interest taxonomy used by the personalized newsletter digest.
 */

export interface InterestOption {
  id: string;
  label: string;
  keywords: string[];
}

export const INTEREST_OPTIONS: InterestOption[] = [
  {
    id: 'economy',
    label: '경제',
    keywords: ['경제', '금융', '환율', '금리', '주식', '증시', '코스피', '경기', '물가', '수출', '인플레이션'],
  },
  {
    id: 'tech',
    label: 'AI·IT',
    keywords: ['AI', '인공지능', 'IT', '기술', '반도체', '클라우드', '소프트웨어', '테크', '빅테크', '데이터', '로봇', '개발자'],
  },
  {
    id: 'world',
    label: '글로벌',
    keywords: ['미국', '중국', '글로벌', '국제', '연준', 'Fed', '유럽', '일본', '무역', '관세', '환율'],
  },
  {
    id: 'stock',
    label: '주식·증시',
    keywords: ['주식', '증시', '코스피', '코스닥', '상장', 'IPO', '배당', '증권', '주가', '투자', '펀드'],
  },
  {
    id: 'crypto',
    label: '코인·가상자산',
    keywords: ['비트코인', '코인', '가상자산', '암호화폐', '블록체인', '이더리움', '리플', '알트코인', '토큰'],
  },
  {
    id: 'realestate',
    label: '부동산',
    keywords: ['부동산', '주택', '아파트', '전세', '월세', '분양', '재건축', '청약', '임대', '매매'],
  },
  {
    id: 'startup',
    label: '스타트업',
    keywords: ['스타트업', '창업', '벤처', '투자유치', '엔젤', '시리즈', '스케일업', '유니콘'],
  },
];

export const INTEREST_BY_ID = new Map(INTEREST_OPTIONS.map((o) => [o.id, o]));

/**
 * Parse a comma-separated interests string into valid interest ids.
 * Unknown ids are dropped.
 */
export function parseInterests(interests: string): string[] {
  if (!interests) return [];
  return interests
    .split(',')
    .map((s) => s.trim())
    .filter((s) => INTEREST_BY_ID.has(s));
}

/**
 * Parse a comma-separated alertKeywords string into trimmed keyword list.
 */
export function parseKeywords(alertKeywords: string): string[] {
  if (!alertKeywords) return [];
  return alertKeywords
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Human-readable labels for a comma-separated interests string.
 * Returns '전체' when empty or nothing matches.
 */
export function getInterestLabels(interests: string): string {
  const labels = parseInterests(interests)
    .map((id) => INTEREST_BY_ID.get(id)?.label)
    .filter((l): l is string => Boolean(l));
  return labels.length > 0 ? labels.join(', ') : '전체';
}
