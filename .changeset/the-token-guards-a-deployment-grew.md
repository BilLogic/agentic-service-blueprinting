---
'agentic-service-blueprinting': patch
---

The token-discipline guard now reads the two routes to a primitive colour that it used to miss. Absolute `white` and `black` utilities, including their alpha forms such as `bg-white/10` and `ring-black/[0.04]`, count as ramp steps. A `var(--color-{ramp}-{step})` reach is also caught, both in TypeScript and in every stylesheet outside the layers that declare or register the ramps. Categorical colour, such as lane identity fills, path inks, annotation swatches and modal scrims, is exempted file by file with a reason. Each exemption list is checked so that an entry falls away once its file no longer needs it.

The annotation style bars no longer spell absolute white. They use the mode-invariant ink ladder that `semantic.css` already declared for that chrome (`--foreground-annotation-chrome` and its rungs). Every rung is the same white at the alpha the call site already used, so nothing changes on screen. The stroke-weight swatch lost the `dark` prop it branched on, because its only caller always passed it.
