---
'agentic-service-blueprinting': patch
---

Colour-job review fixes: a chosen row, a locked textarea, and two tooltips that had gone blank.

De-inverting the tooltip left two call sites writing `text-contrast/70` inside one — the page colour on the page, so the annotation-mode hint and a compare cell's "Used in" label rendered blank. A select's chosen row was caption grey like every other row, with only the check glyph marking it; it now restores full ink on `data-selected`, and a pressed toggle does the same, so hovering an unpressed neighbour can no longer outrank it. A read-only Textarea was byte-identical to an editable one and now locks like Input — with both gated on `enabled:`, because CSS `:read-only` also matches a disabled field and was putting the locked look on top of the fade. The sheet panel's hairline is named rather than defaulted, since its scrim is now the page colour and the two are within ~0.005 lightness in the light theme. Eleven vendored files gained the ADR-0014 header their divergence requires, and a dead `group-focus` variant came off a submenu chevron.
