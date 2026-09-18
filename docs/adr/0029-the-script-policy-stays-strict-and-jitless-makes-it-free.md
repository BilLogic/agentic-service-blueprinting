---
summary: The deployed script policy stays `default-src 'self'` with no `'unsafe-eval'`, and zod is told `jitless: true` at the app root so it stops feature-detecting `new Function` — a probe whose answer this policy had already settled, whose refusal was reported on every load whether or not zod caught the throw, and whose removal changes no parser choice because the runtime parser was always the one that ran; the flag is set by a module-scope effect that is `App.tsx`'s FIRST import, because zod memoises the answer on the first object schema and every agent tool builds one while the import graph evaluates, and a clean console on load is now worth something — a CSP report means a new fact rather than the line that was always there.
---

# 29. The script policy stays strict, and `jitless` makes that free

**Status** Accepted — 2026-09-18. Closes the question
[#899](https://github.com/BilLogic/agentic-service-blueprinting/issues/899)
filed and left open, which concluded there was no acceptable fix.
**Context** `public/_headers`, `src/lib/validationJit.ts`, `src/App.tsx`,
`src/lib/agent/tools/definition.ts`. Beside
[14](0014-vendored-primitives-stay-pristine.md), which is the other record
about not reaching into a dependency to get what we want from it.

## Context

`public/_headers` serves `default-src 'self'` with no `script-src`, so no
string may be evaluated as script. That is the point of it, and it has already
decided one design in this tree: `theme.ts` exists because `next-themes`
delivered its flash guard as an inline `<script>` the policy refused, and the
module replaced the library rather than the policy being loosened for a theme.

zod builds a faster parser for object schemas by generating source and handing
it to the `Function` constructor. It only does that where the constructor
works, and a feature detection for `new Function` can only find out by
attempting it. So every load of every build ran the attempt, the policy
refused it, zod caught the throw and fell back to its runtime parser exactly
as designed. Both halves were working.

What the attempt left behind was a report. A refused `eval` fires a
`securitypolicyviolation` event and logs a console error whether or not
anybody catches the error — the catch stops the crash, not the reporting. So
the console carried one refusal on every load that meant nothing, sitting
ahead of whatever a deployment owner had opened it to read, and the only
honest instruction to give them was to expect exactly one.

The question that record was filed to hold is the one that keeps coming back:
would `'unsafe-eval'` in `script-src` be worth it? It was asked as a
console-noise question and it is not one.

## Decision

**The policy stays strict.** `script-src` is not added and `'unsafe-eval'` is
not granted. Nothing about a validation library's parser choice is worth the
protection the policy exists for, and the noise argument — real as it is —
argues for removing the noise, not for removing the refusal that reports it.

**zod is told `jitless: true`, and that costs nothing.** The flag is zod's own
switch, public as `z.config({ jitless: true })`, and under this policy it
changes no behaviour at all: the probe was always going to fail and the
runtime parser was always going to run. What it changes is that zod stops
asking a question whose answer is already determined, in the one kind of
environment where the asking is itself the reported event. This is the fourth
option, and it is the one #899 missed — it is not a trade, so it does not have
to beat the other three on their merits.

**The flag is set by a module-scope effect, and it is `App.tsx`'s first
import.** zod reads the flag when an object schema is CONSTRUCTED and memoises
the answer on first read. Every agent tool declares its arguments at module
scope (`definition.ts` is what makes a tool's schema its definition), so the
first schema is built while the import graph evaluates, long before React
renders. That rules out both easier spellings:

- An entry-file statement would be honoured in one consumer and absent in the
  other. `src/main.tsx` is this template's own entry; a deployment mounts the
  package and owns a `main.tsx` this repository never sees. `theme.ts` is a
  module-scope effect for exactly this reason and its header carries the
  argument in full.
- The `bootstrap.ts` seam is the wrong shape. It exists for values a HOST has
  to settle before the app's modules evaluate, and it is held to importing
  nothing but the seam module it sets. This is not a host's choice — it
  follows from this repository's own `_headers` — and a host that skipped the
  bootstrap would skip it.

So it is one line in a module of its own, reached through `App`'s import
graph, which both consumers evaluate before anything renders. Unlike the theme
it is ORDERED: first, not one among many. `validationJit.test.ts` holds the
position textually, because a tidying pass that sorted the import block would
move it and every runtime assertion would still pass — the flag would be set,
just after the only moment it mattered.

## What was verified

Measured on a real built load rather than in a unit test, because the event
this is about is a browser's and no unit test has one. The built `dist` served
by a local server carrying the exact `Content-Security-Policy` line from
`public/_headers`, driven with Chromium, counting
`securitypolicyviolation` events on the document:

- **Before, on `main`: one.** `violatedDirective: "script-src"`,
  `blockedURI: "eval"`, sourced to the app bundle. The caught error's own text
  is *"Evaluating a string as JavaScript violates the following Content
  Security Policy directive because 'unsafe-eval' is not an allowed source of
  script: default-src 'self'"*.
- **After: zero.**
- **The position is load-bearing, and that was tested rather than reasoned
  about.** Moved from the first import to beside `@/lib/theme` further down
  the same block, rebuilt, and the count went back to one. Nothing else
  changed.
- **Exactly two `Function` references survive in the bundle**, both zod's: the
  probe and the `Doc.compile()` that is gated behind it. There is no second
  source, so #899's "expect exactly one" was right about the count while it
  lasted.
- **Validation is untouched.** Schemas parse and reject as before — the flag
  selects the parser zod was already running under this policy, and the full
  suite covers the tool argument schemas that are the only zod in the shipped
  app.

## What this rejects

**`'unsafe-eval'` in `script-src`.** It buys the silence with the protection
the policy exists for. A policy that permits evaluating strings as script is
not a meaningfully strict script policy, and the thing being bought is a
parser optimisation in a validation library — measured against nothing here,
and applied to schemas that are parsed once per agent tool call.

**Suppressing the report.** Reporting is the signal, not the problem. A build
that stops reporting refusals is a build in which the next real refusal — an
injected inline script, a third-party widget, a dependency that started
evaluating strings — arrives silently. The whole value of the zero this change
reaches is that it is a zero: a report now means a new fact.

**Waiting for upstream.** #899's reading was that deferring the probe out of
module evaluation, or offering an opt-out, was zod's call and not ours. The
opt-out already exists and is public; there was nothing to wait for.

**Reaching into the dependency.** Patching `util.js`, aliasing the module, or
shipping a vendored copy would all have produced the same zero. Record 14's
rule holds: a dependency that offers a switch is configured through the
switch.

## Consequences

**A clean console on load is now a fact worth trusting, which makes it a fact
that can break.** Zero is the baseline, so a report means something new. The
template's own `_headers` still logs two errors about the
`YOUR_PROJECT_REF.supabase.co` placeholder until a deployment substitutes its
project ref, which is the file telling the truth about itself; those are not
refusals and they go away on a real deployment.

**A deployment that loosens its own policy gets the runtime parser anyway.**
The flag is set by this package, not derived from the policy it is set for, so
a host that grants `'unsafe-eval'` for some reason of its own does not get
zod's generated parser back. That is the right default — the package cannot
read the host's headers — and a host that wants the other behaviour calls
`z.config({ jitless: false })` after importing the app, and owns the refusal
if its policy is stricter than it thought.

**A zod upgrade could move the flag or the seam.** The name is zod's, the
memoisation is zod's, and the guard in `allowsEval` that makes this work is a
line in a dependency. If a future release drops the flag the probe returns and
the violation count goes back to one; nothing crashes, and the unit assertion
that the flag reads back as set is what notices.

**The plausible "fix" that would undo this:** a reader who finds this line,
concludes the template is leaving performance on the table, and removes it —
or a tidying pass that sorts `App.tsx`'s imports. The first is answered here;
the second is answered by the test, which is the only reason the test exists.
