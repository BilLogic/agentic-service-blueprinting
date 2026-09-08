/**
 * The cell-content budget: a canvas cell is read at a glance, and the lane
 * grid's row rhythm assumes ~5-6 wrapped lines. 120 characters is that
 * geometry backed out (158px text box, text-sm at 22.75px lines,
 * ~21 chars/line), it matches TITLE_MAX for slices, and the whole corpus
 * already fits (the 2026-08-16 copy sweep's cell-voice convention enforces
 * the same number editorially). Detail beyond the cap belongs in
 * `summary`, which the panel scrolls.
 */
export const CELL_CONTENT_MAX = 120

export type CellContentLengthGuidance = {
  /** The budget the message names. */
  target: number
  overTarget: boolean
  /** Advice when the content runs past the budget; null when it fits. */
  message: string | null
}

/**
 * Advice, never a refusal.
 *
 * Nothing in the schema enforces this number, and the canvas clamps its
 * preview to a fixed face rather than growing to fit, so a longer cell costs
 * the board nothing — the budget is a judgement about how much copy looks
 * right in a card. A field a person types into stops them at it, which
 * prevents; text an agent has already composed is written whole and the
 * caller is told, because discarding finished work to honour a judgement is
 * the worse of the two failures. The full text stays reachable in the cell's
 * own text node and in the detail panel.
 */
export function getCellContentLengthGuidance(
  content: string,
): CellContentLengthGuidance {
  const overTarget = content.length > CELL_CONTENT_MAX
  return {
    target: CELL_CONTENT_MAX,
    overTarget,
    message: overTarget
      ? `Cell content is ${content.length} characters; ${CELL_CONTENT_MAX} is the canvas budget. It was written in full — the canvas shows what fits and the panel holds the rest — so consider moving supporting detail (statistics, caveats, evidence) into the summary.`
      : null,
  }
}
