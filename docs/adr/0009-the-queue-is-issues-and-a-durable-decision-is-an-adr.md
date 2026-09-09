---
summary: The plans concept is retired rather than kept for the plans that might land next — work in flight is GitHub issues, a durable decision is an ADR, current behaviour is protocol, and the record of what was retired is the git history, so docs/ no longer carries a history lane, a status rule, or an index table for either.
---

# 9. The queue is issues, a durable decision is an ADR, and there is no plans folder

**Status** Accepted — 2026-09-09
**Context** `docs/overview.md`, `docs/guidelines/documentation.md`,
`scripts/generate-docs-index.mjs`, `scripts/swept-docs.mjs`,
`scripts/check-standalone.mjs`

## Context

`docs/plans/` held exactly one file, and that file was the doctrine of the
folder: what a plan is, that a plan is dated and never edited afterwards, that
`status:` is required in its frontmatter, that a plan is never current
guidance.

Real machinery stood behind the doctrine. The index generator treated anything
under that folder as history rather than protocol, listed it in a table of its
own with the status showing, and failed the build on a plan that stated none.
The root routing table carried a row answering *"Is this plan still true?"*.
Two sweeps — the standalone grep and the content-coupling grep — excluded the
folder, on the reasoning that the plans naming the deployment this package was
generalised out of were the record of why that boundary was drawn at all. A
migration cited a plan by address in its header comment.

The same file's last section said the folder was empty, and why: the earlier
planning documents were retired when the package was generalised, because they
described that deployment more than they described this package.

So the rules guarded an empty room. That is not merely tidy-looking waste. A
reader who meets the doctrine learns a document class this repository does not
have, and every guard behind it is a guard nobody can exercise — the status
rule had no file to fail, and the sweep exemptions protected nothing while
still reading as though something needed protecting. The migration's citation
was already dangling: the plan it addresses had not existed for weeks, and
nothing said so.

## Decision

**The concept is retired, not just its files.** There is no `docs/plans/`, no
`status:` rule, no history lane in the generated index, and no routing row
asking whether a plan is still true.

Everything a plan carried has exactly one home elsewhere, and each of these
was already true before this record:

- **Work in flight** is
  [GitHub issues](https://github.com/BilLogic/agentic-service-blueprinting/issues).
  A parent issue holds the problem statement and the argument; a child issue is
  what a pull request closes.
- **A decision that is hard to reverse, surprising without its context, or a
  real trade-off** is an ADR in this folder. That is the durable half of what a
  plan was for — the reasoning a shipped diff throws away.
- **How the package behaves today** is protocol: `docs/`, `references/`, and
  the code. A statement there that is wrong is a bug, not an older position.
- **What was decided and then retired** is the git history, which is where the
  planning documents already were.

**A citation of a retired plan is removed, not rewritten.** The migration's
header line was a bare address with nothing else in it; the line above already
says what the migration does and the block below already states the invariants.
Rewriting the address into prose would have manufactured a sentence to carry a
pointer that no longer points anywhere.

## What this rejects

**Keeping the folder and its rules for the plans that land next**, which is
what the retired doctrine explicitly proposed and is the live alternative here.
It is cheap to keep and it reads as prudent. But a rulebook guarding an empty
room teaches a class of document that does not exist, and the cost lands on
every reader who takes it seriously — including an agent, which cannot tell a
dormant convention from an active one and will go looking for the folder. If
the need returns, the convention can be written again in an afternoon, against
whatever it turns out to be needed for rather than against what it was needed
for once.

**Deleting the file and leaving the machinery.** The doctrine and the
generator rule are one thing seen twice; removing only the prose would leave
a `status:` rule with no documentation behind it and a code path nothing can
reach, which is worse than either half.

**Keeping the standalone sweep's exemption for the folder.** It was load
bearing while the plans existed, because those documents had to name the
deployment they were decoupling from in order to say anything at all. With the
folder gone it exempts nothing. What it was defending was never the paths — it
was the reason the boundary is checked at all, and that argument now lives in
the header of `scripts/check-standalone.mjs`, in the file it belongs to.

## Consequences

- **`docs/index.md` has one table.** A future reader who wonders why there is
  no history lane, or why `INDEX.md` routes no question about plans, is
  reading this record. That question is most of why it exists.
- **A dated, decision-era snapshot committed under `docs/` now lands in the
  protocol table and claims to be current, and no check stops it.** That is the
  trade-off taken knowingly. The status rule was the only thing that would have
  caught it, and it was catching nothing; the guard that replaces it is that
  such a document has nowhere to go, because the ADR folder and the issue
  tracker between them already cover the two reasons anyone would write one.
- **Retrieval is a git command rather than a folder.** The retired plans, and
  this repository's own plans doctrine, are reachable by
  `git log --diff-filter=D --stat -- docs/plans/` and then reading the blob at
  the commit before the delete.
- **An ADR is now the only durable prose that is allowed to be out of date**,
  and it earns that by being a record of a day rather than a claim about now —
  which is why `scripts/swept-docs.mjs` still exempts `docs/adr/` from the
  vocabulary sweeps, and now exempts nothing else.
