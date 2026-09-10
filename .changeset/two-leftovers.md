---
'agentic-service-blueprinting': patch
---

The storyboard walkthrough says what it is, and one error stops being unwrapped by hand

Two small things a deployment had already fixed and this repository had not.

The walkthrough dialog announced itself as "Presentation" — to a screen
reader, the only name it had. It is the storyboard walkthrough, and the app
calls it that everywhere a reader can see. The accessible name now agrees with
the visible vocabulary.

`StructureRowMenu` unwrapped a duplicate failure with an inline
`instanceof Error ? … : String(…)`. `errorMessage` in `lib/utils` is that
expression, the same file already imports it, and the rename path two hundred
lines down already used it. One spelling for one job.
