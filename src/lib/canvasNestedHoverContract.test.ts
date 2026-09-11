import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

function read(path: string): string {
  return readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8')
}

/** Whitespace collapsed, so a selector reads the same however it is wrapped. */
function flat(source: string): string {
  return source.replace(/\s+/g, ' ').replace(/\( /g, '(').replace(/ \)/g, ')')
}

const phaseSectionSource = read('../components/editor/CanvasPhaseSection.tsx')
const zoomPanSource = read('../hooks/useZoomPanViewport.ts')
const blueprintCss = flat(read('../styles/blueprint.css'))

const DIMMED_PHASE = '[data-canvas-phase-section][data-canvas-focus-dimmed]'

/*
 * A phase that is not the focus dims — but not as one layer.
 *
 * Opacity on the section composites its whole subtree into a single
 * translucent surface, and nothing inside a translucent ancestor can become
 * clearer than it. A hovered scenario in a dimmed phase could change fill and
 * shadow and still sit at 0.3. So the dim lands on the section's children —
 * its frame, its badge, each scenario — and a scenario can lift on its own.
 */
describe('a dimmed phase dims its children, not itself', () => {
  it('puts no opacity on the section element', () => {
    expect(phaseSectionSource).not.toMatch(/opacity-\d/)
  })

  it('dims the frame, the badge and each scenario independently', () => {
    expect(blueprintCss).toContain(`${DIMMED_PHASE} > [data-phase-frame]`)
    expect(blueprintCss).toContain(`${DIMMED_PHASE} > [data-phase-title-badge]`)
    expect(blueprintCss).toContain(`${DIMMED_PHASE} [data-focus-slide-id]`)
  })

  it('lifts one scenario on hover or focus without lifting its siblings', () => {
    expect(blueprintCss).toContain(
      '[data-focus-slide-id]:has(> [data-phase-scenario-panel]:hover)',
    )
    expect(blueprintCss).toContain(
      '[data-focus-slide-id]:has(> [data-phase-scenario-panel]:focus-within)',
    )
  })

  it('dims exactly the elements the camera fades during a flight', () => {
    // The flight hands focus from one phase to the next by writing opacity on
    // these elements frame by frame. A dim on any other element would stack
    // under that fade and leave the destination at a fraction of full ink.
    expect(zoomPanSource).toContain(
      "':scope > [data-phase-frame], :scope > [data-phase-title-badge], [data-focus-slide-id]'",
    )
  })
})

/*
 * The blocks tier — the overview's table-of-contents reading, below the zoom
 * where text is smudge.
 */
describe('the blocks tier draws the board as a density map', () => {
  it('turns each drawn cell into a block, not each cell container', () => {
    // A touchpoint row is one `data-blueprint-cell` container holding a cell
    // per touchpoint. Keyed on the container, the whole row became one slab;
    // keyed on the anchor every drawn cell carries, each touchpoint stays a
    // block of its own.
    expect(blueprintCss).toContain(
      "[data-semantic-tier='blocks'] [data-blueprint-cell-anchor]:not(",
    )
    expect(blueprintCss).not.toContain(
      "[data-semantic-tier='blocks'] [data-blueprint-cell]:not(",
    )
  })

  it('keeps the axis labels as skeleton bars instead of words', () => {
    expect(blueprintCss).toContain(
      "[data-semantic-tier='blocks'] [data-blueprint-column-header]:not(",
    )
    expect(blueprintCss).toContain(
      "[data-semantic-tier='blocks'] [data-blueprint-row-header]:not(",
    )
    expect(blueprintCss).toMatch(/\[data-blueprint-row-header\]:not\([^{]*\)::after/)
  })
})
