/**
 * A cell's resources, resolved from whichever source the board came from.
 *
 * The database stores them as rows: one `resources` row per thing a cell
 * points at, carrying its own name, url, kind and order. That was a jsonb
 * array on `cells` called `links`, which held resources and touchpoint prose
 * at once under a name that described one of them.
 *
 * The generated fallback blueprints in `src/data` carry the same two lists a
 * database read produces, so a no-database build serves what a database build
 * serves. `cellTouchpoints.ts` is the sibling for the other half of the array
 * that used to hold both.
 */
import type { BlueprintCell, CellResource } from '@/types/blueprint'

/** A `resources` row as the board query selects it. */
export type RawCellResource = {
  position: number
  kind?: string | null
  name?: string | null
  url?: string | null
}

/**
 * The name an unnamed resource takes: the host of its url.
 *
 * ONE RULE, WRITTEN ONCE, IN TWO LANGUAGES. The migration that created the
 * table carries this pattern verbatim to name an entry that arrived without a
 * label, and `scripts/tests/one-name-for-an-unnamed-resource.test.ts` fails
 * when the two texts differ. It is a pattern rather than a `new URL()` because
 * a rule expressed twice in two dialects agrees only by luck: `URL` lowercases
 * a host, punycodes an international one, and keeps square brackets on an IPv6
 * literal, and no SQL expression does all three. Two answers to "what is this
 * called when nobody said" is how one board starts disagreeing with itself
 * about its own contents.
 */
export const RESOURCE_NAME_FROM_URL =
  '^https?://(?:[^@/?#]*@)?(?:www\\.)?([^/?#:]+).*$'

/** The host of a url, for a resource nobody named. */
export function hostOf(url: string): string {
  const match = new RegExp(RESOURCE_NAME_FROM_URL).exec(url.trim().toLowerCase())
  return match?.[1] ?? 'Link'
}

/** Resources from database rows, in the order the author put them. */
export function cellResourcesFromRows(
  rows: readonly RawCellResource[] | null | undefined,
): CellResource[] {
  if (!rows || rows.length === 0) return []

  return rows
    .filter((row) => (row.name ?? '').trim())
    .slice()
    // Sorted here rather than trusted: PostgREST does not promise an order for
    // an embedded relation, so the list would otherwise come back in whatever
    // order the planner chose.
    .sort((a, b) => a.position - b.position)
    .map((row) => ({
      name: row.name!.trim(),
      kind: row.kind?.trim() || 'link',
      url: row.url?.trim() || null,
    }))
}

/**
 * What a cell points at.
 *
 * The one accessor, so a component never reads the optional field and has to
 * decide what `undefined` means. Both generators and the normalizer set it;
 * a hand-written test fixture that omits it points at nothing.
 */
export function cellResources(
  cell: Partial<Pick<BlueprintCell, 'resources'>>,
): CellResource[] {
  return cell.resources ?? []
}
