---
'agentic-service-blueprinting': patch
---

The bundled sample's three diagrams are back in its walkthrough

Open "Map your service" on the sample board and step through the storyboard:
the data-model hierarchy, the blueprint anatomy and the four ways in are drawn
again, at the steps where they always sat. They had gone quiet. The last
release took the touchpoint rows out of the walkthrough's roster — a touchpoint
cell's frame is its logo, not a moment — and those three drawings were hanging
off **References & guardrails**, which is a `backstage_touchpoints` row. Real
artwork parked on a row nobody reads is drawn nowhere.

So the artwork moved, and nothing else did. Each diagram now hangs off the
**Blueprint owner** cell at the same step — the actor row, which the
walkthrough does read — beside "Answers the scoping question", "Nods on the
proposed step and lane outline" and "Shares the deployed URL". Not the
storyboard row, which reads as the natural home and is not one: the storyboard
row is where the strip is *drawn*, from frames hanging off the other rows at
that column, so a figure placed on it would be just as invisible as a figure
placed on a touchpoint. The three reference cells keep their content, their
summaries and their resources; only their frame is now null.

One thing does read differently, and it is worth saying: the caption beside a
figure is its host cell's summary or content, so each diagram now carries the
owner's words rather than the reference cell's. "Answers the scoping question
and names whose journey runs along the spine" sits under the data-model
hierarchy where "Rendering follows the semantic lane_role" used to. That is the
walkthrough describing the moment rather than the document, which is what a
walkthrough is for.

Measured at the resolver, over both "Map your service" paths and every step:
**2 strip entries before, 8 after** — four figures a path, three of them these
diagrams and the fourth the `sb:map` figure that never moved. The walk over
every phase, scenario, path and layout of the offline board stays free of
console errors.

Only the sample's own data moved. The generator that emits the sample is the
one edit; the offline module and the database seed are regenerated from it, so
the two still cannot disagree. No rendering rule changed, so a deployment's own
board is untouched.
