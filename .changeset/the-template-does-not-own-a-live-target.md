---
'agentic-service-blueprinting': patch
---

**Three checks that need a live target now have a recorded owner, and it is not
this package.** `check:target`, `check:agent-account --check` and
`check:deployment-seed-load` each need a live project or a second checkout, so
none of them runs in this repository's CI. That was a gap rather than a
decision, and a gap reads as an oversight somebody will eventually close the
wrong way — by pointing this package at somebody's database.

The decision is written down in `docs/engineering/checks.md` instead: a template
has no deployment, so any project it could be pointed at belongs to someone
else, and the live half of each check runs in a deployment against that
deployment's own target. For `check:deployment-seed-load` the decision costs
something and the document says so plainly — it asks whether this package's
portable core accepts a real deployment's seed, which is the template's own
question, and nothing schedules it; it is answered by hand before a release,
from a machine with a deployment checked out alongside.

Nothing was added to the `check` job, which is the point: a job that ran any of
these with no target would print a passing line over an absent subject. All
three already write to the unverified register, so a green run says which
question went unanswered.

For a deployment, this changes nothing you run — but it says where the live half
of these three belongs, which is your side. If you take these checks, declare
them among your own live checks and fail when one stops running, rather than
relying on remembering.
