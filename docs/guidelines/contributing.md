---
summary: How work gets proposed and landed here — the queue is GitHub issues rather than a folder, plans are dated history, branches are named for what they do, and a commit says what changed and why in the imperative.
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

Plans stay in the repository, but only as history —
[docs/plans/overview.md](../plans/overview.md) says what that means and how to
tell a live document from a finished one.

## 2. Before you push

`npm test`, `npm run lint`, `npm run build`, then the guard set in
[engineering/checks.md](../engineering/checks.md). CI runs all of it, so the
only thing running it locally buys you is the twenty minutes.

Two rules that are not checks, and cost the most when skipped:

- **A rule has one home.** Changing a rule means changing it where it lives,
  not adding a second statement of it somewhere more convenient.
- **Do not reformat what you did not change.** A diff that mixes a decision
  with a rewrap cannot be reviewed, only trusted.

## 3. The commit, and the pull request

Commits are imperative and concrete — what changed, and why it had to.
`fix(canvas): stop the arrow layer repainting on every hover`, not
`updates`. The subject line carries the change; the body carries the reason
the change was necessary, when that is not obvious from the diff.

A pull request says which issue it closes (`Closes #59.`), what it changes,
and what a reviewer should look at hardest. If it moved files, it says which
checks were updated for the new paths.
