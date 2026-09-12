---
'agentic-service-blueprinting': minor
---

**The cover's model diagrams arrive with the package.** A deployment that reads
the application out of this package renders all thirteen of them without
copying a file, running a step, or touching its build configuration.

They did not before. The cover named them as served paths — `/cover/why-now.svg`
— and a served path is served by whichever tree holds that file in its public
directory. This repository's own build step puts them in this one; a deployment
runs no step of this repository's, so every one of those requests fell through
to the single-page fallback and came back **200 with `text/html`**: a
broken-image box on the page, a success in the network tab, and nothing
anywhere able to fail.

**What you now get for free.** `packageCoverFigures` is exported from the
package root and holds the thirteen diagrams as finished `CoverFigure` values —
source, alt text and `viewBox` dimensions. Place one whole on any section that
takes a figure:

```ts
import { packageCoverFigures } from 'agentic-service-blueprinting'

{
  kind: 'prose',
  id: 'overview-why',
  heading: 'Why a blueprint that stays true',
  paragraphs: ['…'],
  figure: packageCoverFigures.whyNow,
}
```

They are `whyNow`, `whenToUse`, `fourWaysIn`, `dataModelHierarchy`,
`blueprintAnatomy`, `cellAnatomy`, `sliceConcept`, `slicingModel`,
`skillArchitecture`, `sbMap`, `sbAudit`, `sbWhatif` and `sbSlice`. Each is a
module import rather than a path, so the bundler carries it into whatever you
build, wherever this package sits in your tree — linked, hoisted, or nested
under another dependency.

**What you override, and how.** A figure is a value, so there is nothing to
fork. Replace one outright by writing your own where the package's would have
gone:

```ts
figure: { src: '/cover/our-own.svg', alt: 'What ours shows', width: 880, height: 376 }
```

or keep the drawing and change one field:

```ts
figure: { ...packageCoverFigures.cellAnatomy, alt: 'Our words for it' }
```

Figures of your own are unchanged and always were: name a path your deployment
serves out of its own public directory, or import one out of your own source
the way this package now imports its. Nothing is copied out of this package's
public directory, and nothing here reaches into yours.

**The contract this replaces.** v1.41.0 said every figure and portrait `src` is
a path the deployment serves itself. That is now half the rule. It is split by
who drew the picture — the package serves the diagrams of the blueprint model
it authors, you serve everything you author, and you may replace any of the
package's — and it is stated on `DeploymentConfig.cover` and on `CoverFigure`,
the two declarations you write against, rather than in a release note alone.

**Nothing else changed.** This repository's dev server and build are as they
were: the same stylesheet byte for byte, the same `public/cover/` copy for the
bundled sample blueprint — whose storyboard frames are database values and can
only name a served path — and an entry bundle that differs only in the figure
table it carries.

`src/deploymentRoot.test.ts` is where this stays fixed. It stages a deployment
with the package **installed by copy, never symlinked** — a link is realpathed
before anything decides where a file lives — then fetches every figure the
cover renders, at the URL the deployment's own modules ask for, from a dev
server and again out of a build. A response that is not image bytes is a
failure, so a request answered by a page of HTML fails a check now instead of
waiting for somebody to notice a broken image.
