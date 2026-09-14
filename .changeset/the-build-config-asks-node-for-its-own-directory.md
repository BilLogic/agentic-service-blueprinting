---
'agentic-service-blueprinting': patch
---

**Every Vite command is quiet again.** `vite.config.ts` reached for
`__dirname` to name the three roots it resolves — this repository's `src`, the
package's `src` inside `node_modules`, and the deployment root — and Vite
answered each `npm run dev`, `npm run build` and `npm test` with a warning
that `configLoader: 'native'`, the loader planned to become the default, does
not support it. The file now asks for `import.meta.dirname`, which is the same
directory by another name and the one the native loader can give. Node has
carried it since 20.11 and this repository runs 22.

The file is one a deployment holds byte-identical, so the warning was not this
repository's alone: every deployment printed it too, and none of them could
have fixed it — editing the file there is the thing the reconciled set
forbids. It leaves here, in a release, and a deployment takes the quiet on its
next pin.

Nothing else in the tree had the same problem. The build configuration is the
only code Vite's config loader reads; the `fileURLToPath(import.meta.url)`
elsewhere is in plain Node scripts and in tests, which Node runs directly and
which the loader never sees.
