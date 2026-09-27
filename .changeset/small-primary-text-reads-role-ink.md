---
'uno-blueprint': patch
---

Small primary-coloured text reads role ink, not the fill

Six pieces of small text used the primary fill as their colour: the link
button, the session "Changes" chip and its agent badge, "Create" in the owner
tag picker, "Make slice", and the slide composer's "Drop here". A fill is tuned
to carry ink, not to be it, so a deployment that set a deep primary saw that
text fall to about 3.1:1 on a dark popover, and the template's own mint default
put it near 1.6:1 in light. They now read the role ink, `--text-primary`,
which is derived from the surface ladder: at that same deep setting it
measures about 8:1 on a dark popover and 12:1 in light. The tinted ground and
border behind "Make slice" and the "Changes" chip are unchanged.

The pressed label in a segmented control now reads the foreground rather than
the fill, so the pressed state is emphasis rather than hue.

Two icons keep the fill on purpose: the check beside the selected owner tag
and the path selector's selected-row mark. An icon's bar is 3:1, which a deep
fill still clears, and a selected mark is where the brand's colour belongs.
A guard now fails the suite if `text-primary` lands anywhere else in `src`.
