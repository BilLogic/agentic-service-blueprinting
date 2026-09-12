---
'agentic-service-blueprinting': patch
---

**No file in this package cites an ADR number either, and the same check now
holds that.** An `ADR 0012` in a shared file resolves in THIS repository's
`docs/adr/`. A deployment that enrols the file gets the sentence without the
document — it has no `docs/adr/0011-…`, and nothing tells it where to look. That
is the issue-number failure through a directory instead of a tracker, and the
previous release closed only the tracker half.

`src/citations.test.ts` now runs both matchers over the same walk, so the rule
covers every file under `src/` rather than the vendored component tree alone.
`RECORD_NUMBER` also takes the path spelling — `docs/adr/0011-…` is the same
citation wearing a slash, and it reached a reader at the worst moment, inside
the assertion message printed when their gate went red.

Eleven sentences were rewritten to carry the decision. None of them argued for
staying, because in every case the rule was shorter than the pointer: the type
guards now say a rung owns size and leading while a call site owns weight,
tracking and ink, and that there is no semantic type-role layer to write the
panel jobs through; the token sweep says `tokenModel` is the one seam style
enforcement rides; the session pin says a surface asks `canWrite` and the tier
stays local because a second exported answer is an invitation to gate on the
wrong one. Two in the vendored agent rulebook ended "(ADR 0003)" after a
sentence that had already stated the model, and were fixed at their source in
`references/data-model.md`.

**Versions stay.** `21000122000000` and `2026.09.08` in
`src/lib/backend/schemaVersion.ts` and in the rulebook resolve inside a
deployment's own database and its own migrations directory, which is the whole
test: where the pointer lands, not whether it has digits. Twenty-three such
lines were measured and none moved.

**`docs/` paths are not settled here.** Seven remain under `src/` outside the
ADR spelling — `docs/erd.mmd`, `docs/guide/`, `docs/assets/`,
`docs/connectors/…` — and they need a judgement this change does not make,
because `check:doc-paths` currently *requires* the rulebook's paths to resolve
against this repository. That tension is the ticket, not a rewrite.
