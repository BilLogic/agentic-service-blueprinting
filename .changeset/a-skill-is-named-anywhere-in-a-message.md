---
'agentic-service-blueprinting': patch
---

A slash starts a skill lookup wherever it opens a word, so a skill can be
named inside a sentence rather than only at the head of one — and picking from
the menu keeps the sentence it was named in.

The composer opened its menu only when a slash was the draft's first
character, so "Hey can u /sb:aud" was dead text: no menu, no skill, and a
message that reads like an invocation sent as prose. A slash now opens a
lookup at the head of the draft or directly after whitespace — the CJK
sentence marks included, since a reader typing Japanese gets no space before
it — and the token runs to the end of the draft, so a space closes the menu
again. A slash that opens no word never opens it: a reference path, a URL,
`and/or`, a date, and a token with a path segment behind it are each pinned as
text. The lookup is deliberately tail-of-draft rather than caret-aware, which
keeps it derived from the text alone; the cost is that editing back into an
earlier token does not reopen the menu.

Picking replaces the token and nothing else. The badge takes the `/token`
span's place, the words either side stay where they were, and one of the two
spaces that surrounded a mid-sentence token goes with it so the message has no
hole in it. It used to clear the whole field, which was invisible while a
draft could only ever be "/aud" and eats a sentence the moment it can be more.
Escape closes the menu and leaves every character typed.

**One canonical spelling invokes.** A bare alias — `/audit` for `/sb:audit` —
no longer resolves anything, in the composer or in a typed-through draft. It
stays as a search term, so a reader still types `aud` and finds `/sb:audit`
without the namespace, and as the source of the closest-match suggestion. A
reader who typed `/audit` to run the audit is offered it instead of running
it, which is the reversal, and it is what makes a lookup that fires
mid-sentence safe to have at all: every token that resolves is a message the
composer could silently turn into a skill run, and a sentence mentioning
`/audit` is far more often a sentence.
