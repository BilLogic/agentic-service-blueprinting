/** Canvas-copy guidance. These are editorial signals, never storage limits. */
export const CELL_CONTENT_TARGET = 80
export const CELL_CONTENT_WARNING = 100
export const TECH_PILL_LABEL_TARGET = 32
export const TECH_PILL_LABEL_WARNING = 48

export type CellContentLengthGuidance = {
  target: number
  warning: number
  overWarning: boolean
  message: string | null
}

/**
 * The canvas clamps previews, so canonical content never needs truncating.
 * Return a soft, actionable warning while allowing humans and agents to keep
 * the complete predicate. Supporting detail still belongs in Summary.
 */
export function getCellContentLengthGuidance(
  content: string,
): CellContentLengthGuidance {
  const overWarning = content.length > CELL_CONTENT_WARNING
  return {
    target: CELL_CONTENT_TARGET,
    warning: CELL_CONTENT_WARNING,
    overWarning,
    message: overWarning
      ? `Cell text is ${content.length} characters; ${CELL_CONTENT_TARGET} is the canvas target and ${CELL_CONTENT_WARNING} is the review threshold. It was preserved in full—consider moving supporting detail into Summary.`
      : null,
  }
}
