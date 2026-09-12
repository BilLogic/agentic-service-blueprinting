---
'agentic-service-blueprinting': patch
---

**A deployment that reads the application out of this package can run its dev
server again.** Nothing changes for a repository that keeps the application in
`src`; `vite build` was never affected, on either side.

Vite pre-bundles what it resolves into `node_modules`, and once the application
IS a package, that is the application. The optimizer hands those files to
rolldown, which has never heard of Vite's `?raw` import form: the specifier
reaches it as a filename ending in four literal characters `?raw`, which names
no file. `role.md`, the four skill documents and the eighteen reference
documents all arrive that way, so the application failed to pre-bundle and the
page stayed blank. A production build has no pre-bundling step, which is why
every gate stayed green while the thing a developer does every day was broken.

`vite.config.ts` — one of the four build files a deployment holds byte-identical
to this repository's — now excludes the application from pre-bundling when, and
only when, it arrives as a package. The branch is taken by what is on disk, the
same way the file already chooses between the two application source roots, so
the same bytes still serve both kinds of repository.

Excluding it is not free, and the second half of the fix is what pays for it.
Vite discovers dependencies by crawling from an entry and refuses to register
one whose importer sits inside `node_modules` — correct for a dependency, wrong
for an application that lives there. So excluding the application also stops
everything the application imports from being pre-bundled, and the first
CommonJS-only package it reaches is served to the browser as CommonJS and throws
on a named export. `optimizeDeps.entries` therefore points the crawl at the
application's own files, which puts its dependencies back on the list; the
application's test files are held out, because a deployment installs the
package's dependencies and not its development ones, and a crawl that reads a
test file asks for a package that is not installed.

What you get on the dev server is what this repository gets from `src`: the
application served file by file instead of as one pre-bundled chunk. The guard
below walks 531 of them from the entry, and a browser asks for the same set on
a cold load, where a pre-bundled application would have been a handful of
chunks. The application's own third-party dependencies are still pre-bundled —
thirty-eight of them, against the thirty-seven this repository pre-bundles — so
the cost is bounded by the application itself and is paid once per cold start,
and in exchange the documents load and the package's source behaves like source.

`src/deploymentRoot.test.ts` now stages a deployment with the package
INSTALLED rather than symlinked — Vite resolves a link to its target before it
decides whether a file is in `node_modules`, so a linked package is never
pre-bundled and cannot show this — starts its dev server, walks the module graph
from the entry, and requires every document the application imports as text to
come back with its own bytes. The expected list is read off the application's
source, so a document added tomorrow is one the test then requires.
