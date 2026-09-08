---
'agentic-service-blueprinting': patch
---

`inline` decides what a utility compiles to; the content scan decides what the
artifact carries.

Four comments across `theme.css`, `colors.css` and `theme.shape.test.ts` said
an `@theme inline` block emits no custom properties. A fifth, further down
`theme.css`, said it does, and the built CSS agreed with the fifth. Neither
claim was the mechanism. `inline` decides what a UTILITY compiles to — the
value rather than the registered name, which is why a colour utility resolves
straight to its semantic token — and emission is settled afterwards by
Tailwind's content scan: a `@theme` key whose name the scan finds is emitted
at `:root, :host` under `@layer theme`, and a key it never finds is dropped.
Two hundred and twelve of this file's three hundred and twenty keys are in the
artifact, and no two families are there for the same reason.

What counts as finding a name depends on the file. A stylesheet offers a name
only inside a `var()`; a `.tsx` or a `.md` offers it however it is written,
comments and prose included. So the hue registrations are always emitted —
their value spells their own name — while three others were in the artifact
for no reason but a sentence somewhere: the canvas registration because this
file's own warning against reading it spelled the read, the sans-font key
because the comment explaining why it must not self-reference spelled the
self-reference, and one retired alias because a CHANGELOG entry names it. The
first of those goes with the rewritten warning. It is the one declaration this
change removes from the compiled CSS, twenty-nine bytes, and nothing read it.

`declarerOf` still treats every `@theme` name as a declaration, and now says
why rather than leaving it as the thing nobody had checked. The dangling case
a stricter rule would have to catch — a stylesheet reading a registered but
unemitted name — cannot be constructed, because reading a name is one of the
things that emits it, and the files the token model samples are a subset of
the files Tailwind scans. Every read a rule can see is a read that emits what
it reads. That subset relation is now a test rather than a claim: it fails if
a fourth scan exclusion appears, and it fails if the sample widens to take in
the test files, which is the direction the model's own header calls safe.
