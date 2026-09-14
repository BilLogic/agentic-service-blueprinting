---
summary: Three components were long enough to be worth splitting and were deliberately not split until the tests that would catch a split going wrong existed — the hold had an exit condition, not an excuse, and it has now been met: all three flows have CI slices, and the cell detail panel is split.
---

# 17. Large component splits wait for an end-to-end round

**Status** Accepted — 2026-08-26. Moved into this repository from
BilLogic/plus-uno-blueprint ADR 0008 on 2026-09-10 (#551); the number
here is this repository's. Amended 2026-09-13 (#699): the exit condition is
per flow — each held component's flow has a CI slice, and each slice unblocks
that component's split — and the cell-edit flow is covered; see the end.
Amended again 2026-09-14 (#747): the annotation-drag flow is covered too — as a
jsdom slice and as a browser case in the render walk — and the annotation
layer's split is unblocked; see the end.
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

**What the split is NOT is a redesign.** No class, no `data-` attribute, no
aria label and no test id changed; the one save still writes the same columns
in the same shape; every section that derived its fields from
`src/lib/cellFields.ts` still derives them from there, through the same
`CellPanelEditor` it always did. The interfaces between the new modules are
the cell's facts, the selection, and the callbacks the panel owns — no module
takes a prop from outside the panel that the panel did not already hold.

**`src/components/editor/AgentPanel.tsx` is the one still to do**, with its
own slice standing ready as the instrument.
