---
'agentic-service-blueprinting': patch
---

A label asks for its style by name.

There are two label styles, not one. A section heading inside a dialog or
popover is `PANEL_TEXT.sectionHeading`; a field label beside a control is
`PANEL_TEXT.sectionLabel`. Twenty call sites that had pasted the heading
classes now reach for the name. Optional subtitles that had mixed heading
size with muted ink sit on `sectionLabel`. The settings rows that had dropped
`font-medium` from the field label are that token with the class restored,
not a third style.

`Field` stays stacked-only: the beside rows need a settings-column width
(`w-14`) that is not a Field concern.
