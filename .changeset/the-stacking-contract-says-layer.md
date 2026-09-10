---
'agentic-service-blueprinting': patch
---

The stacking contract says layer where it means layer.

Two sentences in `src/lib/canvasStackingContract.test.ts` were carried over by
the `layers` → `lanes` word replacement while meaning the other word. Neither
is about a row of the board.

**The comment misquoted the code it documents.** The header recalls the
assertion the file used to make, and the quotation had been rewritten along
with everything else: it pinned `"lane === 'forward' ? 'z-0' : 'z-[30]'"` as
an exact substring. `IntegratedDependencyArrows.tsx` reads `layer`, and so
does the regex twenty lines below the comment, so the paragraph explaining why
the exact-substring pin was dropped named an identifier that has never
existed. The `z-[30]` inside it is left alone — the arbitrary spelling is the
whole point of that paragraph, and it is quoting history, not the current
source.

**The test title named the wrong noun.** `contains canvas-local lanes in one
stacking context` is about `isolate` and the z bands above it. It reads
`layers` again.

Both spellings are what the file held before the rename, so this restores
rather than decides.

**The guard says what it could not see.**
`scripts/tests/a-lane-is-not-a-layer.test.mjs` already keeps a section for its
own limits, and these are two shapes that belong in it: an identifier quoted
inside a comment, where `tsc` cannot do the sweep the guard's patterns lean on
it for, and a test title whose layer word sits after the noun rather than
before it. Neither was widened for. The first would mean listing
`lane === 'forward'`, which that header argues against and a test still
asserts finds nothing; the second would mean reading the whole line, which
would fire on the true sentences in `EditorShell` and `ScenarioBlueprintPanel`
that put a lane rail and stacking slots in one breath.

**Why it shipped here.** The file is on a deployment's reconciled allowlist,
which promises byte-identity with this kit's copy, so the fix comes upstream
and returns with a pin bump rather than being applied downstream.
