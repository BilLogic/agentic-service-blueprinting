---
'agentic-service-blueprinting': patch
---

A provider call that dies at the network layer is retried before the reader
hears about it, and the status that does surface says whether the connection
dropped or the provider refused, and on which round.

A fetch that never completed — WebKit words it `Load failed`, which reached
the transcript as `Provider error: Load failed` — ended the whole turn and
took every tool result the round had already gathered with it. On a phone
that is routine rather than exotic: one radio blip mid-request and an audit
that had read four scenarios is gone with nothing to resume from.

The retry sits in `src/lib/agent/loop.ts`, at the one seam every provider
call goes through, so `src/lib/agent/providers/anthropic.ts`,
`google.ts` and `openai.ts` all get it without any of them knowing about it,
and a retried round re-sends the transcript as it stands — the earlier
rounds' tool results included. Two extra tries, a short backoff, and the
backoff is cut short by Stop so pressing it never looks ignored.

Only the failure a retry can fix is retried: a bare `TypeError` out of
`fetch`. A provider's own verdict still fails on the first attempt with its
status and detail intact, a body that will not parse fails under its own
name rather than as a network story, and an abort keeps the stopped status
it always had.

The request shape is unchanged — this is still a non-streaming loop.
