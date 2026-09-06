import { createContext, useContext } from 'react'

/**
 * Whether the scenario board around this subtree is THE board the detail view
 * is scoped to — the focused scenario, or the one a slice tab / phone shell
 * renders solo.
 *
 * `BlueprintCellDetailProvider`'s `enabled` cannot answer this. It is a single
 * provider-wide boolean mounted once above the whole canvas, so focusing one
 * scenario turned the axis headers live on every board still mounted: with
 * one scenario focused, 176 lane headers and 125 step headers across 23 other
 * boards wore hover, a focus ring and a pointer. Clicking one on a band the
 * reader had never chosen opened a panel reading "Nothing recorded for this
 * lane yet." — an affordance offering emptiness on somebody else's board.
 *
 * So the gate is two facts, not one: the feature is on and we are in the detail
 * view (`detail.enabled`), AND this board is the one in scope (this context).
 * `ScenarioBlueprintPanel` — the component that owns exactly one scenario —
 * is the only producer; the two axis-header affordances are the consumers.
 *
 * Not `focusActive`, which is the camera's notion of focus and is false on the
 * ONE board a slice tab or the phone shell renders solo (there the scope comes
 * from `soloScenarioId`, and the reader has picked that board by opening it).
 * Gating on the camera would have left those boards' headers inert while their
 * cells stayed live.
 *
 * Default `false`: a header rendered outside any scenario board has no board to
 * be the scope of, and inert prose is the honest fallback.
 */
export const ScenarioBoardScopeContext = createContext(false)

/** `true` only inside the scenario board the detail view is scoped to. */
export function useScenarioBoardInScope(): boolean {
  return useContext(ScenarioBoardScopeContext)
}
