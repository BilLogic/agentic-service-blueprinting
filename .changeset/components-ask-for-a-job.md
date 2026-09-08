---
'agentic-service-blueprinting': patch
---

The components that composed role colour by hand now ask for a job. Five files
stop reaching past the semantic tier into a ramp step, which leaves the stepped
role ramps with no consumer in the tree at all.

**`alert.tsx` is the case the vocabulary was minted for.** It drew one job with
two mechanisms, because two of its four status roles had a numeric ramp and two
did not: destructive and warning took a 400 edge on a 200 surface, while info
and success drew the same idea as the fill at fifteen percent alpha. Both are
`--surface-{role}` and `--border-{role}` now, the filled icon square is the
role's own fill with its own on-colour, and the four variants read as four
values of one recipe rather than as two recipes that happen to agree.

**The swap is invisible where it was engineered to be.** The role edge was
retargeted to sit one step off its own tint precisely so this change would not
turn a hairline into a rule around the box. Measured per site, in both themes,
the alert border moves from 1.29, 1.21, 1.34 and 1.30 to one against its tint —
destructive and warning, light then dark — to 1.28, 1.27, 1.22 and 1.24. The
band the ramp steps drew, held by a derivation instead of by four literals.

**Two things move on purpose, and both are legibility.** The alpha tint could
not hold an edge at all: composited on itself in dark, the info and success
borders measured 1.01:1 and 1.03:1 — a border that was not there. On the opaque
tint they measure 1.23:1 and 1.27:1, inside the band with the other two. And
the icon square used to write the role's TINT as the glyph colour on the role's
own step-600 fill, one colour on another: 2.96:1 for warning, 5.18 for
destructive in light. The fill's on-colour is what that job is for, and it
reads 6.89 and 5.74, with all four status roles clearing 4.4:1 in both
themes.

**The tinted warning badge changes visibly, and it is the one place to look.**
Its ink was a ramp step chosen for being the least illegible option available —
2.8:1 in light, 5.2:1 in dark, and the comment beside it said so. There is no
job name for a middle of a scale, because a middle of a scale is what this
vocabulary exists to stop naming. The ink is now the ink for a colour sitting
on its own tint, at 13.1:1 and 9.2:1, and the ground under it is the opaque
tint rather than a ten-percent wash — which is what gives any of those numbers
a ground to be measured against. Amber body copy becomes a dark amber word on a
pale amber tint. Every badge with `variant="warning"` moves with it.

`StatusBadge` was one of the call sites re-deriving that shape out of a tint and
an edge; it asks for the variant now. Its word goes from `--foreground` on the
tint, at 20:1, to the role's own ink at 13:1 — ordinary copy on a coloured
badge becoming a word that carries the status itself.

**A measurement the vocabulary should answer for.** `--surface-{role}` is
derived from the page, so on a card it is nearly invisible in dark: 1.02:1
against `--card` for all seven roles, where the card itself sits 1.09:1 off the
page. Every tinted surface in this change inherits it, and the role's edge is
what carries the shape there. It is a property of the derivation rather than of
these call sites, and it is the same in light only because card and page nearly
coincide there.

No token is deleted and no Tailwind registration is removed. The stepped ramps have no call site
now, which is the precondition the deletion pass was waiting on.
