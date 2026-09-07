import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * What went wrong, as a string a person can read.
 *
 * The `catch` block that writes this by hand appeared in two dozen files,
 * byte-identical every time — and a `catch` binding is `unknown`, so the
 * alternative to a helper is every call site remembering that `String(e)` on
 * a bare object says "[object Object]". One place to change the day we want
 * a cause chain or a code in the message.
 */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
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
