---
'agentic-service-blueprinting': patch
---

The ledger sees every write, and a guard says so

The session ledger is the app's only undo, and it is only as complete as the
writes that reach it. Every table write is supposed to go through a
`src/lib/*Mutations` module, where the inverse is captured before the write and
the change is recorded after it. Nothing checked that, and two writers were
outside it.

`SliceStoryboardField` set and cleared `slides.illustration` with a bare
`.from('slides').update().eq('id', …)`. Replacing a slide image destroyed the
previous picture with no record that it had existed and no revert control; and
because `.update().eq()` without `.select()` returns `error: null` when zero
rows match, clearing the image on a slide that had been merged away reported
success and cleared nothing.

`agent/tools/registry.ts` wrote `audit_findings` the same way, from inside the
tool dispatcher, which is where the omission was hardest to see: the writes
were made by a machine, in a batch, on rows a person had often already read and
triaged. An audit run could rewrite a triaged finding's severity and summary
and leave nothing in the change list saying it had. Worse, undo takes the
newest entry that captured an inverse — so with the findings writes absent from
that list, a press after an audit run reached past them and took back the
person's own last edit instead, silently.

`src/lib/writeBoundaryContract.test.ts` is the rule as a mechanism. **It walks
`src/`, not a list of named roots**, because a list of roots can only ever
cover the directories that existed the day it was written, and one of the two
writers above sat three levels down inside `lib/`. Everything outside the
`*Mutations` family is named one by one with the reason it is outside, and each
name is asserted to exist, so a rename fails loudly instead of quietly widening
the exemption to nothing. Two exemptions: the ledger's own inverse-applier,
which cannot record a change because recording one is what it undoes, and the
agent transcript, which is not blueprint data, has no inverse to capture, and
is best-effort by design. Reads and storage calls are asserted not to trip it,
because both look like violations and are not — `client.storage.from(BUCKET)`
takes a bucket identifier rather than a quoted table name.

Both writers move behind the boundary. `setSlideIllustration` reads the
previous pointer and carries it as the inverse, so replacing an image is now
reversible, and writes with `.select()` so a zero-row write raises instead of
reporting success. Clearing still leaves the file in the bucket on purpose:
after a merge two slides can share a derived path, and deleting the object
would blank a slide nobody asked to change. `findingMutations` takes the dedupe
branch and both its writes together, because the branch *is* the write path —
"an open twin already exists" and "a person dismissed this" are the two answers
that decide whether anything is written at all. Its updates capture an inverse;
its insert deliberately does not, and that is a fact about the grants rather
than an omission, since delete on that table is revoked and never granted back.
The only ways to quieten a finding are resolved and dismissed, and neither is
an inverse — an undo that wrote dismissed would suppress that check on every
future run, invisibly.

The storyboard field now shows the mutation's own sentence when the row write
fails, and keeps the storage wording for a storage failure. Two different
failures reached one catch, and the generic apology was throwing away the only
message that said what to do next.
