---
'agentic-service-blueprinting': patch
---

`readWriteOutcome` translates the error it is handed, rather than leaving it to
the caller.

The previous comment argued the other way: the PostgREST error was left to the
caller, "which knows whether it wants `toAuthoringError`". In practice a caller
that knows is a caller that remembers, and the guarantee a reader wants is the
simpler one — a refused write is phrased for a person no matter which module
raised it. The function already sits on the write path of every module that
checks a row count, so translating here is what makes the rule hold without
each caller re-deciding it.

The parameter widens from `{ message: string }` to `PostgrestError | Error`,
which is what `toAuthoringError` takes and what callers were already passing.

The sentence beneath now says what became true rather than what is left over: a
PostgREST error never reaches the row-count check, because this function has
already translated it.

The deployment had reached this position first, so the file is byte-identical
to its copy and can be held to it. The divergence was a difference of position
rather than drift, and it was settled by its owner rather than by whichever
side was edited last.
