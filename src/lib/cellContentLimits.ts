/**
 * The cell-content budget (todo 026): a canvas cell is read at a glance, and
 * the lane grid's row rhythm assumes ~5-6 wrapped lines. 120 characters is
 * that geometry backed out (158px text box, text-sm at 22.75px lines,
 * ~21 chars/line), it matches TITLE_MAX for slices, and the whole corpus
 * already fits (the 2026-08-16 copy sweep's cell-voice convention enforces
 * the same number editorially). Detail beyond the cap belongs in
 * `description`, which the panel scrolls.
 */
export const CELL_CONTENT_MAX = 120

/** Returns an actionable refusal when content exceeds the budget. */
export function checkCellContentLength(content: string): string | null {
  if (content.length <= CELL_CONTENT_MAX) return null
  return (
    `Cell content is ${content.length} characters — the cap is ${CELL_CONTENT_MAX}. ` +
    'A cell is read at a glance on the canvas; keep the complete predicate in content ' +
    'and move supporting detail (statistics, caveats, evidence) into the description.'
  )
}
