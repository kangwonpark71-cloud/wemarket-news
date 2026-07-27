export function parseList(value: string | string[] | null | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return value
    .split(',')
    .map(item => item.trim())
    .filter(item => item.length > 0);
}

export function stringifyList(arr: string[]): string {
  return arr.join(',');
}
