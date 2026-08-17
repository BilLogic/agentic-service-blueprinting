---
title: Copy plan — every word on every figure, and the voice rules behind them
type: plan
status: draft-for-review
date: 2026-08-08
supersedes: the caption/label strings inside specs 01–10
review: Bill aligns on this BEFORE any figure is redrawn
---

# Copy plan

Round-1 figures failed on writing before they failed on layout. This file
fixes the voice, sets a text budget per figure, and lists every string.
Specs 01–10 keep the geometry; where a string differs, this file wins.

## What went wrong in round 1

| String | Why it's wrong |
|---|---|
| "too much for thursday's meeting" | invents the reader's calendar and reaches for a joke; the reader's week is not ours to characterize |
| "drift is quiet — nobody notices until it bites" | ominous editorializing; sells fear |
| "four tools, four partial truths" | aphorism; also implies the team's existing docs are failures |
| "a lane nobody filled in" | assigns blame to a person |
| "a poster becomes a database" | marketing punchline; fine in README prose, wrong on a figure |
| "play it out before you build it" | imperative sales register |

The common fault: the captions **characterize a situation** instead of
**describing the mechanism**. The shipped figures never do that — "every
actor gets their own lane", "users can't see below this line", "one action
sets off another", "holds multiple scenarios, in no particular order".

## The voice rules (binding on every figure)

1. **Describe the mechanism, not the feeling.** State what the thing is or
   does. No consequences, no stakes, no drama.
2. **Never characterize the reader or their organization.** No "your
   Thursday", no "nobody noticed", no implication that their documents,
   team, or process is deficient. Documents are partial by nature, not by
   negligence — say the former or say nothing.
3. **No jokes, no aphorisms, no punchlines.** If a line would work in a
   keynote, it does not go on a figure.
4. **Lowercase fragments, present tense, no terminal period.** Match the
   shipped register exactly.
5. **The artifact is a "blueprint", never a "map".** "map" is only the
   skill name `sb:map` or the verb "map your service".
6. **One caption per figure, one clause per label.** If a fact needs two
   clauses, it belongs in the guide, not the drawing.
7. **Claims must be checkable.** "stays in sync" is a mechanism; "keeps
   everyone aligned" is a promise — cut promises.

## Text budget (hard caps)

| Figure | Max text elements | Caption |
|---|---|---|
| the four skill figures | 10 each | 1 line |
| cell-anatomy | 14 (callouts included) | 1 line |
| slicing-model | 16 (3 bands) | 1 line |
| four-ways-in | 13 | 1 line |
| why-now | 10 | 1 line |

Counting rule: **callouts, labels and captions count; the words inside a
UI mock do not** — on an annotated-UI figure the mock's own labels
("Dependencies", "Set off by", "Owner") are the subject being depicted, and
faking them shorter would make the figure lie. Callouts are capped at 6 per
figure regardless. Round-1 sb-audit had 26 elements of our own writing.
That is the disease.

## The four skill figures — full copy

Structural changes that fix the bleeding text: **the guardrail CAPS line is
cut** (it ran the width of the figure and collided with both panels; the
gap between panels is only 168px and can never hold it). Panel `.sub`
explanation lines are cut too. What remains per figure:

```
title                          (1)
left rail label                (1)
right rail label               (1)
skill chip: name + subtitle    (2)
in-panel labels                (≤4)
caption                        (1)
```

### sb-map.svg

- Title: `sb:map — from scattered sources to one blueprint`
- Left rail: `WHAT YOU HAVE`
- In-panel (4 artifact cards, mono): `research-notes.md` ·
  `journey map (figjam)` · `ops-runbook.xlsx` · `interview transcript`
- Chip: `sb:map` / `map your service`
- Right rail: `WHAT YOU GET`
- In-panel (2 mono rows): `blueprint.json — one validated file` ·
  `rendered app · no database required`
- Caption: `the same service, described once — structured so both the team
  and its agents can read it`
- *(cut: "four tools, four partial truths"; the guardrail line)*

### sb-slice.svg

Round-1 balance was the best of the four; keep the structure, fix two lines.

- Title: `sb:slice — the view each audience needs`
- Left rail: `THE WHOLE BLUEPRINT`
- Left `.sub`: `every lane, every step, every path`
  *(cut "— too much for thursday's meeting")*
- Chip: `sb:slice` / `cut the view you need`
- Right rail: `ONE SLICE PER AUDIENCE`
- Deck labels + audience lines: `journey summary` / `for leadership` ·
  `channel view` / `for the web team` · `touchpoint spec` / `for the squad`
