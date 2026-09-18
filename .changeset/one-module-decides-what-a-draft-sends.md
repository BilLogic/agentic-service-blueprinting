---
'agentic-service-blueprinting': patch
---

One module decides what a draft sends, so the near-miss re-check cannot be
skipped and a stale answer cannot corrupt the draft.

`sendDecision.ts` takes the composer's draft and one word of consent from the
reader, and returns one of two things: the question still to ask, or the Send
to commit — this text and these skills, with the misses going as prose
declared alongside it. It replaces three closures in the chat panel and an
ordering contract that was written nowhere: ask about the first near miss,
rewrite the draft on accept, re-check the rewritten draft, dispatch with the
misses that remain, and pass the draft text as an argument rather than reading
it back from a state setter that has not committed yet. Seven exports of the
skills grammar had to be assembled in the right order to commit one Send
correctly, and the step a caller could drop was the re-check.

**It was dropped, and that was the batch's one real defect.** Accepting a near
miss rewrote the token and went straight to the send, so a second near miss in
the same message rode along in silence — the exact silence the offer exists to
close, one token to the right. Accepting is now an answer handed to the
module, and the module asks again when the rewrite leaves a miss standing.
There is no re-check step to forget, because the answer either comes back as
the next question or as the Send.

**The answer is consent, not data.** It used to carry the near misses the
reader had been shown, which handed the caller the one invariant the module
actually depends on — that those spans were measured against THIS draft — with
nothing to enforce it. Two things went wrong through that hole, and both are
now unreachable rather than merely discouraged. A second accept off one
question re-applied a span measured against `/audit` to the `/sb:audit ` that
had replaced it, and the offsets landed inside the word: the draft became
`/sb:audit dit `. And a declaration built from the older list told the model
both halves of a contradiction in one message — `/sb:audit` among the skills
that ran, `/audit` among the near misses that did not. Every arm now walks the
draft it is handed, including the declaration, which used to copy the caller's
list verbatim and skip the walk entirely.

**What the answer says is which of three things happened**: nothing has been
asked yet, the reader said send it as typed, or the reader took the offer on
the first miss. Three arms rather than an empty list, because "not asked" and
"asked, and nothing is pending" are different states that a list conflates —
and the emptiness used to decide the behaviour. The committing arm carries one
string, not two: a `draft` and a `text` that are equal for every ordinary
message and differ only for a token-only one is the perfect shape for a
wrong-string bug that passes every hand test, and the panel clears the field
rather than reading a draft back out of the decision. The draft stays on the
ASK arm, where it is load-bearing — the field must show the accepted rewrite
before the next question.

**A near miss cannot be accepted while a send cannot happen.** The panel's
gate on a run in flight sat after the rewrite, so accepting an offer mid-run
rewrote the field, dropped the send, and left the notice on screen still
holding the spans of the draft that had just moved — which is how a reader
reached `/sb:audit dit ` by clicking twice. The gate now comes first, so a
blocked send decides nothing and moves nothing, and both of the notice's
buttons are disabled while it holds.

**The accept-then-second-miss sequence is a pure assertion.** It used to be
reachable only by clicking through the panel, which is why nothing caught it:
the logic lived in a closure no test could call. The sequence is now read off
returned values — ask, answer, ask again, answer, send — beside pins for a
draft naming four skills sending four in token order, for a send-as-text that
declares every miss rather than the first, for a completion that leaves the
sentence around the token alone, for a declaration derived from the FINAL text
so a draft whose only token resolves declares nothing, and for two accepts
running that leave the draft intact. The panel keeps cases of its own, each
about state the module does not hold: an edit drops the question and so does a
pick from the slash menu, because both move the text the question's spans were
measured against, and Enter during a run asks nothing and moves nothing.

**What is left in the panel is what the module has no business knowing** — an
annotation on the shelf, a run already in flight, and a trial with no client.
The sentence an empty draft with an attachment sends is the panel's too, for
the same reason. The ordering rule for a draft that is nothing but tokens
moved out with the rest.

**One word per concept.** A span in a draft that nearly names a skill is a
near miss (`SkillNearMiss`, `findSkillNearMisses`); what the model is told
about one going as prose is a declared miss (`DeclaredMiss`,
`declaredMisses`), the name it now carries through the prompt builder too. And
what the module returns is a `SendDecision`, because a question is not a Send:
the Send is the glossary's two fields, its text and the skills it names,
nested inside the committing arm.

The skills grammar itself is unchanged. Its regexes, span arithmetic and the
lookahead that stops a path segment resolving as a skill are already one
module, and deleting it would put all three back into its callers. The
composer's decision record stands as written: the text remains the only record
of which skills a message runs, no durable pick sits beside the draft, and the
field stays a real textarea.

Every pin added here was watched fail against a deliberate break — the
re-check removed, the ask and the declaration cut to the first miss, the skill
order reversed, the token-only instruction suppressed, the tokens stripped out
of what sends, the accepted rewrite skipped, the accepted span re-applied to
the draft it produced, and the declaration built from the draft as it stood
before the rewrite.
