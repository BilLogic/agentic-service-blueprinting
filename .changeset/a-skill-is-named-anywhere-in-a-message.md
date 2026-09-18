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

**Accepting a match completes the token where it sits, and colours it.** A
word-start token that names a skill is drawn in role ink exactly where the
reader typed it, and `/sb:aud` becomes `/sb:audit ` in place, the way a shell
completion behaves — the prose either side is not read, moved or trimmed. The
token is the invocation: the draft carries no skill field any more, and the
skills a message runs are parsed out of its text at send, in the order the
tokens appear. A coloured token will run; an uncoloured one is a word with a
slash on it.

This replaces the badge the first version shipped. Accepting used to lift the
token out of the prose and stand the skill in a row above the field, which
moved the reader's word to the front of their own message: `asdasd /sb:audit`
became `[/sb:audit] asdasd`, and the position they had typed it in was gone.
The badge row is deleted. The field stays a real `<textarea>` — selection,
IME, the mobile keyboard and native undo all come from the browser — so the
colour is drawn by a layer behind it that renders the same string with the
token in a span, sharing one class string with the field so the two cannot
wrap differently and one box sized by the field, so that an add-on placed in
the group later narrows both copies or neither. While an IME is composing, the field draws its own text.

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
