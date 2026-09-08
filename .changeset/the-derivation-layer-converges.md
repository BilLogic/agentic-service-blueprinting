---
'agentic-service-blueprinting': patch
---

The derivation layer converges on the copy the deployment runs, and the surface
hue is a dial rather than a leak.

`styles/semantic.css` exists twice — once here and once in the deployment
imported from this package — and the two copies had drifted 161 lines apart
after the four authored knobs moved into the theme files. Most of that was
prose, and prose is a real difference to a byte-for-byte drift gate. Two of the
differences were not prose, and both are settled here.

**The ink on the filled control flips on the fill's own lightness.** The
deployment derived `--primary-foreground` from a per-theme constant, which
produces near-black ink in both modes and is correct only for an accent that
happens to be light in both. Measured across the accent range at that
deployment's hue and chroma, the fixed ink falls to 3.19:1 at L 0.45 and 1.11:1
at L 0.15 — black text on a black button, failing silently, the same shape as
the warm-grey surface defect. The flip this file already used holds above
3.43:1 everywhere and is now the mechanism on both sides. Its own weak point,
accepted rather than hidden, is that 3.43:1 at L 0.60, just under the
threshold: clear of the 3:1 floor for UI and large text, short of 4.5:1 for
body. The comment beside the derivation says so.

**`--surface-hue` is declared in `styles/themes/dark.css`, and the default in
`styles/semantic.css` is gone.** The dark theme did not restate the dial, and
what that MEANT was already the warm `34` from the light file — its selector
list opens on a bare `:root`, so with nothing later to take it back the dark
surfaces ran on light's hue, and semantic.css's `var(--hue)` default could
never win under either theme. Writing `34` down in the dark file changes
nothing about what renders and turns that leak into a decision; the unreachable
default then has nothing to defend and goes. Every custom property declared
under `styles/` was resolved in both themes before and after through
`tokenModel.resolveValue`: 628 names, zero moved.

The file also gains the annotation chrome's ink ladder — ten rungs of the same
absolute white the canvas annotation layer already spells at nine alphas, plus
the plate's own backing — so that a strength on that bar has a name to be
reached by. Nothing consumes them here yet; moving the call sites onto them is
its own change.

`styles/tokens.test.ts` counts `--surface-hue` among the dials that must be
declared in both theme files and resolve to a number in each. It is not among
the mode-invariant ones: a theme picks the neutral ramp's hue, and two themes
may pick differently.

`lib/tokenModel.test.ts` restates its liveness example as a property.
`--colors-white` was the whole example of a name a stylesheet-only scan would
call dead, and the ink ladder now reads it from a stylesheet; the rule now
asserts that some declared name is read from source and from no stylesheet,
which is the fact that was ever load-bearing and survives the next ladder.
