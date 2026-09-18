---
'agentic-service-blueprinting': patch
---

Accepting a suggestion mid-sentence keeps your place, instead of throwing the
caret to the end of the draft.

A reader who writes `check /audit then /map this` and takes the offer on
`/audit` gets `/sb:audit` written where the word stood — and now the caret
sits immediately after it, with the rest of the sentence still ahead of them.
It used to land after `this`: the token was rewritten in place, and the reader
was moved to the end of a sentence they were half-way through. Every keystroke
after that went to the wrong end of the message.

**Why it survived this long.** Nothing wrote a caret at all. Assigning a
textarea's `value` puts the caret at the end of the new text by itself, and
every other completion in the composer is tail-anchored — the slash menu's
lookup only matches a token that runs to the end of the draft — so "the end"
happened to be the right answer, for the wrong reason. The near-miss rewrite
is the one completion with prose behind it, and it inherited a behaviour that
was never a decision.

`completeSkillToken` now returns the caret along with the text, rather than
leaving the offset for a caller to re-derive from the gap rule it just
applied, and the composer's field takes that offset as a one-shot request it
carries out after the text is on screen — which is the only moment it can,
since the write that puts the text there is also what moves the caret. Focus
comes back to the field with it: both of these gestures are a press on a
button or a menu row, so the field has just lost focus, and a caret nobody is
typing at is not a caret.

**The mid-sentence case is pinned, and was watched failing first** — 30 where
15 was wanted, which is exactly the length of the draft against the end of the
completed name. The tail-anchored case is pinned beside it and its worth is
stated where it sits rather than implied: its offset cannot tell a deliberate
caret from the value setter's, because for a tail-anchored completion the two
are the same number for every input there is, but it does catch a deliberate
caret written to the wrong offset, and its focus assertion is red unless the
completion path hands the field back.
