---
'agentic-service-blueprinting': minor
---

A deployment brings its own landing page. `DeploymentConfig` takes a whole `cover`, and the editor shell reads it through the seam instead of importing this template's content module — so an installation that mounts this package rather than forking it lands on its own writing. Supplied, the cover is the deployment's entirely; omitted, the template's own renders exactly as it did, which is what standalone still does. The cover's `title` also becomes the wordmark's second fallback, after `content.workspaceTitle` and before `brand.name`: an installation that names its landing page has named its workspace and should not have to write the name twice.

The cover is replaced, never merged. Every string in this template's cover describes this template — its tabs, its guide links, its figures — so a deployment that set a title and inherited the rest would ship its own name over somebody else's page. There is also no field-by-field merge to define: the value is a tree of tabs holding sections holding figures, and merging it would need an identity for every array entry at every level. The type already refuses half a cover, because `lede`, `primaryCtaLabel`, `commandCopy`, `states` and `tabs` are all required.

`CoverContent` and the types under it are now exported from the package root, so a host can write its landing page as a typed module of its own. The renderers stay internal.

**Upgrading a deployment:** nothing changes for a deployment that supplies no cover — the template's own still renders. To supply one, write a content module against the exported type and name it on the config:

```ts
// src/content/coverContent.ts
import type { CoverContent } from 'agentic-service-blueprinting'

export const coverContent: CoverContent = {
  title: 'The workspace name shown on the cover and in app chrome',
  lede: 'One paragraph under the heading.',
  primaryCtaLabel: 'Open the blueprint',
  repoUrl: 'https://github.com/<owner>/<repo>', // optional; guide links are dropped without it
  commandCopy: { copyLabel: 'Copy', copiedLabel: 'Copied' },
  states: { noSlices: 'No slices in this workspace yet.' },
  tabs: [
    {
      value: 'overview',
      label: 'Overview',
      sections: [
        {
          kind: 'prose',
          id: 'overview-why',
          heading: 'Why this exists',
          paragraphs: ['Sections may also be `figure`, `defs`, `portrait` or `skill`.'],
          figure: {
            src: '/cover/why-now.svg', // served from this deployment's own public/
            alt: 'What the figure shows',
            width: 880,
            height: 376,
          },
        },
      ],
    },
  ],
}
```

```ts
// the module the host passes to <App config={…} />
import type { DeploymentConfig } from 'agentic-service-blueprinting'
import { coverContent } from './content/coverContent'

export const deploymentConfig: DeploymentConfig = {
  cover: coverContent,
}
```

The figure and portrait `src` values are paths this deployment serves itself; nothing is copied out of the template's `public/cover/`. A deployment that also wants its workspace called something other than its cover heading keeps saying so on `content.workspaceTitle`, which still wins.
