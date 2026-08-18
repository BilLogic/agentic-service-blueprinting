/**
 * Sidebar group taxonomy for slices — one home for the desktop sidebar and
 * the mobile drawer, so the two surfaces can never disagree on where a
 * slice files. Unknown types fall into CUSTOM.
 */

export const SLICE_TYPE_GROUPS = [
  'journey',
  'step',
  'lane',
  'cell',
  'custom',
] as const

export type SliceTypeGroup = (typeof SLICE_TYPE_GROUPS)[number]

export function sliceTypeGroup(sliceType: string): SliceTypeGroup {
  const type = sliceType.toLowerCase()
  return SLICE_TYPE_GROUPS.find((group) => group === type) ?? 'custom'
}

/** Non-empty groups in canonical order, each holding its slices. */
export function groupSlicesByType<T extends { slice_type: string }>(
  slices: readonly T[],
): Array<{ type: SliceTypeGroup; slices: T[] }> {
  return SLICE_TYPE_GROUPS.map((type) => ({
    type,
    slices: slices.filter((slice) => sliceTypeGroup(slice.slice_type) === type),
  })).filter((group) => group.slices.length > 0)
}
