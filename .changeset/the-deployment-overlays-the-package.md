---
'agentic-service-blueprinting': patch
---

**A deployment's `src` overlays the package's per path.** The build's `@` alias
used to point at one root — the first of `./src` and the installed package's
`src` that existed — so a deployment's `src` was all or nothing: one file there
captured every `@/…` import and resolved none of the rest. `scripts/overlay.mjs`
is the rule now, exported as `agentic-service-blueprinting/overlay`: the pure
`resolveOverlaid` answers with the first layer that holds a path, and
`overlayPlugin` applies the same rule in Vite ahead of its own resolver. When
the package is installed the package is the application and `src` is the
overlay, which is what TypeScript's two-root `paths` list already resolved per
module; when it is not — this repository — nothing is loaded and the build is
unchanged. A deployment can now delete a file the moment it matches the
package's, and the files it still holds are its residents.
