---
'agentic-service-blueprinting': patch
---

Every guard of the application asks the reading, and the anchor guard renders

The expand half put `src/lib/sourceTree.ts` in place and moved the guards under
`src/lib` onto it. This is the contract: the eighteen test modules that still
opened the application with `readFileSync` and a path they built themselves —
`resolve(dirname(fileURLToPath(import.meta.url)), '../..')`,
`join(process.cwd(), 'src/components/editor/SliceSlideComposer.tsx')`,
`new URL('./bootstrap.ts', import.meta.url)` — now name a file or a surface and
let the reading say where it is. **Direct readers under `src/`: 27 before, 9
after.**

No guard of the application pins its own root any more. The per-guard path
helpers are deleted with the paths: `rawSource` in the slice/presentation and
canvas panel ladders, the local `sourceOf` in the editor shell ladder, `src` in
the panel loading contract, and the four hand-written tree walks — `citations`,
`deploymentOwnedContent` (three of them), `definitionCard`, `labelVocabulary` —
which are now the reading's own listing. The stakeholder reader keeps a `read`,
but it is a surface prefix over `sourceOf` rather than a root of its own.
`definitionCard`'s walk had its own comment stripper; it takes the reading's
stripped sample, so it and every other text rule are handed one text of a file
rather than two.

Deleting the two `rawSource`es left `uncommentedLeading` written twice, byte
for byte — the copies had been kept apart only by each closing over its own
reader. It moves to `lib/classList.ts`, beside the other reading of a class
list, and both ladders ask it. `aliasVocabulary` came in with them: it asked
`readdirSync` of a `../styles` it resolved itself whether `compat.css` was
gone, and asks `hasSource('styles/compat.css')` instead — a question that
survives the stylesheet surface moving, and one the `readFileSync` count could
never have caught.

The nine that remain read something that is **not** the application, which is
the line the reading draws: `lib/agent/tools/references` and
`lib/agent/tools/serviceScope` (the generated rulebook and adapter),
`lib/authoringErrors` (the generated schema SQL), `lib/backend/schemaVersion`
(the published IR schema and a migration), `lib/cellResources` and
`lib/storageKeyPolicies` (migrations), `lib/panelSheetSnapContract` and
`lib/tailwindColorReset` (installed packages), and `deploymentRoot`, whose
subjects are the scratch trees it stages, the `dist` it builds and the authored
figures under `docs/`. `deploymentRoot`'s two reads that WERE of this
application — the class names the markup writes, and the residents the package
must hold at the same paths — moved onto the reading; the rest stay.

`overviewFlowArrowAnchor` no longer reads `ServiceOverviewView.tsx` and counts
its call arguments. It renders the board inside the application's own provider
tree with a loaded nav whose first phase is not the sample's, and asserts the
anchor attribute lands on the phase the reader is looking at. That is the
defect it was written for, observed instead of inferred: point the call at the
sample and the assertion fails on the phase id, where the text version could
only fail on a spelling.

Three guards changed what they REPORT, and all three toward the one spelling:
an offender is stated relative to `src`. `vendoredDivergence` names
`components/ui/foo.tsx` where it named `ui/foo.tsx`, `labelVocabulary` names
`components/blueprint/Foo.tsx` where it named `blueprint/Foo.tsx`, and
`definitionCard` names `components/…` where it named `src/components/…`.
`citations` already spelled its findings that way and is unchanged.

Two guards changed what they SWEEP, and neither narrows.
`deploymentOwnedContent`'s content roster reads the `content` and `data`
surfaces rather than each directory's top level, so a module added in a
subfolder is in scope on the day it appears; neither directory has one today.
`labelVocabulary` already recursed — what changed is the reach of its
exemption: it skipped ANY directory named `ui` at any depth and now skips the
`ui` surface, which is `components/ui`. No difference today, because there is
no nested `ui`, and the surface is the thing the component CLI actually owns.

And `definitionCard`'s walk used to skip a file that vanished between the
listing and the read; the reading refuses instead, which is the rule the expand
half stated — a sample that quietly lost a file passes every rule over it.

No sample was narrowed: every converted guard measures the same tree as the
walk it replaced. One assertion is replaced rather than kept — the anchor
guard's count of `ServiceOverviewView.tsx`'s call arguments, which stood in for
the behaviour the render now observes directly. There is one call site, and the
render fails on it. Nothing runs at runtime that did
not run before: the reading is a test-time module with no importer the bundle
can reach, and the built chunk is byte-identical to the build at the base
commit.
