---
'agentic-service-blueprinting': patch
---

The developer portal is a development tool in the build as well as in the
description: outside a dev build the tier simulation resolves to the real
session, whatever the browser has in storage.

It was live everywhere. The provider called `applyDevSimulation` on every
render in every build, so the two flags the whole editing surface gates on —
`canWrite`, and the `canAgentWrite` derived from it — were moved by a value
read out of `localStorage`. A deployed site therefore offered any visitor the
entire authoring UI, and every control in it then failed against Postgres.

The server was never fooled and is not what changed. Row-level security and the
RPC grants never saw the simulated tier, which is why the consequence stayed
survivable; but a stranger being shown handles, design mode, panel editors and
the agent's write tools before the database refuses each one is not a UI a
template should ship, and "the writes fail anyway" is an argument about the
blast radius rather than about the door being open.

HIDING THE TWO CONTROLS WOULD HAVE BEEN WORSE THAN LEAVING THEM. The obvious
fix is a build check in front of the badge and the settings section. That hides
the door and leaves the lock: a browser that carries the storage key from a dev
session, or one whose devtools write it, still gets the lifted flags — now with
the badge that says so gone too. The tell is the part the render gates were
holding up.

So the gate is at the seam instead. Every consumer reads the simulation through
one hook, and that hook is where the build answer is applied; the provider is
untouched, and the badge needs nothing of its own because a simulation that is
off renders nothing already. The settings section, which is the controls rather
than a report on them, is the one place that also returns null — it has no off
state to collapse to. `applyDevSimulation` stays a pure function of its two
arguments, which is what keeps it testable in both directions in a build that
will never call it with a live simulation.

The flag is read at call time rather than folded into a module constant. A
build replaces the expression with its literal either way, and reading it when
it is asked for is what lets a test state the shipped answer to a module that
has already been imported.

MEASURED WITH THE KEY PRESENT, because with it absent the assertion is empty.
Three cases now pin the production behaviour against a stored simulation of
admin: the flags come back at the real session's values, neither the section
nor the badge renders, and the stored value is left where it was and honoured
again the moment the build answer is development. The suite runs with the
development answer by default, so this block is the only place the other one is
observable — the file says that where a reader meets it.

WHAT THIS DOES NOT DO, measured rather than hoped for. The portal's code is
still in the production bundle — its copy, its storage key, the badge's word
for itself — because the build answer is read through a call the minifier
cannot fold, which is the same property the test depends on. Nothing renders it
and nothing consults it; what changed is the reach, not the byte count. Trading
that for a constant the minifier could fold would buy a few hundred bytes and
give up the only assertion that can observe the shipped behaviour, which is the
wrong side of that trade for a defect that was found by nobody running it.
