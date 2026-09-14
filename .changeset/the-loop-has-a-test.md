---
'agentic-service-blueprinting': patch
---

**The agent loop is driven from a fake provider through a tool to its
result, and the harness smoke runs in CI.** `loop.test.tsx` scripts a
provider adapter — no network — and asserts what a person and the model each
see: a read that runs and whose result is fed back as the next round's
`tool_result`; a write that lands on the service the session was handed and
reads the tool's own sentence back; and two writes the session cannot run —
one the no-database trial has no tool for, one the deployment's allowlist
disabled — refused in the loop's words without being dispatched.

The loop's refusals and the batch limit they quote move to
`tools/refusals.ts`. The harness bundles the three it gates with through
its surface entry instead of carrying its own copy of each, so the refusal
it grades against is the one the app says. `agent:harness:smoke` — the
keyless rehearsal over the bundled sample — runs in the CI check job.

Two things stay the harness's own words: its dry-run write results (a write
is never executed there; the result is a rehearsal note) and the tier
paragraphs of its system prompt. #728 names them.
