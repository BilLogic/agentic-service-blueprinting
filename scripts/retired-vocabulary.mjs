/**
 * The rename map, machine-readable — the one list the vocabulary checks agree on.
 *
 * `CONTEXT.md`'s "The rename map" section is the DOCUMENTED map and stays the
 * thing a person reads. This is the ENFORCED map. Neither derives from the
 * other, and `scripts/tests/retired-vocabulary.test.mjs` asserts they still say
 * the same thing.
 *
 * That the two are separate is the point. A prose document should not be
 * load-bearing for CI — reformatting a markdown table must not break a build,
 * and a check that parses prose acquires an exemption for every sentence that
 * merely mentions a word. But a documented map that has drifted from the
 * enforced one is a lie in the file people read to learn the vocabulary, so
 * divergence is itself a failure. Hence: two lists, one test holding them
 * together.
 *
 * Ported from an instance built on this template, whose renames these are —
 * and not copied: the rows differ, because `sets_off` and `cells.maturity`
 * never existed here and `description` → `summary` did.
 *
 * Read by:
 *   - `scripts/check-retired-identifiers.mjs`  (Check A — database identifiers)
 *   - `scripts/check-database-names.mjs`       (Check B — names inside strings)
 *   - `scripts/tests/retired-copy.test.mjs`    (Check C — words a person reads)
 */

/**
 * One row per row of `CONTEXT.md`'s rename table, in the same order.
 *
 * `was` / `is` / `migrations` are the table's three columns, reduced to the
 * code spans they contain — the test compares exactly those, so prose around
 * them can be rewritten freely.
 *
 * `retired` is what the identifier checks actually match: SUBSTRINGS, not whole
 * words. A word-boundary pattern is what let `cells_layer_step_slot_unique`
 * survive `\mlayer_id\M` upstream — `_` is a word constituent in Postgres
 * regex — and `21000104`'s header records having to write that name its own
 * pattern for the same reason. Every fragment is asserted to be a substring of
 * one of the same row's `was` entries, so the enforced words cannot wander from
 * the documented ones.
 *
 * `copy` is the prose spelling of the same retirement, for the guard over words
 * a person reads on screen.
 *
 * A row may enforce NOTHING — an empty `retired` and `copy` — when the retired
 * spelling is still a live word elsewhere in the schema. That is a judgement
 * recorded in the row, not an omission, and the test requires the row to say so.
 */
