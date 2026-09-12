---
summary: How work gets proposed and landed here — the queue is GitHub issues rather than a folder, a durable decision is an ADR, a component test waits for signals rather than milliseconds and scopes its role queries because the suite runs in parallel, and a commit says what changed and why in the imperative.
---

# Contributing

**For** anyone about to open a pull request.
**Answers** how does work get proposed, and what does a change have to carry?

## 1. The queue is public

**Work in flight lives in [GitHub issues](https://github.com/BilLogic/agentic-service-blueprinting/issues), not in this repository.** Before proposing
something, read the open issues: the point of moving the queue out of the tree
was that a contributor can see what is already being worked on without a
checkout.

A larger piece of work gets a parent issue holding the problem statement and
the decisions, and child issues holding the shippable pieces. The parent is
where the argument lives; the child is what a pull request closes.

Nothing about work in flight is written down in the tree. What survives the
work is either protocol — a document under `docs/` stating how the package
behaves now — or a decision record under [`adr/`](../adr/). The argument that
got there is the issue, and the diff is the git history.

## 2. Before you push

`npm test`, `npm run lint`, `npm run build`, then the guard set in
[engineering/checks.md](../engineering/checks.md). CI runs all of it, so the
only thing running it locally buys you is the twenty minutes.

Two rules that are not checks, and cost the most when skipped:

- **A rule has one home.** Changing a rule means changing it where it lives,
  not adding a second statement of it somewhere more convenient.
- **Do not reformat what you did not change.** A diff that mixes a decision
  with a rewrap cannot be reviewed, only trusted.

### A component test is racing a clock it does not mention

`npm test` runs the files in parallel, so every test's wall clock is a
function of what else the machine is doing. Two habits turn that into a suite
that is red on a branch which changed nothing near the failure — the most
expensive shape a failure comes in, because the first place anyone looks is
their own diff.

- **Do not wait a number of milliseconds for a browser signal. Wait for the
  signal.** `history.back()`, a transition end, a load event: sleeping 20 ms
  for one is a bet on an idle machine, and a machine running the rest of this
  suite is not idle. Await the event, or the state the event produces.
- **Scope every `*ByRole(…, { name })` query.** The query computes an
  accessible name for every candidate in its container, and each of those
  calls `getComputedStyle`, which is the most expensive thing jsdom does.
  Asked of `screen` against a mounted editor that is hundreds of elements and
  seconds of wall clock; asked of the element the assertion is about, through
  `within(…)`, it is a handful. A test has no stated budget — vitest's default
  `testTimeout` of five seconds is the only one — so a test that costs
  seconds on an idle machine is already failing on a loaded one.

## 3. The commit, and the pull request

Commits are imperative and concrete — what changed, and why it had to.
`fix(canvas): stop the arrow layer repainting on every hover`, not
`updates`. The subject line carries the change; the body carries the reason
the change was necessary, when that is not obvious from the diff.

A pull request says which issue it closes (`Closes #59.`), what it changes,
and what a reviewer should look at hardest. If it moved files, it says which
checks were updated for the new paths.
