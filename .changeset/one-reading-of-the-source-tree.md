---
'agentic-service-blueprinting': patch
---

One module reads the source tree, and the guards ask it questions

Fifty-two test modules opened this tree with `readFileSync` and a path they
built themselves — `resolve(__dirname, '..', 'components/editor/Foo.tsx')`,
`join(process.cwd(), 'src/App.tsx')`, `new URL('../styles/blueprint.css',
import.meta.url)`. Each spelling is a second opinion about where the
application is, written down where the tree cannot see it, so a file that moved
edited the guards instead of being caught by them: the agent panel split had to
change three of them, and the move was right every time — the guards were
naming an address that no longer existed.

`src/lib/sourceTree.ts` is the one answer to where the application is and what
is in it. It asks `scripts/sweep.mjs` for the `app` subject once — the
deployment's `src` laid over the package's, per path, the overlay the build
applies — and answers by SURFACE: the paths and files of a named region
(`editor`, `ui`, `styles`, `lib`, `app` for all of it), the text or bytes of
one file addressed relative to `src`, and which surface a path is on. A guard
names a file or a surface; it never names a root again.

The refusal is the point. A guard that opens a path itself gets `ENOENT` and a
path, which says the guard is broken and nothing about the tree. The reading
has the whole listing in hand, so it says the useful thing instead: this path is
not there, a file of that name is at THIS path now, and the surface it swept
held this many files. `src/lib/sourceTree.test.ts` proves it over a scratch
tree — a file is moved between two surfaces, and the reading reports it at its
new path while the old one raises a refusal naming where it went.

`tokenModel`'s two walks and `classList`'s sampling fold into it: the model
keeps the parsing — what a declaration is, what the cascade says, who consumes
a name — and takes its stylesheets and its source from the reading, and
`classLists()` now takes a surface, resolving named class-list constants across
the whole application whichever surface the sites come from. Both enumerations
in `tokenDiscipline` still agree in both directions, and the second one is still
independent: it decides for itself what a source file is, so the model cannot
mark its own homework.

Every guard under `src/lib` that read the application with a relative path now
asks the reading — twenty-seven modules, every assertion unchanged. Nothing
runs at runtime that did not run before: the reading, the model and the class
reader are test-time modules with no importer the bundle can reach.

Two things are deliberately left where they are. `overviewFlowArrowAnchor` reads
`ServiceOverviewView.tsx` to assert about behaviour rather than about text, and
belongs with the contract half of this pair rather than with a file-reading
seam. And eight guards under `src/lib` read something that is not the
application — the migrations, the published references, the generated schema,
an installed package — which are other subjects of the same sweep and are asked
for directly.

**Eighteen direct readers remain outside `src/lib`**, in `src/`,
`src/components/` and `src/styles/`. That is the contract half's starting line.
