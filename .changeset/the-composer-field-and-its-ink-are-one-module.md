---
'agentic-service-blueprinting': patch
---

The composer's field and the coloured ink behind it are one module, so the
five facts the colour depends on are owned in one place instead of agreed
across two.

A textarea cannot colour a word inside itself, so a recognised skill token is
drawn by a mirrored copy of the draft sitting behind a field whose own text
has gone transparent. That picture holds only while the two copies agree on
the metrics that decide a line break, the trailing newline a block would
otherwise collapse, the single positioned box they both size against, the
scroll offset, and standing down while an IME composes. One of those lived
with the ink; the other four were spelled in the chat panel's render body,
next to everything else a conversation surface does, and held together by a
comment asking the next reader not to break them.

`ComposerInkedField` now renders the field, the ink and the input group
around them, and reads both class lists from one call. Callers hand it the
draft, the tokens read out of that draft and the keys; they cannot reach the
box the two copies measure, and they cannot put an add-on into the group,
because the group is inside the module and takes no children from outside.
That was the live hazard: an add-on in the group narrows the FIELD through the
group's own `has-[>[data-align=...]]` rules and leaves the mirrored copy full
width, so every line from the first wrap down breaks somewhere else and the
colour drifts off the caret — a failure no shared metrics string can see or
undo. It was prevented by a comment and is now unexpressible from outside.

Nothing about the record changed: the field is still a real `<textarea>`, the
draft's text is still the only thing that says which skills a message runs,
and a coloured token still runs. What moved is the seam — and with it, what a
test can ask. The agreement is asserted by asking one function for both class
lists rather than by finding two nodes in a rendered tree and splitting their
class attributes, and the caret left behind by an in-place completion is
pinned through the module's own interface.
