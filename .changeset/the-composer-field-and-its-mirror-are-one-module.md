---
'agentic-service-blueprinting': patch
---

The composer's field and the coloured mirror behind it are one module, so the
five facts the colour depends on are owned in one place instead of agreed
across two.

A textarea cannot colour a word inside itself, so a recognised skill token is
drawn by a mirrored copy of the draft sitting behind a field whose own text
has gone transparent. That picture holds only while the two copies agree on
the metrics that decide a line break, the trailing newline a block would
otherwise collapse, the single positioned box they both size against, the
scroll offset, and standing down while an IME composes. One of those lived
with the mirror; the other four were spelled in the chat panel's render body,
next to everything else a conversation surface does, and held together by a
comment asking the next reader not to break them.

`ComposerInkedField` now renders the field, the mirror and the input group
around them, resolves both class lists from one call, and reads the skill
tokens out of the draft itself. Callers hand it the draft, the write-back and
whatever a textarea takes; they cannot reach the box the two copies measure,
they cannot hand in token offsets read off some other string, and they cannot
put an add-on into the group, because the group is inside the module and takes
no children from outside. That last one was the live hazard: an add-on in the
group narrows the FIELD through the group's own `has-[>[data-align=...]]`
rules and leaves the mirror full width, so every line from the first wrap down
breaks somewhere else and the colour drifts off the caret — a failure no
shared metrics string can see or undo. It was prevented by a comment and is
now unexpressible from outside.

Nothing about the record changed: the field is still a real `<textarea>`, the
draft's text is still the only thing that says which skills a message runs,
and a coloured token still runs. Nothing visible moved either, and that was
measured rather than assumed — all four class lists the two copies wear are
byte-identical to before, and the composer's growth was measured in a browser
on both sides of the change: 38px empty, 98px over four wrapped lines, capped
at 122px, the mirror's rect within half a pixel of the field's at every step.
