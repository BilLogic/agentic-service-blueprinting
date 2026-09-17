/**
 * Hand the caret back to the agent's composer.
 *
 * Found by attribute rather than by a ref, for the reason `uiBridge` finds a
 * cell by `data-blueprint-cell`: the caller is a shell that does not own the
 * panel's tree, and threading a ref up through the sheet, the panel and the
 * chat view to serve one imperative nudge is a lot of plumbing for a
 * `focus()`. The attribute is the seam and is not otherwise styled.
 *
 * Returns false when there is nothing to focus — no composer mounted, or one
 * disabled for want of an API key. A caller must not claim the reader can
 * keep typing when they cannot.
 */
export function focusAgentComposer(): boolean {
  const composer = document.querySelector<HTMLTextAreaElement>(
    'textarea[data-agent-composer]',
  )
  if (!composer || composer.disabled) return false
  composer.focus()
  return true
}
