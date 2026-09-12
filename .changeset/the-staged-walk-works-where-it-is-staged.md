---
'agentic-service-blueprinting': patch
---

**The test that proves an enrolled walk works in a deployment now runs in
one.** `scripts/tests/one-badge-one-size.test.mjs` stages a throwaway tree with
no `src` and the application mounted under the name a deployment depends on it
by, then walks it and compares the result file for file. It staged that tree by
mounting the root the suite was RUN from — which is the application's own
directory in a repository that keeps a copy of it, and is a directory with no
application in it anywhere else. So in a deployment the staged tree had a `src`
in neither root, `appSourceRoot` refused it as it should, and the test failed:
it asserted its own premise in every repository where the premise is false, and
only there. A test that passes only where its subject does not exist is worse
than no test, because the green line reads as coverage.

It now mounts the application's own root's parent — the directory that IS the
package, whichever of the two roots holds the application — so the staged tree
has an application in it either way. The link stays a link rather than becoming
a copy: the subject has to be the real application or the comparison is between
two snapshots of one walk, and this walk is `readdirSync` and `statSync`, which
follow a link. Where linking is not safe, the shipped deployment test installs
instead and says why it does.

And the premise is asserted rather than assumed: the staged tree is checked to
have no `src` of its own before anything resolves against it, because a tree
that turned out to have one would resolve to that and satisfy the comparison
without either side having come out of a package.

This repository's result is unchanged — the same 213 files, in the same order,
the same five discovered wrappers, the same empty verdict — because the root
this staging now mounts and the root it used to mount are one directory here.