export const RENAME_MAP = Object.freeze(
  [
    {
      was: ['layers', 'layer_role', 'cells.layer_id'],
      is: ['lanes', 'lane_role', 'cells.lane_id'],
      migrations: ['21000104000000'],
      retired: ['layer'],
      // `CanvasAnnotationLayer` is a RENDERING layer and an unrelated concept —
      // `21000104`'s header says so explicitly. It is an identifier in the
      // frontend, not a database name and not reader-facing copy, so neither
      // check that reads this row can reach it.
      copy: ['layer', 'layers'],
    },
    {
      was: ['cell_triggers'],
      is: ['cell_dependencies'],
      migrations: ['21000103000000'],
      retired: ['cell_trigger'],
      // Not `trigger` alone: a database trigger (`cells_validate_path_match`)
      // is a live subject in these documents, and the kind value that carried
      // the word has its own row below.
      copy: ['cell trigger', 'cell triggers'],
    },
    {
      was: ['service_lifecycles', '*_service_lifecycle_id'],
      is: ['services', 'service_id'],
      migrations: ['21000106000000'],
      // `lifecycle` bare, not `service_lifecycle`: `21000106` ran a second
      // pass on the bare word precisely because objects carried it without the
      // prefix.
      retired: ['lifecycle'],
      copy: ['lifecycle', 'lifecycles'],
    },
    {
      was: ['service_scenarios', '*_service_scenario_id'],
      is: ['scenarios', 'scenario_id'],
      migrations: ['21000107000000'],
      retired: ['service_scenario'],
      copy: ['service scenario', 'service scenarios'],
    },
    {
      was: ['row_position', 'column_position', 'slot_position', 'order_position'],
      is: ['position'],
      migrations: ['21000105000000'],
      retired: ['row_position', 'column_position', 'slot_position', 'order_position'],
      copy: ['row position', 'column position', 'slot position', 'order position'],
    },
    {
      was: ['description'],
      is: ['summary'],
      migrations: ['21000108000000'],
      // ENFORCES NOTHING, deliberately. `description` is a word rather than an
      // identifier: `21000108` renamed it on five tables and its own header
      // records that a sixth still has one (`slices.description`, prose the
      // author writes about the slice) and that `tech_description` is a link
      // TYPE. A fragment check keyed on `description` would flag both and need
      // an exemption for each, and an exemption list is where a real finding
      // hides. The rename has its own guard already: `21000108` asserts
      // `\mdescription\M` against the three function bodies that name one.
      retired: [],
      copy: [],
    },
    {
      was: ['propositions'],
      is: ['business_model'],
      migrations: ['21000111000000'],
      // The PLURAL, in both lists, and this is not a pattern narrowed to dodge
      // a case. The retired IDENTIFIER is the table `propositions`. Singular
      // `proposition` was never one: its only occurrence is
      // `evidence.proposition_question_key`, a live column recording which of
      // the three validation questions an evidence row answers — and those
      // three ARE propositions in the ordinary sense. The rename moved the
      // container, not the concept, so there is nothing here to exempt.
      //
      // THE COPY LIST HELD THE SINGULAR UNTIL #89, and that was the same
      // over-reach one column to the left, caught the first time a panel had
      // to say the word. `cells.value_props` abbreviates "value proposition"
      // and nothing else — `21000111`'s own header says the phrase is what
      // `propositions` collided with, "a CELL's value proposition", one level
      // down. A label reading `Value proposition` is therefore the schema's
      // word spelled out, not a retired one surviving, and this list keying
      // on the plural leaves the retired NAME covered on screen exactly as it
      // is in identifiers. Retiring a word the vocabulary still means is how
      // a guard teaches people to route around it.
      retired: ['propositions'],
      copy: ['propositions'],
    },
    {
      // Values, not identifiers: the two `cell_dependencies.kind` values were
      // renamed and the `needs` rows turned around (source and target swapped)
      // because `enables` reads source-first and `needs` did not. Not a copy
      // word and not an identifier fragment — `scripts/check-dependency-kinds.mjs`
      // sweeps the code-span form through every rulebook tree instead.
      was: ["cell_dependencies.kind = 'trigger'", "cell_dependencies.kind = 'needs'"],
      is: ["cell_dependencies.kind = 'leads_to'", "cell_dependencies.kind = 'enables'"],
      migrations: ['21000114000000'],
      retired: [],
      copy: [],
    },
    {
      was: ["scenarios.layout = 'side-by-side'", "scenarios.layout = 'integrated'"],
      is: ["scenarios.layout = 'stacked'", "scenarios.layout = 'stacked'"],
      migrations: ['21000116000000'],
      retired: [],
      copy: [],
    },
    {
      was: ["paths.kind = 'unhappy'", "paths.kind = 'alternative'"],
      is: ["paths.kind = 'exception'", "paths.kind = 'variant'"],
      migrations: ['21000116000000'],
      retired: [],
      copy: [],
    },
    {
      was: ["scenarios.layout = 'single'"],
      is: ["scenarios.layout = 'stacked'"],
      migrations: ['21000117000000'],
      retired: [],
      copy: [],
    },
    {
      was: ["resources.kind = 'other'"],
      is: ["resources.kind = 'attachment'"],
      migrations: ['21000118000000'],
      retired: [],
      copy: [],
    },
    {
      was: ['business_model'],
      is: ['business_models'],
      migrations: ['21000116000000'],
      // Plural, like every other table. `21000111000000` took the singular
      // from the noun rather than from the convention around it, which is why
      // this row exists one migration later instead of being folded into that
      // one: the rename was right and the number was not.
      retired: [],
      copy: [],
    },
    {
      was: ['findings', 'findings.check_name', 'findings.note'],
      is: ['audit_findings', 'audit_findings.check_key', 'audit_findings.summary'],
      migrations: ['21000116000000'],
      // `finding` alone is NOT retired — it is the live domain word, defined
      // in CONTEXT.md, and a panel has to be able to say it. What is retired
      // is the bare TABLE name, which said nothing about whose findings these
      // are, and `check_name`, which called a key a name.
      retired: ['check_name'],
      copy: ['check name'],
    },
    {
      was: ['paths.path_type', 'slices.slice_type', 'scenarios.view_type'],
      is: ['paths.kind', 'slices.kind', 'scenarios.layout'],
      migrations: ['21000116000000'],
      // `_type` is a suffix apologising for a name. All three said "the kind
      // of thing this is" in a column that could say `kind`, which
      // `cell_dependencies` already did.
      retired: ['path_type', 'slice_type', 'view_type'],
      copy: ['path type', 'slice type', 'view type'],
    },
    {
      was: ['cell_dependencies.label', 'slices.description', 'slices.origin'],
      is: ['cell_dependencies.name', 'slices.summary', 'slices.authorship'],
      migrations: ['21000116000000'],
      // One word per meaning: a `name` is navigated by, a `title` is authored,
      // a `summary` describes, a `note` is an aside.
      //
      // NOT `label`, `description` or `origin` as bare fragments. Each is a
      // live word elsewhere in this tree — a form control has a label, a
      // package has a description, and `origin` is the import-provenance
      // column on cells and phases, which this migration does not touch.
      // Narrow the subject, never the word list.
      retired: [],
      copy: [],
    },
  ].map((row) =>
    Object.freeze({
      ...row,
      ...Object.fromEntries(
        ['was', 'is', 'migrations', 'retired', 'copy'].map((k) => [k, Object.freeze(row[k])]),
      ),
    }),
  ),
)

