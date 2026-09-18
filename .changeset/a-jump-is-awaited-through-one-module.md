---
'agentic-service-blueprinting': patch
---

A camera move toward a named target is awaited through one module, and answers
in one jump verdict.

`canvasJump.ts` replaces the keyed waiter map three callers each re-derived a
protocol from — the agent's navigation tools, the agent's cell focus, and the
phone's sheet, which gives the caret up for a jump and takes it back when the
canvas settles. The old channel took a key and nothing else, so everything a
caller had to know to use it correctly lived outside it: that a waiter must be
attached before the selection commits, because the answer is published by the
fit that selection triggers; that the phone's deadline had to outlast the
tool's; and that a fourth outcome existed as silence, which each caller
re-learned as a timeout of its own. The ordering defect shipped twice.

**The module is handed the act that commits the selection.** It arms, commits,
races, detaches both losers and answers once, so arming after the selection
commits is unsayable rather than documented — a caller written the wrong way
round fails to compile, because the function it would need does not exist. Two
entry points, named for which half a reader is in: `awaitPublishedJump` for a
verdict the canvas publishes against a target, and `awaitSelfAnsweringJump`
for a commit that hands its own result straight back. Both take the commit, so
the ordering mistake is unsayable at either.

**One camera deadline of 2000 ms, with a measurement as its justification.** It
replaces 1800 ms for the navigation tools, 1500 ms for cell focus and 2000 ms
for the caret hand-back. Driven through a real scenario open on a phone
viewport and read from the publisher itself, the answer arrives at a median of
366 ms and a maximum of 422 ms — the fade, plus the canvas remount, plus the
fit — and at a maximum of 1332 ms under a 4× CPU throttle. Nothing varied
across the three camera sites, so there is no override to pass. The navigation
tool's other wait — its poll of the shell's reported selection — is a
different question on a different half and keeps its own named constant at
1800 ms, so the sentence a model reads when that expires arrives when it
always did.

**Four jump verdict words — landed, cancelled, superseded, unanswered.** The
canvas may claim the first three; `unanswered` belongs to the deadline alone,
and the type refuses it to the publisher. A verdict and the thing it is about
are now one shape, so the nonsense will not typecheck: a self-answering jump
either carries the commit's own result or is silence carrying nothing, and no
caller can test an answer for null and infer silence privately. A result that
never became a flight at all — a cell the board does not hold — gets no
verdict rather than borrowing `cancelled`.

**`unanswered` is what silence is called.** A viewport that lets a flight go
publishes nothing so the mount that takes the camera over can answer, and a
viewport gone for good publishes nothing at all. That hand-off is guarded by
the viewport's React harness case, which is the only test that owns a real
unmount and a real remount; the jump module's unit suite asserts the weaker
thing it can reach — a waiting jump stays attached through silence — under a
name that says only that, and both tests say which is which.

The phone's watcher keeps its generation guard, because which jump owns the
caret is the shell's decision. It takes no verdict parameter: the caret goes
back to the composer however the jump settled, and nothing read the word.

Verified in a browser against the branch rather than by inspection: 22 jumps
across desktop and phone, every one answered by the landed sentence, zero
console errors, a same-target re-jump (no board remount) answering in 68 ms,
a phone median of 369 ms against the 366 ms baseline, the sheet never
disappearing under a 20 ms poll, and the caret returning to the composer every
time from a blurred start.
