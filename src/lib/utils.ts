import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Bucket items by a derived key, in first-seen order.
 *
 * The push-or-seed loop this replaces was hand-rolled in three of the compare
 * modules — slots by column, ledger slots by column, merged candidates by
 * signature — with the same four lines and the same off-by-one hazard of
 * seeding with `[]` and forgetting to push. `Map` iterates in insertion
 * order, so `[...groupBy(xs, k).values()]` preserves the order the callers
 * that build a parallel array were maintaining by hand.
 */
export function groupBy<T, K>(
  items: Iterable<T>,
  key: (item: T) => K,
): Map<K, T[]> {
  const groups = new Map<K, T[]>()
  for (const item of items) {
    const groupKey = key(item)
    const group = groups.get(groupKey)
    if (group) group.push(item)
    else groups.set(groupKey, [item])
  }
  return groups
}
