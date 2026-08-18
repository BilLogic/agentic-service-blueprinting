import type { CompareModel } from '@/lib/compareSlots'
import type { BlueprintData } from '@/types/blueprint'

/**
 * The compare canvas's column axis as the GRIDS consume it — one view model
 * shared by the stacked bands and the merged grid, so both are drawn
 * against the same canonical step axis. Derived from the compare model,
 * never the DOM. (Fold/pleats retired 2026-08-17 — every track is a plain
 * column now; the `kind` discriminant stays so track consumers read the
 * same shape they always did.)
 */

/** One canonical step column. */
export type CompareGridColumn = {
  key: string
  label: string
  /** This column's backing step id per path — absent path ⇒ inert spacer. */
  stepIdByPath: Readonly<Record<string, string>>
  /** Column-level verdict !== 'shared'. */
  divergent: boolean
}

export type CompareGridTrack = { kind: 'column' } & CompareGridColumn

/**
 * With a model: the canonical column axis. Without one (a single path, or a
 * selection whose blueprints have not all arrived) each path's own steps
 * become their own columns, in band order — there is nothing to align yet.
 */
export function buildCompareGridTracks(
  model: CompareModel | null,
  blueprints: readonly BlueprintData[],
): CompareGridTrack[] {
  if (!model) {
    return blueprints.flatMap((blueprint) =>
      [...blueprint.steps]
        .sort((a, b) => a.column_position - b.column_position)
        .map(
          (step): CompareGridTrack => ({
            kind: 'column',
            key: `${blueprint.path.id}:${step.id}`,
            label: step.name,
            stepIdByPath: { [blueprint.path.id]: step.id },
            divergent: false,
          }),
        ),
    )
  }

  return model.columns.map(
    (column): CompareGridTrack => ({
      kind: 'column',
      key: column.columnKey,
      label: column.label,
      stepIdByPath: column.stepIdByPath,
      divergent: column.verdict !== 'shared',
    }),
  )
}
