import { UsageEntry } from '../../core/services/user-preferences.service';

const HALF_LIFE_DAYS = 14;
const DAY_MS = 86_400_000;

/**
 * Stable decayed-usage score: count * exp(-days_since_last_access / 14).
 * Returns 0 when no usage. Safe for undefined/missing entries.
 */
export function usageScore(entry: UsageEntry | undefined, now = Date.now()): number {
  if (!entry || !entry.count) return 0;
  const last = entry.lastAccessed ? new Date(entry.lastAccessed).getTime() : now;
  const days = Math.max(0, (now - last) / DAY_MS);
  return entry.count * Math.exp(-days / HALF_LIFE_DAYS);
}

/**
 * Sort items into: pinned first (in pin order) → usage score desc → original order.
 *
 * @param items   The items to sort. The original array is NOT mutated.
 * @param keyOf   Returns the routePath / id used to look up pin/usage state.
 * @param pinned  Routes in their user-chosen pin order.
 * @param usage   Map of route → {count, lastAccessed}.
 */
export function sortByPinnedAndUsage<T>(
  items: readonly T[],
  keyOf: (item: T) => string | undefined,
  pinned: readonly string[],
  usage: Record<string, UsageEntry>,
): T[] {
  const pinIndex = new Map<string, number>();
  pinned.forEach((r, i) => pinIndex.set(r, i));

  const now = Date.now();
  const withMeta = items.map((item, i) => {
    const key = keyOf(item) ?? '';
    return {
      item,
      originalIndex: i,
      pinRank: pinIndex.has(key) ? pinIndex.get(key)! : Infinity,
      score: usageScore(usage[key], now),
    };
  });

  withMeta.sort((a, b) => {
    if (a.pinRank !== b.pinRank) return a.pinRank - b.pinRank;
    if (a.score !== b.score) return b.score - a.score;
    return a.originalIndex - b.originalIndex;
  });

  return withMeta.map((m) => m.item);
}
