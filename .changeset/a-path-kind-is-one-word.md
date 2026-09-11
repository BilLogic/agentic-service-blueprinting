---
'agentic-service-blueprinting': patch
---

A path kind is called one word, the same everywhere: Happy, Variant, Exception. The badge said "Happy" while the new-path picker, the colour key's hover title and the badge's own tooltip said "Happy path", because the labels lived in two maps in `pathKindTheme.ts` and a third copy in `versionValidation.ts`. There is now one map, `PATH_KIND_LABELS` in `pathKindTheme.ts`, and a test mounts the badge, its tooltip, the colour key and the picker and holds that each kind reads the same single word on all four. A name an author gives a path is untouched: a path called "Happy path" keeps that name.

**Upgrading a deployment.** `PATH_KIND_SHORT_LABELS` is gone, and `PATH_KIND_LABELS` replaces it: it now holds the one-word labels. `versionValidation` no longer exports `PATH_KIND_LABELS`; import it from `@/lib/pathKindTheme`. Nothing to apply to the database.
