---
'uno-blueprint': minor
---

A release tag publishes the initialiser

Pushing a `v<version>` tag now publishes `create-uno-blueprint` to npm at that
version, with provenance. A new workflow, `publish-initialiser.yml`, does it
through npm's trusted publishing: the registry trusts this repository and that
workflow file by name, so no npm token is stored anywhere.

The workflow asks `scripts/decide-initialiser-publish.mjs` before it publishes.
It refuses a tag that is not the version the initialiser states, a tree whose
version statements disagree, a tag on a commit that is not on `main`, and an
npm too old to publish without a token. A version the registry already has is
left alone and the run is green, so re-running a tag's run is safe. A
workspace, a fork, or a repository made from the template carries the workflow
and is not where the package comes from, so there it does nothing.

The package now ships a README and a LICENSE, and its manifest states
`publishConfig.access`, `bugs` and a `homepage` that opens the README.

The first publish and the trusted publisher are the owner's to do, once, and
`docs/engineering/releasing.md` § 6 lists the steps. Until they are done the
package is not on npm and the workflow's publish step fails.
