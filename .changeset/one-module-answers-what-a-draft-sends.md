---
'agentic-service-blueprinting': patch
---

One module answers what a draft sends, so the near-miss re-check cannot be
skipped.

`sendPlan.ts` takes the composer's draft and the near misses the reader has
already answered, and returns one of two things: the question still to ask, or
the message to commit — this text, these skills, these declared misses. It
replaces three closures in the chat panel and an ordering contract that was
written nowhere: ask about the first near miss, rewrite the draft on accept,
re-check the rewritten draft, dispatch with the misses that remain, clear the
misses on an edit and on a pick, and pass the draft text as an argument rather
than reading it back from a state setter that has not committed yet. Seven
exports of the skills grammar had to be assembled in the right order to commit
one Send correctly, and the step a caller could drop was the re-check.

**It was dropped, and that was the batch's one real defect.** Accepting a near
miss rewrote the token and went straight to the send, so a second near miss in
the same message rode along in silence — the exact silence the offer exists to
close, one token to the right. Accepting is now an answer handed to the module,
and the module asks again when the rewrite leaves a miss standing. There is no
re-check step to forget, because the answer either comes back as the next
question or as the Send.

**The accept-then-second-miss sequence is a pure assertion.** It used to be
reachable only by clicking through the panel, which is why nothing caught it:
the logic lived in a closure no test could call. The sequence is now read off
returned values — ask, answer, ask again, answer, send — beside pins for a
draft naming four skills sending four in token order, for a send-as-text that
declares every miss rather than the first, and for a completion that leaves the
sentence around the token alone. The panel keeps two cases of its own, each
about state the module does not hold: an edit drops the question, and so does a
pick from the slash menu, because both move the text the question's spans were
measured against.

**What is left in the panel is what the module has no business knowing** — an
attachment on the shelf, a run already in flight, and a trial with no client.
The ordering rule for a draft that is nothing but tokens moved out with the
rest.

The skills grammar itself is unchanged. Its regexes, span arithmetic and the
lookahead that stops a path segment resolving as a skill are already one
module, and deleting it would put all three back into its callers. The
composer's decision record stands as written: the text remains the only record
of which skills a message runs, no durable pick sits beside the draft, and the
field stays a real textarea.

Every pin added here was watched fail against a deliberate break — the
re-check removed, the ask and the declaration cut to the first miss, the skill
order reversed, the token-only instruction suppressed, the tokens stripped out
of what sends, the accepted rewrite skipped, and each of the panel's two
clears deleted.
