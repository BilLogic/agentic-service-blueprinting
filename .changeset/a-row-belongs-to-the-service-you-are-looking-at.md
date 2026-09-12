---
'agentic-service-blueprinting': patch
---

A new slice and a new phase now belong to the service the author is looking at. The sweep that followed the evidence fix found three write paths still resolving `findFirstServiceId` — the first service by `created_at`, whatever the URL said — and all three are wrong, for one reason each surface makes obvious:

- **Creating a slice** (`CreateSliceSheet`). The cells being sliced are picked off the active service's canvas, and `useSlices` reads the active service. A slice written against the first one could never be seen from the board it was made on.
- **The sidebar's new phase** (`SlideModeView`). It sits above the phase list, which `useServicePhases` scopes to the active service. The `+` added a phase to a board nobody was looking at.
- **A row menu's sibling phase** (`StructureRowMenu`). "New phase" on a phase row means a sibling of *that* row, and that row belongs to the service on screen.

None was deliberate. Each resolves `resolveActiveServiceId` now — the same throwing write-path resolver the evidence panel moved to — so an unresolvable slug refuses instead of falling back to a sibling. The two phase resolvers also key on the slug, so switching service re-resolves rather than leaving the previous service's id behind; the sidebar outlives a switch, so it used to.

**A deployment with two or more services may already have slices or phases attached to the wrong one.** Nothing in the UI revealed it: the row simply does not appear under the service it was authored for, and it does appear under the oldest one. A deployment with a single service is unaffected by construction — first and active are the same row there. Anyone running more than one service on this deployment may want to check `slices.service_id` and `phases.service_id` against the board the rows were authored on before adding more.

`findFirstServiceId` is no longer exported. Its one remaining caller is `findActiveServiceId`'s no-slug branch — the bare root, where nothing claims a service and "first" is what active means. That is not the fallback #622 retired, which fired when a slug named a service that did not exist. Keeping it module-private is what stops the fourth write path reaching for it: a surface that wants a service id can now only reach `findActiveServiceId` (a read, nullable) or `resolveActiveServiceId` (a write, throwing), and both honour the URL.

**Upgrading a deployment:** nothing to do. Single-service deployments see no behaviour change at all. On a multi-service deployment, new slices and phases land on the service in the URL; rows written before this release may need moving by hand.
