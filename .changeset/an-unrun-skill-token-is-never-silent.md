---
'agentic-service-blueprinting': patch
---

A token that nearly names a skill asks the reader once — run the skill it
came close to, or send the sentence — and a sentence sent as prose tells the
agent that nothing ran.

`/audit` is not a skill name here; `/sb:audit` is. A draft carrying the near
miss sent as plain text: no skill loaded, and nothing on screen or in the
transcript said so. The agent then improvised. One session spent four rounds
re-reading the same scenario before the turn died, and the reader had no way
to know the flow they asked for was never loaded. The token was never the
defect; the silence was.

On send, a draft carrying a word-start slash token that matches a skill's
bare alias and no skill's official name now offers two choices and takes
neither by default. Accepting rewrites the token where it sits — "then /audit
the intake" becomes "then /sb:audit the intake", the same in-place completion
the menu performs, so the reader can see in their own sentence what they
agreed to — and the skill runs. Sending as text passes the sentence through
untouched and adds a paragraph to the system prompt: the token names no skill
here, the closest one is `/sb:audit`, nothing ran, and the model must not
describe it as having run or summarise what it would have produced. Editing
the draft withdraws the question.

**A token that resolves is never asked about.** It is coloured where it was
typed, and a coloured token runs — the colour is the whole of the promise, and
a prompt asking a reader to confirm what they can already see asks them to
read it twice. The confirm-once step for a resolved token is deleted.

**A spent round budget no longer loses the paragraphs.** The closing call the
loop makes after exhausting its rounds was built from the context alone, so
everything true of that send — the session tier, the no-database trial, the
mobile shell, and now this notice — was dropped at exactly the moment the
model is asked to answer from what it has. It is the same path the session
that motivated the notice took. All four paragraphs are threaded into the
closing call, and a spent budget is pinned in the loop's tests.
