---
'agentic-service-blueprinting': minor
---

The slide sheet's header says "Slides", and the overview gives every target room of its own.

**The slide sheet.** Its collapsible header said "Storyboard", which is the name of a lane. What the sheet holds is slides, and its own buttons already said so ("Add slide", "Remove slide 2", "Keep slide"). The header now says "Slides" too. The Storyboard lane keeps its name.

**Room on the overview.** Scenario panels in a phase row sit 360px apart, up from 192px. The phase frame pads its row by 120px at the sides, up from 24px, and by 48px at the bottom, up from 24px. The top inset stays at 28px. Zoomed out, neighbouring scenarios and the phase band around them no longer blur into one target. The phase badge now sits on the frame's own left edge instead of a band's width in from it.

**Focus dims the parts, not the phase.** When a phase or scenario has focus, the phases around it used to dim as one translucent layer, with a desaturating filter and cells made pass-through. Nothing inside that layer could become clearer than it, and it stacked under the fade the camera plays during a flight. Now each dimmed phase dims its frame, its badge and each scenario separately, with opacity only. A dimmed phase stays clickable. Hovering its band lifts the whole phase part-way, and hovering one of its scenarios brings that scenario up to full ink without lifting its siblings.

**The blocks tier.** Zoomed out past the text threshold, each drawn cell becomes its own block. A row of touchpoints is no longer one slab, and a cell without an id is no longer left as text. The row and column labels become neutral skeleton bars in the same boxes, and in forced-colors mode those bars take the system ink.

**Touch.** A scroll region inside the board that carries `.blueprint-scroll` now takes `touch-action: pan-x pan-y`, so one finger can scroll it while pinch-zoom stays with the canvas.
