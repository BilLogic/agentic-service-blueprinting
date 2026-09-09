---
'agentic-service-blueprinting': minor
---

A source carries one note

The add-a-source form asked for five things and the saved row wore three type
treatments. `evidence` held `ref`, `excerpt` and `note` side by side — a
locator, a quotation, and an aside — and an author had to sort a sentence into
the right one before writing it. It becomes three fields in one group: Kind,
Title, Note.

The count is why. Measured on the deployment that runs this template, across 66
evidence rows: all 66 carry a title, two carry the quote field, and none carries
the reference field. The titles say where the references went instead —
"PR 1151", "Card 2266", "Metabase, 2026-08-08" — and one of the two quotes is a
note about a meeting, sitting in a field whose placeholder read "Their words,
not a summary of them". Zero rows means UNUSED, not unreachable: the agent's
`create_evidence` could write `ref` the whole time and never did, so the number
is a fact about the field rather than about the surface it was offered on.

`note` survives as the one general-purpose prose column, and a URL written
inside it renders as a link wherever a source is displayed. That is the whole
job the reference column was carrying, for the zero rows that used it.
`linkedTextSegments` is deliberately narrow about what counts: a scheme is
required, so `data-model.md` stays a filename and `PR 1151` stays a citation,
and `safeExternalHref` still has the last word on which schemes may become an
anchor. Trailing punctuation goes back to the sentence, except a closing
bracket the address itself opened.

`21000208000000` moves every excerpt into the note beside it and drops both
columns. It refuses rather than destroys, twice: a row carrying a reference
stops it, because a locator is not prose and the migration will not invent a
sentence around "PR 1151"; and a row carrying an excerpt beside a DIFFERENT
note stops it too, because it cannot choose between them and will not join two
sentences on their author's behalf. Both guards are invariants — "no excerpt is
destroyed", "no reference is destroyed" — true of every database the file will
ever meet, including an empty one. Neither counts rows, which is the only kind
of assertion that can replay. No grant moves: `evidence` is granted whole-table
and never column by column. `scripts/tests/evidence-note-migration.test.sh`
applies the file with `psql -1` against a populated replay, because a guard that
raises only means something when the fold rolls back with it.

The saved row wears one text treatment. The monospaced link, the italic passage
and the rule down its left edge all go — three ways of saying "this text is
different", stacked in a panel 264 pixels wide. The kind is a quiet suffix after
the title now, so the icon reinforces it rather than carrying it alone.

Every field keeps a label, through the panel's own `Field`, so no field's
purpose is carried by grey text that disappears the moment an author types. The
asterisk on Title is this panel's only signal that a field cannot be left empty,
and its absence on Note is what says Note is optional — a second signal for the
same thing is how a form starts arguing with itself.

The agent's evidence tools lose `ref` and carry one prose argument. Their
descriptions stop calling it a quoted passage: a model reads a description as
the field's definition, and "the quoted passage that carries the claim" is an
instruction not to write an observation there — which is exactly what the two
rows that used the field did anyway. `create_evidence` could never write `note`
at all before; it passed a hardcoded null.

`21000116000000` set one word per meaning and then deliberately spared
`evidence.note` on the argument that a source's note is an aside beside the
source. Three months of authoring says the aside was doing the work and the
field beside it was not, so the word stays rather than becoming `summary`: a
note about a source is still not the source. That is a fold rather than a
licence — `findings.summary` is still a summary, and the next column whose job
is a thing's own sentence still gets that word. The rename map records both
pairs with the reason each carries no `rename column` statement.

Evidence still does not link to resources, deliberately. A locator field was
available for 66 rows and filled zero times, and of the 47 cells carrying
evidence only 20 also carry resources, so a picker would be empty on the other
27. A join table can be added later without disturbing the note; the signal to
build it is notes filling up with resource names.
