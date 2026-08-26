---
summary: What a plan is and how to tell whether it is still true — plans are dated, immutable, decision-era snapshots that carry a status in frontmatter, and are never the answer to "what should I do now".
---

# Plans

**For** anyone who found a plan and is deciding whether to believe it.
**Answers** what is this file, and is it still true?

## 1. A plan is history

The queue is [GitHub issues](https://github.com/BilLogic/agentic-service-blueprinting/issues). A plan is not a queue entry, a specification or a
statement of current behaviour. It is the record of what was decided at one
moment, why, and what was ruled out — the reasoning that a shipped diff throws
away and that the next person to touch the same code needs.

That means two rules, and the value of the folder collapses without either:

- **A plan is not edited after it is written.** Not to correct it, not to
  bring it up to date. If reality moved, the plan is a snapshot of a moment
  when it had not, which is exactly what makes it worth keeping.
- **A plan is never current guidance.** How the system behaves today is in
  `docs/`, `references/`, and the code. A plan that disagrees with those is
  not a discrepancy to reconcile — it is an older position, and the newer one
  wins.

## 2. What a plan file carries

```markdown
---
status: history
summary: One sentence saying what was decided, in the past tense.
---
```

The filename is `YYYY-MM-DD-NNN-<kind>-<slug>.md`, dated the day it was
written. `status:` is required — `docs/index.md` lists plans in their own
table with that value showing, so a reader sees a plan is history before
opening it. A plan with no `status:` fails `npm run check:docs-index`.

Recognised values:

| `status` | Means |
| --- | --- |
| `history` | Finished. What it proposed either shipped or was abandoned; either way it is a record. |
| `active` | Still being executed. The tracking issue is the authority on progress; this file is the reasoning behind it. |
| `superseded` | A later decision replaced it. Name the replacement in the frontmatter with `superseded-by:`. |

## 3. What is here now

Nothing. This repository's earlier planning documents were retired when the
package was generalised from the deployment it grew out of — they described
that deployment more than this package, and the record of them is in the git
history. The folder and its rules stand for the plans that land here next.