/** Every retired identifier fragment, deduplicated, longest first. */
export const RETIRED_IDENTIFIER_FRAGMENTS = Object.freeze(
  [...new Set(RENAME_MAP.flatMap((row) => row.retired))].sort(
    (a, b) => b.length - a.length || a.localeCompare(b),
  ),
)

/** Every retired prose spelling, deduplicated, longest first. */
export const RETIRED_COPY_WORDS = Object.freeze(
  [...new Set(RENAME_MAP.flatMap((row) => row.copy))].sort(
    (a, b) => b.length - a.length || a.localeCompare(b),
  ),
)

/** The current name a retired fragment was renamed to, for the failure message. */
export function replacementFor(fragment) {
  const row = RENAME_MAP.find((entry) => entry.retired.includes(fragment))
  return row ? row.is.join(' / ') : null
}

/**
 * Retired fragments present in an identifier, as substrings. Case-insensitive
 * because Postgres folds unquoted identifiers to lower case and nothing in this
 * schema is quoted.
 */
export function retiredFragmentsIn(identifier) {
  const lower = String(identifier).toLowerCase()
  return RETIRED_IDENTIFIER_FRAGMENTS.filter((fragment) => lower.includes(fragment))
}

/**
 * The shape every exemption in every one of these checks takes.
 *
 *   identifier  what is exempt, exactly as the check names it
 *   because     why, in a sentence a stranger can evaluate
 *   until       the issue that ends it. ABSENT MEANS PERMANENT, and a
 *               permanent entry must be defined in CONTEXT.md — see
 *               `scripts/tests/retired-vocabulary.test.mjs`.
 *
 * @typedef {{ identifier: string, because: string, until?: string }} Exemption
 */

/** True when `identifier` is covered by one of `exemptions`. */
export function isExempt(identifier, exemptions) {
  return exemptions.some((entry) => entry.identifier === identifier)
}
