---
'uno-blueprint': minor
---

Small primary-coloured text reads role ink, not the fill

Six pieces of small text used the primary fill as their colour: the link
button, the session "Changes" chip and its agent badge, "Create" in the owner
tag picker, "Make slice", and the slide composer's "Drop here". A fill is tuned
to carry ink, not to be it. Unbranded, the fill is the foreground and the
text reads fine, but a deployment that sets a deep brand fill (lightness 0.52,
chroma 0.095, say) saw that text fall to about 3.1–3.5:1 in dark, short of the
4.5:1 small text needs. They now read the role ink, `--text-primary`, which is
derived from the surface ladder and so holds AA whatever the fill. The tinted
ground and border behind "Make slice" and the "Changes" chip are unchanged.

The pressed label in a segmented control now reads the foreground rather than
the fill, so the pressed state is emphasis rather than hue.

Two icons are unchanged on purpose: the check beside the selected owner tag
keeps the fill, and the path selector's selected-row mark keeps the brand
identity colour (the fill, while a deployment leaves the brand dials unset).
An icon's contrast bar is 3:1 rather than 4.5:1, and a deep brand fill still
clears it on a dark popover. A guard now fails the suite if `text-primary`
lands anywhere else in `src`.

Role ink in dark mode now always sits a step brighter than muted text. It was
drawn 76% of the way from the canvas to the foreground in both themes, but
dark mode draws muted text at 80%, so in dark an active label read fainter
than the resting label beside it — invisible behind a brand hue, and plain
grey on grey in a template with no brand. `--role-ink-mix` now follows muted
text up (muted plus 0.08, never below 0.76, never past the foreground), and
the on-tint ink stays 0.06 above it. Light mode resolves to exactly what it
did. In dark, every `--text-{role}` moves from about L 0.77 to 0.86 and every
`--text-on-surface-{role}` from about 0.81 to 0.90: warning, destructive, info
and success text reads a little brighter and softer there, and contrast only
rises. This is why the release is a minor: dark mode looks different.
