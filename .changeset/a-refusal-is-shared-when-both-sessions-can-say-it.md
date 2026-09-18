---
'agentic-service-blueprinting': patch
---

One module owns every tool refusal, and a refusal crosses to the eval harness
only when the harness can say it truthfully.

`refusals.ts` exists so the loop and the Node harness turn a tool call away in
the same words, because a refusal is the prompt an eval case grades a recovery
from: reworded on one side only, the harness goes on grading a run against
words no session says — and passes, since the sentence it judges against is its
own. Two things were wrong with the set. The harness answered an unmapped tool
name in a wording of its own, and the registry built its own sentence for a
name it knows but the allow-list refuses, so "one module owns the refusals" was
not true even inside the app.

Both are fixed. The missing-tool refusal now comes across the harness's surface
entry, so an invented name — the commonest thing a model gets wrong, and the
refusal a run is likeliest to be graded on recovering from — is answered
identically on both sides. The allow-list refusal moved into `refusals.ts`
bytes intact as its own export, and each of the two now says at its definition
how it differs from the other, because they are not the same sentence: one
answers a name that is nothing here, the other a name the tool layer knows and
a fixed surface still refuses.

**The rule for sharing is now one rule, stated once.** Share a refusal when the
harness has a gate of its own whose answer is the same statement AND the
statement is true of the harness's session; otherwise it is app-only and says
which half fails. Not the test: whether a model could reach it (a model can
call any name on the roster), or what today's cases happen to call.

By that rule the missing-SEARCH refusal is app-only, where it had been shared.
The loop says it only when `search_blueprint` was never offered — a tool absent
from a roster does not exist for that session — and the harness offers the
whole spec table, so the app's sentence would be false of a harness run. The
harness now answers a ranked-search call with a sentence true of its own
environment, nothing there serving ranked search, and steers to the same two
reads, which is the part a case grades. The sample trial's refusal is app-only
for the same shape of reason: the harness has the no-database state but not the
narrowed roster that goes with it. The repeat-read refusal is app-only because
the harness implements no repeat-read guard, and the two transcript-row strings
because the harness renders no transcript.

The pins are pins on the RULE rather than on today's layout. Every shared
sentence gets the same four through one helper — owned by `refusals.ts`,
re-exported by the entry, destructured by the runner, and used where the
runner's own gate fires — so the next refusal is one line and no sentence ends
up guarded more loosely than its neighbours. The copy-ban for the one shared
sentence BUILDER is over its WORDS, so a concatenation, a format string or one
hard-coded name is caught as well as a template literal; the use-pins match the
binding in a result position rather than the whitespace under a `case` label,
which a reformat used to break.