- Caption: `a slice holds the frames one audience needs, and points back at
  the cells it came from`
- *(cut: the guardrail line — "a lens, not a copy" is now the caption's job)*

### sb-audit.svg

- Title: `sb:audit — checking the blueprint against how the service runs`
- Left rail: `WHAT THE CHECKS LOOK FOR`
- Left callouts, **two only**, one line each:
  `two touchpoints that contradict each other` ·
  `a step with no backstage action behind it`
  *(cut the third mark and "drift is quiet…"; "a lane nobody filled in"
  reworded to remove blame)*
- Chip: `sb:audit` / `check it still holds`
- Right rail: `FINDINGS YOU TRIAGE`
- Finding rows (3): `channel conflict — app and call script disagree` ·
  `gap — no backstage action behind the sms step` ·
  `stale — pricing step predates the current flow`; status pills
  `open` `open` `resolved`; overflow row `+ 4 more from this run`
- Caption: `each check runs on its own and reports what it found — nothing
  is changed for you`

### sb-whatif.svg

- Title: `sb:whatif — tracing a change before it's made`
- Left rail: `A PROPOSED CHANGE`
- On-grid pill: `what if we drop the sign-up call?`
- Chip: `sb:whatif` / `trace it first`
- Right rail: `WHAT IT WOULD TOUCH`
- Card title: `change request — drop the sign-up call`; rows:
  `7 cells affected across 3 lanes` · `demand moves to chat support` ·
  `2 assumptions no longer hold`; footer row (mono):
  `accept ▸ promote via sb:map ▸ re-import`
- Caption: `the trace runs on a copy — the live blueprint changes only when
  you accept`
- *(cut: "the ripple, traced cell by cell on a working copy" — the caption
  says it; and the guardrail line)*

## why-now.svg — CONCEPT RESET (needs your pick)

Round 1 tried to carry three ideas (agents arrive · service design has
practiced this · the blueprint converges them) in one drawing and read as
an abstract diagram of an argument. Three replacement concepts, one idea
each:

**Option A — coverage (recommended).** A single horizontal service journey
spine across the figure. Above it: four document cards, each spanning only
the fragment it actually describes, with visible gaps and one overlap.
Below it: one blueprint bar spanning the whole spine end to end.
Two labels only: `documents describe parts of the service` /
`a blueprint describes the whole of it`. Caption: `an agent answering a
question about the journey needs the whole of it, not a folder of parts`.
Why it works: it is a structural claim a reader can check, it doesn't
insult anyone's documents, and it is the exact gap the eval measured.

**Option B — two readers.** The blueprint in the middle; left arm: people,
labelled `read it at planning moments`; right arm: agents, labelled
`read it on every question`. Caption names the change: `what a blueprint
costs to consult is what kept it on the wall`. Carries "why NOW" more
directly, but says less about context engineering.

**Option C — no figure in §2.** The thesis lives in prose; the hero
screenshot follows immediately. The coverage figure (A) moves to the case
study, where the argument is the point.

Recommendation: **A**, with the "why now" beat carried by the surrounding
prose. B is a good second figure later if §2 grows.

## skill-architecture.svg — CONCEPT RESET (needs your pick)

Round 1 was an inventory: four skills × their resource stacks + eight
shared references + five agents + three hooks. That is a table pretending
to be a diagram, and it reads as overwhelming because every element has
equal weight and none of it is a mechanism.

**Option A — drop the figure.** The package contents belong in a table in
guide/03. Nothing is lost; the four skill figures already show what the
skills do.

**Option B (recommended) — replace it with a principle figure:
`how-a-skill-runs.svg`.** One skill, one pass, showing the three design
decisions worth knowing:
- what is in context at each moment (small, one playbook at a time — not
  the whole reference library);
- the fresh-context agents it spawns, which read the heavy material and
  return a summary (their reading never enters the main context);
- the deterministic gate between steps.
Labels: `loaded when the step needs it` · `reads the sources, returns a
summary` · `the step ends when the check passes`. Caption: `each step loads
one playbook, spawns readers that return summaries, and ends at a check`.
This is the same idea the shipped figure had, told for four skills instead
of one — and it earns a diagram because it's a mechanism, not a list.

## cell-anatomy.svg — REDRAWN AGAINST THE VERIFIED PANEL

The round-1 panel was invented. Verified structure (uno main): a
right-pinned drawer whose header carries **only a breadcrumb**
(`Phase › ⋯ › Path › Step N`) plus expand and close; the title, lane chip,
owner pair and spec block render **inline above the tabs, not in one**;
the tabs are **Dependencies · Evidence · Resources** with Dependencies
default; the dependencies tab lists **Set off by · Sets off · Needs**; the
empty evidence state is the literal line `○ assumption — no evidence yet`;
a collapsible **In slices (N)** strip is the footer. **Findings do not
appear in the panel at all** — they live in the agent transcript, so the
round-1 findings row was removed rather than relocated.

Callouts (5): `where the cell sits — phase, path, step` · `the lane it
belongs to; its colour is the lane's` · `what it has to accomplish, how it
comes across, and who gets what from it` · `set off by and sets off are the
arrows on the grid; needs is a dependency without one` · `the slices this
cell appears in`. Second state shown at left: `a cell carries its own
sources; with none, it reads as an assumption`.

Caption: `a cell is what one actor does at one step — with what sets it
off, what it needs, and what backs it up`.

## four-ways-in.svg — REDRAWN AGAINST WHAT IS ACTUALLY SET UP

The fourth panel was wrong. Verified: the real external surface is a
**deployed Slack bot** that reads the published tables directly with the
anon key under a vendored constants contract, answers with cell-level
citations, and hands back deep links that open that exact cell in the app.
A Supabase-MCP path is a documented recipe with nothing configured — so the
figure no longer promises it; the guide can mention it as an option.

Scene labels (3 and 4 corrected by Bill 2026-08-08 — the third way is
agentic tooling, not an editor; the fourth is Claude in Slack or a Slack
bot, not a generic "chat tool"):
`the app, in a browser` / `read, compare, present` ·
`the agent inside the app` / `ask, and author what you ask for` ·
`your agentic tools` / `build and maintain the blueprint` — the mock names
them in its window chrome (`claude code`, `codex`) and shows
`sb:map · sb:audit …` on the prompt line ·
`claude in slack, or your own bot` / `answers with citations and links` —
the mock shows an `@claude` mention and the chip `↗ opens that exact cell`.

Foundation bar: `one blueprint — the same rows, whoever is asking` /
`published for reading; every change goes through one guarded path`.

Caption: `what each way can do follows from the account it uses — visitors
read, members ask, service accounts author`.

## Existing figures — already applied

- `blueprint-anatomy.svg`: layer-role legend **removed** (your call — it
  wasn't earning its space).
- `data-model-hierarchy.svg`: footer caption **removed**.
- Both keep the background rect for dark-mode screens.

## Title system — LOCKED (Bill, 2026-08-08)

Definitional register, extending the two shipped titles rather than
competing with them: structure figures use "Inside …", process figures use
"How … is …". Applied to every figure:

| Figure | Title |
|---|---|
| data-model-hierarchy | How a blueprint is organized *(shipped, unchanged)* |
| blueprint-anatomy | Inside a single path *(shipped, unchanged)* |
| cell-anatomy | Inside a single cell |
| sb-map | How a blueprint is made |
| sb-slice | How a blueprint is sliced |
| sb-audit | How a blueprint is checked |
| sb-whatif | How a change is traced |
| slicing-model | How slices work |
| skill-architecture | How a skill is put together |
| four-ways-in | How the blueprint is reached |
| why-now | *pending — see below* |

Body copy stays as-is: ALL-CAPS section rails, lowercase fragment labels,
mono for literals, one caption line. No em-dash taglines in titles ever.

## why-now — the prose/figure split (for discussion)

Bill's steer: keep only variant B's right-hand frame; what is missing
visually is **the frequency of use once an agent joins** and **what gets
distilled into the blueprint**. So the labour divides:

**The paragraphs carry the argument** (README §2, three short paragraphs):

1. Agents are joining teams, and what they are handed is a folder of
   documents, each written for its own purpose. In our eval, documents
   alone were the riskiest setup — an out-of-date page gets stated as
   current fact.
2. Service design has long built frames for people to coordinate around a
   service; the blueprint is the strongest of them.
3. What changed is the cost of consulting one. A frame people opened at
   planning moments can now be read on every question.

**The figure carries what prose is bad at** — volume and rate:

- **Distillation in.** The sources that get folded into the frame
  (research, interviews, ops knowledge, existing docs, workshop output)
  converging into it. Answers "what information ends up in there".
- **The frame itself.** Lanes across time — the whole service as one
  object.
- **Frequency out.** Who consults it and how often, drawn as tick density:
  the team a handful of times per cycle, an agent once per question. The
  contrast is the point, and it is visual, not verbal.

Nothing in the figure argues; it depicts an object, its inputs, and its
read rate.

Title candidates for it (definitional family): **How a blueprint is used**
· How a blueprint stays useful · What a blueprint holds, and who reads it.
