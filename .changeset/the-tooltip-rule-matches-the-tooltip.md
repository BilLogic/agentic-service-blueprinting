---
'agentic-service-blueprinting': patch
---

The tooltip wrapper's rules say what the tooltip does

`IconTooltip`'s doc comment stated as non-optional that a tooltip "never
appears for a keyboard user who has not hovered". That is false for the Base UI
version this ships, and a passing test in the dependency why-line's suite —
"opens on keyboard focus, not on hover alone" — already disproved it. Two green
files documented opposite rules, and the false one was being quoted as the
reason a tooltip needs a visually hidden companion in the DOM: a right practice
resting on a wrong reason, which the next reader can be talked out of by
disproving the reason.

The real reason is stronger. Read from the installed `@base-ui/react` 1.7.0
rather than assumed: no part of the tooltip sets `role="tooltip"`, no part
wires an `aria-describedby` from the trigger back to the popup, and the only
props the popup contributes of its own are `tabIndex={-1}` and a data
attribute. The popup therefore contributes nothing at all to the accessibility
tree, and whatever is in the DOM is the whole of what a screen reader is
handed. The rule now says that, version-qualified, because it is a fact about a
dependency rather than about this code.

It also records what is true about the keyboard — `TooltipTrigger` wires
`useFocus` gated on `:focus-visible`, so tabbing to the trigger opens the popup
and nothing has to be built for it; what has to be checked is that the trigger
is the focusable element — and about touch, where the hover interaction is
`mouseOnly` and opens nothing.

Doc comment only. No behaviour changes and no API changes.
