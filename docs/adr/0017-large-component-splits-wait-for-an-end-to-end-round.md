---
summary: Three components long enough to be worth splitting waited for the tests that would catch a split going wrong; the hold had an exit condition rather than an excuse, all three flows now have one, and what each split did is recorded at the end.
---

# 17. Large component splits wait for an end-to-end round

**Status** Accepted — 2026-08-26. Moved into this repository from
BilLogic/plus-uno-blueprint ADR 0008 on 2026-09-10 (#551); the number
here is this repository's. Amended 2026-09-13 (#699): the exit condition is
per flow — each held component's flow has a CI slice, and each slice unblocks
that component's split — and the cell-edit flow is covered; see the end.
Amended again 2026-09-14 (#747): the annotation-drag flow is covered too — as a
jsdom slice and as a browser case in the render walk — and the annotation
layer's split is unblocked; see the end. Amended again 2026-09-14 (#770): all
three flows are covered, so the hold is lifted. Amended again 2026-09-14
(#774): the agent panel is split, and the record now carries an outcome per
component; see the end. Amended again 2026-09-14 (#791): the cell panel's facts
are one resolution and three narrow readings; see the cell-panel amendment.
Amended again 2026-09-14: the annotation split's six near-copies are one bar,
one mark and a table; see the end. Amended again 2026-09-14 (#792): the cell's
four surfaces wear the shared panel header; see the cell-panel amendment.
Amended again 2026-09-14 (#802): the agent panel's split left three stores the
views wrote from below, and they are one session module now; see the end.
Amended again 2026-09-18 (#922): the phone's agent flow has a slice and a
browser case too — not because this record named the shell, and nothing is
unblocked by them, but because the risk it was written about came true there
twice; see the end.
**Context** `src/components/editor/CanvasAnnotationLayer.tsx`,
`src/components/blueprint/BlueprintCellDetailPanel.tsx`,
`src/components/editor/AgentPanel.tsx`

## Context

Three components have been flagged as too large since the 2026-08-08 harness
review, and re-measured today:

| file | 2026-08-08 | at the time of writing |
|---|---|---|
| `src/components/editor/CanvasAnnotationLayer.tsx` | 2157 lines | 2260 |
| `src/components/blueprint/BlueprintCellDetailPanel.tsx` | 1479 lines | 1444 |
| `src/components/editor/AgentPanel.tsx` | 19 `useState` | 13 |

These numbers are a snapshot, not a guarantee, and the first row proves it: the
figure recorded when this ADR was written was already 86 lines out of date by
the time it merged, because the canvas-robustness work landed in between. Do not
trust the column; run `wc -l` on the three files. The decision below does not
depend on the exact figures — only on the fact that these files are long and
their flows are thinly covered.

They are deliberately not split. This records why, and what would change it,
because a hold with no stated exit is indistinguishable from neglect — and
because the *reason* is easy to get backwards.

## The reason is test coverage, not size

A split of this kind is a pure refactor: the behaviour is supposed to be
identical afterwards. That makes it exactly the change a test suite is for, and
exactly the change that is dangerous without one. The suite here is substantial
— 709 tests as of this writing — but it is strongest at the seams these files do
not sit on. `CanvasAnnotationLayer` is drag, pointer capture and geometry;
`AgentPanel` is a long-running session with its own state machine; the cell
panel is a form over an authoring ledger with identity-keyed inverses.

None of the three is well covered end to end. Splitting them now would move code
between files with no instrument that can tell whether behaviour moved with it.

## What this estate has learned about doing it anyway

Two recent findings are the argument in miniature.

A CSS at-rule was renamed and browsers dropped its entire block silently. The
contract test guarding it kept passing, because it read the file rather than the
computed cascade — so `touch-action` computed `auto` across the whole board with
every check green.

A lane chip set `backgroundColor` to a role key rather than a colour. Invalid
CSS, dropped by the browser, no error anywhere. It rendered untinted from the
day it shipped until a deduplication pass happened to read the line.

Both are the failure mode of a refactor without behavioural cover: the code
looks right, the guards are green, and the thing is broken in the browser.

## The exit condition

*Superseded 2026-09-13 (#699) — the exit is per flow now; see the amendment at
the end. The original condition stands here as it was written.*

Split them when a green end-to-end round covers the three flows they own —
annotation drag, an agent session, and a cell edit with its revert. That round
is the prerequisite, not a nice-to-have, and it is worth doing on its own merits
regardless of whether the split follows.

Until then, prefer extracting a genuinely independent piece — one with its own
tests, the way `AgentSettingsFields.tsx` came out of the settings rail — over a
structural split of the whole file.

**Browser render — covered.** 2026-09-13 (#706). `render-walk/` opens the built
distribution in Chromium, in no-database mode, and walks the bundled sample
board exhaustively: every phase, every scenario, every path one at a time, and
every layout that scenario offers — merged only from two paths up, where it is
a different board rather than the same one under a second `view=`. It fails on any console error or page error, naming the address
it appeared on, and it fails on a board that arrives without lanes, without
step headers or with empty cells. It runs as its own CI job, which first
injects a console error and asserts the walk goes red. `npm run
check:render-walk`.

That is the *render* flow, and it is exactly the class the two findings above
belong to: the code looks right, the guards are green, and the thing is broken
in the browser. Both would now be caught in part — the dropped at-rule left
`touch-action` computing `auto`, which this walk does not read, but a rule the
browser refuses is the kind of defect that usually takes something visible with
it, and a page that throws while laying one out is now an error somebody sees.

What it does not see is the other half, and the distinction matters for anyone
reading this as permission: **it sees an error and a blank grid, not a wrong
colour.** A lane chip tinted with a role key renders untinted, and renders. So
the walk files one screenshot per view, CI uploads them, and a person reads
them — the guard is the machine half, the screenshots are the human half, and
neither is the whole instrument.

The three flows the exit condition above names — annotation drag, an agent
session, a cell edit with its revert — are untouched by this. A render walk
navigates and reads; it does not drag, does not open a session, and does not
write. The hold stands.

## What this is not

This is not a claim that the files are fine. They are long, and the length
costs. It is a claim about ordering: the instrument comes before the surgery.

## Amended 2026-09-13: the exit is per flow, and one flow is covered

The exit condition above asked for one green end-to-end round over all three
flows before any of the three files could be split. That made the first slice
worth nothing until the last landed, which is how a prerequisite becomes an
excuse. The condition is now per flow: **each held component's flow has a CI
slice, and each slice unblocks that component's split.** A slice is a test that
drives the flow through the real code at every layer the split would move,
fails on a wrong read-back, and runs on every pull request.

**Cell edit with revert — covered.** `src/slices/cellEditRevert.slice.test.tsx`
edits a cell from the real panel over the real cell-detail provider, saves
through the one save and the real content and spec mutations, reverts each
change from the real change sheet through the real `executeRevert`, and reads
the row back column for column. CI runs it as `npm run slice:cell-edit` (and
inside `npm test`). The database is an in-memory table behind the calls the
flow makes, and two leaf reads the panel makes (value audiences, registry
placements) are stubbed — the fallback #699 named. The primary form, the same
flow against standalone PostgREST over the CI Postgres with the dev authoring
key, was not attempted: the stack carries no PostgREST binary and mints no
service claim, so building it is its own piece of work, and it is filed as
#734 with the runtime measurement as its first step. What the fake cannot see
— a grant, a policy — `check:seed-load` asks the real database, as the author,
for every column this slice writes. The cell panel's split is unblocked.

**Annotation drag** and **an agent session** — not covered; those two files
stay held until their slices land. *(Both were covered on 2026-09-14 — see the
two amendments at the end, and the one after them that lifts the hold.)*

## Amended 2026-09-13: the cell-edit slice has its primary form

The paragraph above named the in-memory table as the fallback and filed the
primary form — the same flow against standalone PostgREST over the CI Postgres
— as #734. It exists now. `npm run slice:cell-edit:postgrest` builds the stack
`check:seed-load` builds, starts a pinned PostgREST release on it, mints the
service claim the recipe's restrictive policies read, and runs the same slice
file through `supabase-js` as a signed-in author, editing a row the seed holds;
with `--prove` it revokes UPDATE on one written column and requires the slice
to go red. What the fake could not see — a grant, a policy — the primary form
sees, so the two questions `check:seed-load` answered for it are now answered
by the flow itself. The in-memory form stays as the fast local one, and the two
cases that are about the fake run only there. The runtime is printed on every
run. No developer machine here carries a PostgREST binary, so the service-claim
write path was proved by hand against the stack and the end-to-end run, with
the measurement the ticket asked for, is CI's — its first run measured 3.9 seconds for the slice and 4.4 for the
proof, about ten seconds for the step with the release cached — and this
record is amended again if it stops being near a minute.

## Amended 2026-09-14: an agent session is covered

**An agent session — covered.** `src/slices/agentSession.slice.test.tsx`
opens the real `AgentPanel`, starts a session from its own ＋, types a
sentence into the composer and presses Send. The loop is the real
`sendToAgent`; the model is the scripted provider adapter #694 introduced, so
there is no network and no key beyond the string that unlocks the send. The
script calls one read tool and then one write tool — `get_cell`, then
`update_cell` — over the real definitions, the real one save and the real
content and spec mutations. What the slice then asks is what the loop test
could not: what a PERSON sees, and what the database holds. The transcript
renders the turn, each tool call and the result its row discloses; the row
holds both halves of the edit and nothing else moved; the ledger holds one
entry per write path, each wearing that session's agent attribution, and the
real `SessionChangesSheet` shows a ✦ per row; both reverts from that sheet
put the row back column for column; and the transcript READS BACK from the
persisted rows after the panel is closed and reopened — the slice forgets the
in-process run between the two (`forgetAgentRun`) after checking the close
really emptied the screen, so the reopen hydrates `agent_messages` the way a
session reopened in another browser does, and it asserts what those rows
actually carry: the message, the narrations, the answer and the tool names,
but not the stripped-out tool payload. It fails on a wrong read-back, and has
been watched fail on two, each encoded as its own case: one drops a written
column, so the panel reports a write that did not land; the other mocks the
live tool context into running the write unattributed, and the ledger's
author, session id and ✦ all go with it. CI runs it as `npm run slice:agent-session`
(and inside `npm test`). The database is the in-memory table the cell-edit
slice uses; what it cannot see — a grant, a policy — `check:seed-load` asks
the real database for every column this flow writes, and the cell-edit
slice's PostgREST form asks of the same two writes. Mocked: the Supabase
provider, the provider adapter, and the viewport probe jsdom has no
`matchMedia` for. **The agent panel's split is unblocked.**

## Amended 2026-09-14: the annotation-drag flow is covered

**Annotation drag — covered.** `src/slices/annotationDrag.slice.test.tsx`
opens annotation mode from the real `CanvasAnnotationToolbar`, draws a box
across two cells of a board through the real `CanvasAnnotationLayer` — the
real pointer path, the real `clientToLocal` un-projection, the real
frame-batched drag queue — drags that box onto a third cell, and reads it back
through the real `AnnotationCaptureMenu` over the real `captureMarks`: the
captured payload names the two cells the box was drawn over before the drag
and the one it was dragged onto after it. The layer is then taken off the page
and mounted again under the same provider, and the mark is still where the drag
left it — the marks are the PROVIDER's state, so a layer remount keeps them and
a provider remount would not, which is the ephemerality rather than a gap. CI
runs it as `npm run slice:annotation-drag` (and inside `npm test`).

**There is no persistence; the read-back is the capture, and the issue's word
was wrong.** The cell-edit slice reads a row back because a cell is a row. An
annotation is not: annotations are deliberately never persisted —
`src/lib/annotationCapture.ts` and `AnnotationCaptureMenu.tsx` both record why
(saving every stroke turns markup into a record, and costing nothing is the
point of the layer) — and the schema holds no annotations table to stand a fake
one up for. Nothing in this flow is stored at all: the capture is an in-memory
hand-off to the composer (`setPendingAgentAttachment`, read back with
`takePendingAgentAttachment`), and it is the read-back because it is the one
thing the flow produces. It is also the stronger one for this component, since
it resolves each mark to the cells it overlaps in board space — exactly the
answer a broken split would get wrong.

What is stubbed is geometry, at the smallest seam, because jsdom lays nothing
out: `getBoundingClientRect` on the layer and on each cell, plus
`offsetWidth`/`offsetHeight` on the layer — the values the layer and the capture
menu each divide to recover the camera — and
`setPointerCapture`/`releasePointerCapture`, which jsdom does not implement. The
board carrying those rects is a stub for the same reason: a cell's only
contribution to this flow is its id and its rectangle, and under jsdom the
rectangle is the test's whichever component draws it. The stubbed camera is
deliberately NOT at zoom 1 — the layer is twice as wide in its own units as it
is on screen, and offset — so the drag's local distance is twice the distance
the pointer moved and a split that dropped the scale term goes red instead of
dividing by one. Frames are faked and turned by hand, so the drag queue is
watched publishing mid-gesture rather than only at the `pointerup` flush. One
leaf read is mocked, the way the cell-edit slice mocks its two: the Supabase
provider, for the `canWrite` the capture menu reads.

The guard has been watched go red twice over: one case drops the drag's
position write — the `dropOnWrite` of a flow whose write is a context call
rather than a column — and the mark then reads back on the cells it was drawn
over instead of the one it was dragged to; another moves the pointer under
`DRAG_THRESHOLD` and requires the mark not to move at all.

**And the browser case, because the three stubs are the three things jsdom
cannot do at all.** `render-walk/annotation-drag.spec.ts` runs beside
`render-walk/sample-board.spec.ts` under the same config, so
`npm run check:render-walk` now walks two cases: it opens the bundled sample
board, picks the rectangle from the real toolbar, draws a box across two cells
of one lane with real mouse moves under the canvas's live CSS-transform camera
(around 0.47 on that board), drags it onto a third with real pointer capture,
and reads the captured `overlaps` out of the capture menu's OWN download — the
`Save N marks` item, which needed nothing added to the app to be observable.
(The menu's agent item is gated on `canWrite` and is absent in the walk's
no-database preview, which is why the slice's read-back is the attachment and
this one's is the download; both are `captureMarks` over the same cell rects.)
The walk's console-error rule covers it, including the injected-error self-test.
The two cases together took 35 seconds on this repository's own machine, 5 of
them the drag.

**`src/components/editor/CanvasAnnotationLayer.tsx`'s split is unblocked.**

## Amended 2026-09-14: the hold is lifted

With annotation drag covered above, an agent session covered in the
amendment before it, and cell edit with its revert covered since the first
amendment, each of the three held components has the CI slice this record
asked for. The hold on the three splits is lifted: any of them may now be
split, and its slice is the instrument that says whether the split moved the
behaviour. The ordering claim this record made stands — the instrument came
before the surgery — and the slices stay as the exit condition for any future
hold of the same shape.

## Amended 2026-09-14: the annotation layer is split, and the slice held

The first of the three surgeries this record held back has happened.
`src/components/editor/CanvasAnnotationLayer.tsx` went from 2229 lines to 943,
and what is left in it is the thing the file is named for: the pointer, drag,
resize and selection machine, the draft types it is written in, and the
composition that hands each annotation to the node that draws it. It holds no
style bar, no node component and no geometry helper.

What came out, and where it went. A split module sits beside the file it came
out of, which is how this tree names one; the single exception is the focus
hook, which goes to `src/hooks/` with the rest of them:

| out of the layer | into |
|---|---|
| the chrome anchor, the camera un-projection, the live layer scale, the pen path builder | `canvasAnnotationGeometry.ts` |
| the textarea focus hook | `src/hooks/useFocusTextarea.ts` |
| the colour and stroke-weight pickers | `CanvasAnnotationSwatches.tsx` |
| the four corner grips | `CanvasAnnotationResizeHandles.tsx` |
| the plate, rule and tooltip the bars share | `CanvasAnnotationBarChrome.tsx`, over `canvasAnnotationChromeStyles.ts` |
| the three style bars | `AnnotationShapeStyleBar.tsx`, `AnnotationStickyStyleBar.tsx`, `AnnotationTextStyleBar.tsx` |
| the three annotation nodes | `ShapeAnnotationNode.tsx`, `StickyAnnotationNode.tsx`, `TextAnnotationNode.tsx` |
| what passes between the layer and a node | `canvasAnnotationNodeProps.ts` |

The interface between the layer and a node is `MovableProps`, which was
already the interface — `movableFor` mints one per mark and a node reads
nothing else — so the split wrote it down rather than invented it. No new prop
reaches the layer from outside: `ZoomPanViewport` still passes `zoom` and
nothing more.

**The instrument did its job, which is the part this record exists for.** The
slice and the browser drag case were run before the first move — 3 tests
green, 1 browser case green — and after every move since, on the same
assertions, with no assertion edited anywhere in the suite. One guard did go
red, and it was the right one: `tokenDiscipline.test.ts` refuses an exemption that no longer
matches an offender, so moving the line-style preview swatch out of the layer
made the layer's var-ramp exemption stale within the same commit that moved
it. That is a check noticing a file moved, which is what a path-pinned
exemption is for.

Two components remained at that point, each with its own slice: the cell
panel, whose split is the amendment below, and the agent panel.

## Amended 2026-09-14: the cell panel is split, and its slice says nothing moved

The second of the three splits this record held is done.
`src/components/blueprint/BlueprintCellDetailPanel.tsx` went from 1481 lines
to 553, and its body — one function from line 223 to the end — is nine
modules beside it: the facts a cell is read from (`cellDetailFacts.ts`), the
overview and its readings, the tab row, the breadcrumb, the three sibling
surfaces the drawer can show instead of a cell, the surface switcher, and the
panel's agent commands. What stayed is the drawer: which surface, how wide,
what closes it, and the footer the one save portals into.

**Nothing moved with it, and the slice is why anybody can say so.** `npm run
slice:cell-edit` was run before the first move and after every one of them,
green each time and with no assertion edited — which is the whole point of a
pure refactor having an instrument: the test had no way to notice, because
there was nothing to notice. The same holds for the 285 tests over
`src/components/blueprint` and for the suite as a whole. The PostgREST form
was not run here: no machine in this estate carries a PostgREST binary and
this work downloaded none, so `npm run slice:cell-edit:postgrest` is CI's
proof, exactly as the amendment above anticipated.

*Amended again 2026-09-14 (#791): the facts that split fell out as one module
handing every reader the same sixteen keys are now one resolution of the
selected cell — the path's board found once rather than in seven derivations —
with three narrow readings hung off it, one per reader, each taking that
resolution and nothing else, each naming only what its reader reads, and each
read by a unit test through that interface.*

*Amended again 2026-09-14 (#792): the four surfaces the split left each wore
their own copy of the drawer header — the close block five times over,
counting the shared header's, the header's class list four times, and the
crumb loop twice. All of it is `PanelHeader` now, which learned a crumb that
collapses to an ellipsis so the cell's trail is the trail the other five
panels draw. The slice was green before the first move and after every one of
them, with no assertion edited in it or in the 301 tests over
`src/components/blueprint`; each surface's rendered class, `aria-` and `data-`
set was hashed before and after and matches, with two exceptions recorded
plainly. The cell's trail gains `font-normal` on its list and `shrink-0` on
its first separator — two utilities the entity panels' trail already wrote and
this copy had drifted without, each a no-op where it lands. And an empty trail
draws no breadcrumb landmark at all, which is a change to the service panel
and to four loading states rather than to any cell surface. The one guard that
moved is `panelText.test.ts`, a per-file inventory of literal class lists: two
files stopped writing the panel title because one place writes it now.*

**What the split is NOT is a redesign.** No class, no `data-` attribute, no
aria label and no test id changed; the one save still writes the same columns
in the same shape; every section that derived its fields from
`src/lib/cellFields.ts` still derives them from there, through the same
`CellPanelEditor` it always did. The interfaces between the new modules are
the cell's facts, the selection, and the callbacks the panel owns — no module
takes a prop from outside the panel that the panel did not already hold.

**`src/components/editor/AgentPanel.tsx` was the one still to do** at that
point; its split is the amendment below.

## Amended 2026-09-14: the agent panel is split, and the slice held

The third of the three splits this record held is done, and with it every
component this record named.

**`src/components/editor/AgentPanel.tsx` — split 2026-09-14.** 1462 lines and
twelve `useState` calls became 60 lines and none (the table at the top of this
record says 13, which is what a grep for the word returns: it counts the import
too): the panel file now holds the
session state machine and the composition (which session is open, the
persistence it attaches, the choice between the two views) and no view, row or
dialog at all. The sessions list with its row and its ledger count, the chat
view with its composer, the transcript's rows and its fold, the rule that
decides which rows fold, the two session dialogs and the ⚙ rail button are
modules under `src/components/editor/agent/`, none larger than the chat view's
647 lines. What crosses each new seam is what the code already
passed around — a session or the list of them, the transcript's events, a
callback — and no prop was invented; no persisted row shape moved, and no
class, test id or aria attribute changed.

The instrument said so: `npm run slice:agent-session` was run before the first
move and after every one of them, and it passes with no assertion edited —
including the read-back from `agent_messages` after the panel is closed and
reopened, which is the assertion a split that dropped a write would fail. The
harness smoke is unchanged at 13/13. What did have to change is the three
guards that read the panel BY PATH — the monospace roster and the editor-shell
type ladder — and that is worth stating as the cost of a split rather than a
defect: a guard that names a file names it again after the file divides, and
the shell ladder's batch had to learn to read one folder down or it would have
stopped asserting anything about this surface at all.

## Amended 2026-09-14: the annotation split's six near-copies are three modules

The annotation amendment above records what the layer's split produced, and
the table in it names six files that no longer exist: the three style bars
were near-copies of one another — the sticky bar was 145 of its 182 lines
shared with the text bar — and the three marks shared their pointer handler,
their double-click and their root box to the line. They are one bar
(`AnnotationStyleBar.tsx`), one mark (`AnnotationMarkNode.tsx`) and a table of
what each kind of mark declares (`canvasAnnotationKinds.ts`), and the text
mark's two width floors — 80 in the layer, 120 in the mark — are one constant
with one reader, settled at the one the screen already drew.

**The same instrument held, which is why this belongs in this record rather
than beside it.** `npm run slice:annotation-drag` and the browser drag case
were run before the first move and after every one, green each time with no
assertion edited — and the browser case specifically after the pointer handler
moved, because a real pointer capture is the thing jsdom cannot take. The
rendered class, `data-` attribute, aria and accessible-name sets are identical
string for string for every kind of mark in every state, checked by dumping
the DOM of all six surfaces before the first move and diffing it after each.

One guard went red and was right to: `tokenDiscipline.test.ts` pins its
var-ramp exemption by path, and the line-style preview swatch moved file. That
is the second time this record has had to say so, which is the argument for
path-pinned exemptions rather than against them.

What this does NOT do is finish the job for the mark. The bar is tested
through the table; `AnnotationMarkNode.tsx` is still reached only through the
slice and the browser case, and a test through its own interface is owed.

## Amended 2026-09-14: the agent split's three stores are one session module

The agent amendment above records a panel that came out at 60 lines holding
"the session state machine and the composition". The first half of that was
not true. What the panel held was the composition; the state machine was three
module stores the views wrote from below — `panelState.ts` (which session is
open, and the per-session draft), `sessions.ts` (the list), and
`attachments.ts` (the one pending attachment) — so the panel's five props
described a seam that three files crossed behind it. The chat view set and
took the attachment itself, the two dialogs renamed and deleted against the
sessions store, and deleting the open session reached the panel not at all: it
fell through a `?? null` in a component that had no way to know a session had
gone.

They are one module. `src/lib/agent/sessions.ts` holds the four facts about
one thing — the list, which one is open, what you were typing in it, and what
is waiting to go with the next message — behind one interface, and the panel,
the two views and the two dialogs read it and no other store about a session.
Deleting the open session closes it, inside the module, and takes that
session's draft with it; the panel reads the open **session** rather than an
id it would have to resolve against a list. The dialogs read no store at all:
each reports its verb — `onRename(id, title)`, `onDelete(id)` — and the caller
performs it, so the store has two writers where it had four.

**What the instrument could and could not say, stated plainly.** `npm run
slice:agent-session` was green before the first move and after every one of
them, with no assertion edited — what changed in that file is the import line
for the module that moved and the two teardown calls that closed the session
through it. But the slice never renames and never deletes, so the two verbs
the dialogs call had no cover at all, and moving the code holding them under
that instrument alone would have been the thing this record exists to refuse.
So the net landed first, in its own commit:
`src/lib/agent/sessions.test.ts` reads the module through its own interface —
what the list holds after a rename and after a delete, what localStorage
holds, the order a rename must not disturb, the id that is not there, the
auto-name that never overwrites a deliberate one — and it was watched go red
five ways on a delete that writes the list back unchanged. The open-session
rule has its own case, and that one had to be written twice: asserted only
through `useOpenAgentSession` it held nothing, because a hook that resolves an
id against the list reads `null` whether the rule is there or not. It asserts
the id, through `openAgentSessionId()`, and goes red with the rule removed.

**Nothing visible moved, and it was measured rather than asserted.** The
rendered class, `aria-` and `data-` attribute sets of all four touched views
were dumped across seven states — the sessions list, the empty list, the list
filtering, the chat, the chat with its slash menu open, and each dialog — and
hashed on `origin/main` and on the branch, with React's per-render ids
normalized out. All seven match, string for string. No class, `data-`
attribute, aria label or test id is in the diff.

**Two things were deliberately left alone.** Persistence stays where it is:
`attachAgentPersistence`, `hydrateAgentSessions` and the write-through are
untouched, no persisted row shape moved, and folding them in would have cost
something rather than nothing. And `useAgentChangeCount` with `ChangeCount`
stay: the deletion test says the complexity does not vanish but doubles —
removing them copies the ledger count's icon, its title and its pluralized
screen-reader text into both call sites, and unpins the path
`src/lib/monoRegisters.ts` names as the one place that writes that face.

## Amended 2026-09-18: the phone's agent flow is covered, unnamed

**The phone agent jump — covered.** `src/slices/phoneAgentJump.slice.test.tsx`
drives the real `MobileShell` at 375×812 from the cover through to an
agent-driven camera move: the reader taps off the cover into the first
scenario, opens the ✦ sheet, and the agent jumps the camera to another
scenario and then to another phase through the real `open_scenario` and
`open_phase` definitions — the same `dispatchTool` call the loop makes, so the
sentence the slice compares is the sentence a model reads. Four things are
asserted, and each is what a reader would see or what the tool would answer:
the sheet stays up across the jump, the height it occludes reaches the camera
as a fit inset, the selection comes back in the words `waitForNavigation`
matches, and the caret returns to the composer once the camera settles. A
fifth case jumps to a phase whose first scenario is already on screen, where
the shell's keying remounts nothing and the camera has to answer off the
destination key rather than off its own mount. Every timer is faked and turned
by hand, for the reason the annotation-drag slice fakes its frames: the
choreography is a race between a 200 ms fade, the fit, the tool's 1800 ms
deadline and the caret watcher's 2000 ms one, and a test that let the wall
clock order them would go red for machine load rather than for code. CI runs
it as `npm run slice:phone-agent-jump` (and inside `npm test`).

**And the browser half, at the same width.**
`render-walk/mobile-agent-jump.spec.ts` runs the same flow over the built
distribution in the phone project of the render walk, with the provider
endpoint intercepted and answered with one canned round — a `tool_use` for
`open_scenario` naming a scenario read off the drawer, then a text turn — so
everything after the response body is the shipped loop, tools, bridge, shell
and viewport. It answers the three claims jsdom cannot: the transcript carries
the tool's SETTLED sentence rather than its timeout one, which is the 1800 ms
deadline measured on a real clock; the destination artboard reaches into the
strip the sheet leaves with legible cells wholly inside it; and the scrim over
that strip carries no blur and is a minority of the colour. It screenshots the
landed jump, which is the half a person reads. It landed in the same change as
the slice, the way the annotation-drag pair did.

**This component was never named here, and the slice is not owed to a rule.**
`MobileShell.tsx` is not one of the three this record held, so nothing formally
blocked a split of it. What happened instead is that the risk this record was
written about came true on that surface twice in one batch — the sheet closing
on an agent-driven jump, which took the conversation away mid-run, and a
missing phase line that made every landed phone phase jump answer "the selected
phase was not verified" — and neither was reachable from what the phone had:
a cover spec in the render walk, a unit test that drives the agent's hands with
no shell around them, and two guards that read the shell's own source text.
Both defects are now red cases in the slice, each injected for that case only
at a seam the flow routes through rather than by editing the shell, and each
has been watched fail the assertions the green case makes.

What stands in for the canvas is `ServiceOverviewView`, for the reason the
annotation-drag slice stubs its board: jsdom lays nothing out, so the real
viewport has no rectangle to fit to and no verdict to publish. The stand-in
reads the same fit inset the shell hands the real board, ARMS on the same key
the real one arms on (`cameraOutcomeKey`, from `cameraTargetId`) rather than
once per mount, and publishes through the shipped
`publishCanvasNavigationOutcome`. Arming on the key is what lets the slice see
a jump the board does not remount for. The sheet's own height is stamped for
the same reason a stub board is: a zero inset would let the "lands above the
sheet" assertion pass on a shell that had thrown the inset away. Mocked
besides: the Supabase provider, for the single `canAgent` the ✦ affordances
hang off, and the viewport probe jsdom has no `matchMedia` for.

**What neither of them covers.** No frames run in the slice and its clock only
moves when the test moves it, so the order and the choreography are its claim
and the duration is not — the browser case above holds that half. What is
still owed by both: the phone gestures around the sheet (a drag on the strip,
a swipe to dismiss mid-flight), a jump on a device slow enough to miss the
deadline, and anything a real network does to the loop. None of those is this
flow's risk record; they are named here so the next reader does not take the
pair for more than it is.

**Three source-text claims went with them, and two stayed.**
`mobileAgentSurface.test.ts`'s phase line is driven now and required to go red;
so are two of the three claims in `mobileCoverLanding.test.ts` — the cover as
the landing screen with the drawer shut, and the phone's cover CTA opening the
first scenario through the shared seam — which the slice's first three taps
drive. Two guards stay, each saying why in its own file. The scrim's, because
its subject is a class string on a portal and what a compositor does with it.
And the landing view's, because the claim is that `landing` is not DERIVED from
an empty selection: the slice never reaches a both-null selection after the
cover — every way off it selects something and nothing in the flow deselects —
so no run of the shell can tell the cover from the empty state, and the shape
of the expression is the only place that claim lives.

**Nothing was blocked here, and nothing is unblocked by this.**
`src/components/mobile/MobileShell.tsx` was never one of the three components
this record held; the slice is coverage the surface earned, not an exit
condition it met. In particular it does NOT license a split of the shell's
last viewed path (`src/lib/mobilePathMemory.ts`): the flow above never selects
a path, never asserts the `Reading path:` line, and runs with an empty storage
namespace, so the only branch it executes is the absent-memory default and it
asserts nothing about even that. That split wants its own pins, and its own
flow driven end to end, on the terms the first paragraph of this record sets.
