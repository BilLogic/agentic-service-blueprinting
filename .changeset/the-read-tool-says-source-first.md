---
'agentic-service-blueprinting': patch
---

**`list_cell_dependencies` no longer teaches the dependency direction
backwards.** Its description said `enables` "means the other must already be
true", which makes the target the precondition — `depends_on` semantics wearing
the word `enables` — and contradicted `create_cell_dependency` in the same
file, which says the precondition is the source. The read tool now says what
the write tool says: both kinds read source-first, and `enables` means the
source makes the target possible without causing it.

`both-kinds-read-source-first` missed it because its matcher spelled the
inversion as "the target must already be true" and this sentence said "the
other". The pattern now covers that spelling, and the test holds the sentence
that shipped as a case it goes red on. Found while enrolling a deployment in
v1.44.9 (#755).
