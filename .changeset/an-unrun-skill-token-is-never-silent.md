---
'agentic-service-blueprinting': patch
---

A message that names a skill and carries none asks the reader once — run it,
or send the sentence — and a sentence sent as prose tells the agent that the
skill it names did not run.

Typing a skill name inside a sentence sent it as plain text: no skill loaded,
and nothing on screen or in the transcript said so. The agent then improvised.
One session spent four rounds re-reading the same scenario before the turn
died, and the reader had no way to know that the flow they asked for was never
loaded. The token was never the defect; the silence was.

On send, a draft carrying a word-start slash token that names a skill — or
comes close by matching only its bare alias — with no skill attached now
offers two choices and takes neither by default. Running attaches the skill
and lifts the token out of the prose; sending as text passes the sentence
through untouched and adds a paragraph to the system prompt naming the skill,
stating that it did NOT run, that it must not be described as having run or
summarised, and that it may be offered. Editing the draft withdraws the
question. A draft that already carries a skill is unaffected, and a draft that
opens with a skill's official name still invokes it without being asked.

**A spent round budget no longer loses the paragraphs.** The closing call the
loop makes after exhausting its rounds was built from the context alone, so
everything true of that send — the session tier, the no-database trial, the
mobile shell, and now this notice — was dropped at exactly the moment the
model is asked to answer from what it has. It is the same path the session
that motivated the notice took. All four paragraphs are threaded into the
closing call, and a spent budget is pinned in the loop's tests.
