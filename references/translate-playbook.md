# Translate Playbook — foreign blueprint → crosswalk → IR

For when the org **already has a structured blueprint** that doesn't match
this template: different lane structures, FigJam/Miro boards, spreadsheet
blueprints, classic Shostack format. The move is a reviewed **crosswalk
mapping** — their vocabulary onto our data model — not forcing their
vocabulary into ours. Customize layers/roles to fit them.

## Supported inputs (v1)

xlsx/CSV, markdown tables, FigJam via MCP. **Miro only via CSV/board
export** (no API path). Whiteboard photos and scanned/spatial PDFs: out of
scope v1 — say so and offer co-creation instead.

## 1. Extract their structure

Dispatch `document-reader` in **foreign-blueprint extraction mode**: it
returns the source's lanes (verbatim labels), columns/stages, variants/
branches/boards, annotations, and anything spatial that resists tabulation.
Do not interpret yet — extraction first, mapping second.

## 2. Build the crosswalk (the reviewable artifact)

Write a crosswalk file in the workspace `blueprint/` dir conforming to
`references/crosswalk-schema.json`:

- **Lanes → layers/roles.** Map to canonical roles where semantics match
  (their "Customer" → `customer_actions`); create **org-defined custom
  roles** where they don't (Shostack's *physical evidence* → a custom
  `physical_evidence` role rendering as a generic lane). Keep THEIR display
  names — that's the point of the display-name/role split.
- **N:1 merges**: several source lanes may map to one target layer; each
  mapping gets a `merge_note` explaining how cell content combines.
- **Columns → steps**, in order.
- **Variants/branches/boards → paths** with a `path_type` each; a
  single-flow source is one happy path.
- **⚠ REQUIRED — the unmapped bucket**: every source element with no
  mapping goes in `unmapped` with kind, reason, and disposition
  (pending / excluded / custom_role / merged / deferred). **Nothing is ever
  silently dropped.** "Excluded" requires the user's explicit consent.

The crosswalk is reusable: the same org's next board translates with the
same file.

## 3. Present the crosswalk for approval

Show the mapping as a readable table (theirs → ours, with the unmapped
bucket called out) and get explicit approval **before generating any IR**.
This is the translation counterpart of the skeleton preview: a wrong mapping
costs one message here, a rebuilt IR later.

## 4. Convert

Apply the approved crosswalk to generate the IR per
`references/ir-schema.json`:

- Every converted cell gets `provenance` pointing at the source board/sheet
  (+ frame/sheet section).
- Content that the crosswalk merged (N:1) keeps all source text; flag
  awkward merges `needs_review: true`.
- Run `scripts/validate_ir.py`; fix to exit 0; mark the scenario `drafted`
  in `blueprint-workspace.json`.

Then hand off to `references/review-import-playbook.md` — translated
blueprints go through the same preview/review/sign-off gate as everything
else.

## ⚠ Exit condition (deterministic)

Translation of a scenario ends when **the crosswalk file validates against
`references/crosswalk-schema.json` with an explicitly user-approved mapping
(zero `unmapped` entries left at disposition `pending`), AND
`scripts/validate_ir.py` exits 0 on the generated IR, AND the scenario is
marked `drafted` in `blueprint-workspace.json`.**
