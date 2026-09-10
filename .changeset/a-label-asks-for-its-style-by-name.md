---
'agentic-service-blueprinting': patch
---

A label asks for its style by name.

There are two label styles, not one. A section heading inside a dialog or
popover is `PANEL_TEXT.sectionHeading`; a field label beside a control is
`PANEL_TEXT.sectionLabel`. Twenty-four call sites that had pasted a label's
classes now reach for the name. A dialog's optional Subtitle is a sibling of
its Title and reads at the same size — the `· optional` suffix is what says it
is optional, not a smaller label. The settings rows that had dropped
`font-medium` from the field label are that token with the class restored,
not a third style.

The guard behind this reads a class LIST, not a class name: a token spelled
with a margin in front of it (`"mt-2 text-xs font-medium text-foreground"`) is
the drift the rule exists to stop, and matching a complete quoted literal
never saw it. Three shaped controls that agree with a label on three utilities
are named exemptions carrying their reason, not a narrower pattern.

`Field` stays stacked-only: the beside rows need a settings-column width
(`w-14`) that is not a Field concern.
