---
'agentic-service-blueprinting': patch
---

`CONTEXT.md` becomes a glossary.

It was 31,839 characters, and three of its six sections were not definitions: a
rename map, an interface-to-schema map, and a section of reasoning about which
words a sweep should skip. Every session that opened the file to look up one
word paid for all three. It is 13,076 characters now, and each of the three
lives beside the thing it is about.

The rename map's prose table is deleted — `scripts/retired-vocabulary.mjs`
already carried the same rows in code, and a parity test held the two together.
With the prose half gone the pair is a single list, so that test goes and the
commentary moves into the data file's header: why each name went, and which
renames the `retired` and `copy` word lists deliberately leave out. The section
on words that keep a retired spelling moves, word for word, into the header of
`scripts/check-retired-identifiers.mjs`, beside the exemption list that applies
it — so a skipped word and the reason for skipping it are one edit.

The interface-to-schema map is now `references/interface-schema-map.md`,
reached by one pointer from the router and generated: its binding table from
`LABEL_COLUMNS` in the new `scripts/interface-schema-map.mjs`, and under it a
coverage line counting the `COMMENT ON` statements in
`supabase/generated/portable-core.schema.sql` and naming the eight bound names
that carry none. The comments are counted rather than reprinted, because two of
them are stale in a way the markdown sweeps cannot see — `paths` still calls its
kinds "happy, unhappy, exception, alternative" — and a generated reference that
teaches an agent a retired value is the defect this repo already has a check
for. It sits under `references/` so that a deployment that wants it can import
it at a path that holds still (ADR 0004); nothing imports it yet, so it is not
in `CONSUMER_IMPORTS`.

`npm run check:glossary` is what stops the file growing them back — headings,
prose and `**term** — definition` rows, failing on a code fence, on a table
naming a `table.column`, and on a section that defines no term — and
`npm run check:interface-map` holds the generated document to its sources. Both
join the guard set and both are driven from fixtures that break them.
