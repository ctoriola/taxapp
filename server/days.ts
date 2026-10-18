// Visit statistics are bucketed by calendar day in Lagos (WAT, UTC+1, no daylight saving)
const LAGOS_OFFSET_MS = 60 * 60 * 1000;

export function lagosDayKey(time: number): string {
  return new Date(time + LAGOS_OFFSET_MS).toISOString().slice(0, 10);
}

export function lastDayKeys(count: number, now: number): string[] {
  return Array.from({ length: count }, (_, i) => lagosDayKey(now - (count - 1 - i) * 86_400_000));
}

// Monday-start week containing the given 'YYYY-MM-DD'
export function weekStart(dayKey: string): string {
  const date = new Date(`${dayKey}T00:00:00Z`);
  const mondayOffset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - mondayOffset);
  return date.toISOString().slice(0, 10);
}
