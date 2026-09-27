---
'uno-blueprint': patch
---

Small primary-coloured text reads role ink, not the fill

Six pieces of small text used the primary fill as their colour: the link
button, the session "Changes" chip and its agent badge, "Create" in the owner
tag picker, "Make slice", and the slide composer's "Drop here". A fill is tuned
to carry ink, not to be it. Unbranded, the fill is near-black and the text
reads fine, but a deployment that sets a deep brand fill (lightness 0.52,
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
