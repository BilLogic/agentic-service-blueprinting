/**
 * True while any panel's editor has a save in flight. Every dismiss path
 * (Escape, ✕-driven close requests) checks this: closing mid-save reads as
 * "cancelled", but the write lands anyway — for a draft that means a cell
 * materializing after the panel that explained it is gone.
 *
 * The marker is `data-panel-editor`, not `data-cell-panel-editor`: the guard
 * has to cover the lane, phase and scenario editors too, and an attribute
 * naming one panel would have quietly guarded only that one.
 */
export function panelEditorBusy(): boolean {
  return document.querySelector('[data-panel-editor][data-busy]') !== null
}
