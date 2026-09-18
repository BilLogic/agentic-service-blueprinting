---
'agentic-service-blueprinting': patch
---

A camera move toward a named target is awaited through one module, and answers
in one verdict.

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
round fails to compile, because the function it would need does not exist.

**One deadline of 2000 ms, with a measurement as its justification.** It
replaces 1800 ms for the navigation tools, 1500 ms for cell focus and 2000 ms
for the caret hand-back. Driven through a real scenario open on a phone
viewport and read from the publisher itself, the answer arrives at a median of
366 ms and a maximum of 422 ms — the fade, plus the canvas remount, plus the
fit — and at a maximum of 1332 ms under a 4× CPU throttle. Nothing varied
across the three sites, so there is no override to pass; the next caller that
genuinely differs can introduce one with its own numbers.

**Four verdict words — landed, cancelled, superseded, unanswered.** The canvas
may claim the first three; `unanswered` belongs to the deadline alone, and the
type refuses it to the publisher. It is what silence is called: a viewport that
lets a flight go publishes nothing so the mount that takes the camera over can
answer, and a viewport that is gone for good publishes nothing at all. That
hand-off was provable only through a React harness and is now a plain assertion
over the module's own interface, with the harness test kept for the real
unmount it covers.

The phone's watcher keeps its generation guard, because which jump owns the
caret is the shell's decision, and now receives the verdict it used to discard.
