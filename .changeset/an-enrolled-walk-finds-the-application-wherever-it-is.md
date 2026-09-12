---
'agentic-service-blueprinting': patch
---

**A check that walks the application finds it wherever the application is, and
refuses a walk that finds nothing.** Two checks a deployment holds
byte-identical and RUNS — `scripts/tests/one-badge-one-size.test.mjs` and
`scripts/tests/authoring-log.test.mjs` — reached their subject through a
literal `src`: one walked `<repo>/src` for badge call sites, the other imported
the client's skip set as `../../src/lib/authoringLog.ts`. A deployment that has
stopped keeping a copy of the application and reads it out of the package has
no `src`, so the first swept an empty tree and passed and the second could not
load the suite at all. Neither file had drifted, so neither could be unenrolled:
the file is shared, and the fix belongs where it is written.

Where the application is was already decided — `vite.config.ts` takes the first
of `./src` and the package's `src` that exists — and the checks could not ask.
`scripts/app-source.mjs` states that pair for them, and the walk now starts
where the build aliases `@/…`. The seam that only needed one module reaches it
through `@/` instead, and lets the alias settle it; its SQL half stays a plain
path, because two repositories running this application apply their own
migrations.

The pair is now written down four times — the bundler's config, the two
tsconfigs, this module — and that is forced rather than sloppy. A compiler
cannot import a module, and the config is bundled in isolation in a tree whose
`scripts/` is the deployment's own, so a config that imports this module is a
config that does not load; the shipped deployment test refused exactly that when
it was tried. `scripts/tests/the-build-and-a-walk-find-one-root.test.mjs` holds
the four equal instead, the way the rename map's two lists are held, and goes
red on the first edit that moves one of them.

**A walk that finds nothing now fails.** An empty subject and a clean one print
the same green line, and the green one keeps printing: the run that should have
caught the defect looks exactly like the run before it. So the badge walk throws
when no `.tsx` is under the root it swept, and again when the files it found do
not include `ui/badge.tsx` — files are not the application. `archivingFunctionsIn`
refuses a directory with no `.sql` in it, and the seam asserts both halves are
non-empty before comparing them, because an empty skip set agrees perfectly with
an empty sweep.

This repository's results are unchanged: the same 212 files in the same order,
the same six archiving functions, the same verdicts.

The same assumption was swept for. Of the five scripts a deployment currently
enrols, the other three hold no walk — one is a list, one is pure and already
takes its subject from its caller, one takes a directory as an argument. Beyond
the enrolled set, thirty-six scripts and suites here still reach the application
through a literal `src`; none of them is enrolled, all of them run only in this
repository today, and the resolver is now there for each as it is adopted. Six
more are legitimately about this repository alone — the generators that WRITE
into this tree's `src/data`, the sync that vendors this tree's skills, and the
sweeps whose subject is this repository's own tracked files.
