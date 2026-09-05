/**
 * The rename map — the one list the vocabulary checks agree on, and the only
 * place the map is written down.
 *
 * It used to have a documented twin. `CONTEXT.md` carried the same table in
 * prose, this file carried it in code, and
 * `scripts/tests/retired-vocabulary.test.mjs` held the two together — two lists
 * on purpose, so that reformatting a markdown table could not break a build
 * while a drifted table could still fail one. #137 made the glossary a glossary
 * again: a document that defines terms and stops. With the prose half gone
 * there is no pair left to hold together, and this file is both halves at once
 * — the list CI acts on, and the commentary a person reads to learn why a word
 * left.
 *
 * Ported from an instance built on this template, whose renames these are —
 * and not copied: the rows differ, because `sets_off` and `cells.maturity`
 * never existed here and `description` → `summary` did.
 *
 * Read by:
 *   - `scripts/check-retired-identifiers.mjs`  (Check A — database identifiers)
 *   - `scripts/check-database-names.mjs`       (Check B — names inside strings)
 *   - `scripts/tests/retired-copy.test.mjs`    (Check C — words a person reads)
 *   - `scripts/value-set-claims.mjs`           (retired VALUES in swept markdown)
 *
 * ── WHY EACH NAME WENT, AND WHICH ARE NOT IN THE WORD LISTS ────────────────
 *
 * The commentary below moved here from `CONTEXT.md` in #137, word for word,
 * because every paragraph of it is about THESE lists: which renames are
 * carried in the `retired` and `copy` word lists, which are deliberately
 * absent, and what enforces the absent ones instead. The reasoning about words
 * retired as IDENTIFIERS rather than as words — the four spellings a rename
 * sweep breaks and why each stands where it does — sits in the header of
 * `scripts/check-retired-identifiers.mjs`, beside the exemption list that
 * applies it. What changed on the way is the deixis and nothing else: the
 * opening sentence used to say the map was recorded in the file a person reads
 * to learn the vocabulary, and three later phrases pointed at a table or a
 * definition that sat on the same page. A reference that points at nothing is
 * the one thing a verbatim move cannot keep.
 *
 * These renames landed across `21000103`–`21000122`. They are recorded with
 * the map because a sweep that catches every occurrence of a retired word needs
 * to know which occurrences are not residue. The last block closes the lane
 * vocabulary (`21000122000000`): the tech lanes become touchpoints, `support_systems`
 * splits into `support_actions` (people) and `backstage_touchpoints` (systems),
 * `visual` becomes `storyboard`, `step_visual` is dropped, and the design system
 * keeps one word for each of its two markers — `badge` for a descriptive one,
 * `tag` for one of a set. The `pill`/`chip` row carries no migration because no
 * database object ever bore either word; it is a component-and-copy rename that
 * `tsc` and review hold.
 *
 * **These are the current names.** An `alter table … rename` moves the table and
 * the column and nothing else — the index, the constraint, the policy, the
 * trigger, the comment and every plpgsql body keep the name they were created
 * with. `21000102`'s `__rename_schema_objects` moved those from the catalogue
 * rather than from a hand-written list, and `scripts/check-retired-identifiers.mjs`
 * now checks that nothing came back.
 *
 * The reasoning, where it is worth knowing. `row` and `column` named how a lane
 * and a step happen to be *drawn* today, and the axis is a rendering fact rather
 * than a domain one. "Lifecycle" was not a level above the service — it *was* the
 * service, wearing a longer name. `enables` was left alone, because it was already
 * the plain word for what it means.
 *
 * `21000116000000` is one migration answering two complaints. **`_type` is a
 * suffix apologising for a name**: `paths.path_type`, `slices.slice_type` and
 * `scenarios.view_type` all said "the kind of thing this is" in a column that
 * could say `kind`, which `cell_dependencies` already did. And **one word per meaning** — a `name` is
 * what you navigate by, a `title` is authored content, a `summary` is the
 * sentence that describes the thing, and a `note` is an aside beside it.
 * `findings.note` was never an aside; it is the finding's own sentence.
 *
 * **Four of those words are retired as identifiers and NOT as words**, which is
 * why their rows enforce nothing and this paragraph exists — a check that
 * deliberately ignores a word has to say so, or the next person reads the silence
 * as an oversight and closes it:
 *
 * - **`label`** — `cell_dependencies.label` became `.name`, but a form control
 *   has a label and half this tree's components take one as a prop. What was
 *   retired is the column, not the noun.
 * - **`description`** — `package.json` has one, so does every tool spec. Only
 *   `slices.description` moved, and `21000108000000` had already moved the rest.
 *   The row is `cell_dependencies.label`, `slices.description`, `slices.origin`
 *   together because one migration answered all three.
 * - **`origin`** — still the live import-provenance column on `cells`, `phases`,
 *   `scenarios`, `paths`, `lanes` and `steps`. Only `slices.origin` became
 *   `authorship`, because on a slice the question is who WROTE it, not where it
 *   came from — a person may author one outright.
 * - **`business_model`** — the singular is the retired TABLE name and the live
 *   domain term at once. `21000111000000` renamed `propositions` to it and took
 *   the singular from the noun rather than from the convention around it; this
 *   migration fixes the number without disturbing the word.
 *
 * `finding` is the same case: the bare word is the live domain term, defined
 * in `CONTEXT.md`. What `21000116000000` retired is the bare TABLE name, which
 * never said whose findings these were.
 *
 * **One rename in this vocabulary is not in the table**, because it never was an
 * identifier and because it ended in no word at all. `evidence`, `findings`,
 * `slices` and `slides` were the **derived layer**, then the *analysis tier*, and
 * are now four records with an owner each — the table under `CONTEXT.md`
 * § What the skills produce. Both collective nouns failed the same way, by
 * claiming something untrue of half the set:
 *
 * - *derived layer* — only `findings` is derived; a person may author a slice.
 *   And `layer` is the spelling `21000104000000` retired when `layers` became
 *   `lanes`, so the word was built on a word this template had withdrawn. It was
 *   still being shipped to agents in `skills/slice/SKILL.md`.
 * - *analysis tier* — evidence is source material and a slice is a presentation
 *   for an audience. Neither is analysis. It also collided with `tier`, which
 *   already means an access level here (`20260818002000_service_account_tier`),
 *   so one word named both what a reader may write and what they may write it
 *   to.
 *
 * Nothing in the catalogue ever moved, which is why no migration carries either
 * word. What enforces the replacement is not this vocabulary map but the write
 * surface: `scripts/tests/who-writes-what.test.mjs` holds the ownership table
 * against `WRITE_TOOL_NAMES`, so a renamed tool or an unowned new write fails
 * `npm test`. That is the check neither collective noun ever had — both were
 * adopted, both went stale, and nothing anywhere noticed.
 */

/**
 * One row per rename, ordered as the series landed them.
 *
 * `was` / `is` / `migrations` are the translation itself: the retired name, the
 * name it carries today, and the migration that moved it. They are the whole of
 * what the prose table used to say, which is why deleting that table cost
 * nothing.
 *
 * `retired` is what the identifier checks actually match: SUBSTRINGS, not whole
 * words. A word-boundary pattern is what let `cells_layer_step_slot_unique`
 * survive `\mlayer_id\M` upstream — `_` is a word constituent in Postgres
 * regex — and `21000104`'s header records having to write that name its own
 * pattern for the same reason. Every fragment is asserted to be a substring of
 * one of the same row's `was` entries, so the enforced words cannot wander from
 * the names they came from.
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
      // #111. A placement is summary + role. Its two URL columns — the
      // screenshots of the tool at this moment, and where it lives — became
      // attachments and a featured link in `resources`, carrying the
      // placement's id. No identifier retires: `url` is a live column on
      // `resources`, and `screenshots` is English elsewhere in these
      // documents (a render check takes them).
      was: ['cell_touchpoints.url', 'cell_touchpoints.screenshots'],
      is: ['resources.url', 'resources.kind'],
      migrations: ['21000119000000'],
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
    // The lane vocabulary closes (`21000122000000`). A "tech" lane never held
    // only software — it held the things a moment happens THROUGH, which is a
    // touchpoint — so the two tech roles become touchpoints. Both spellings
    // retire outright: neither is a substring of any surviving database name,
    // and the lane LABELS ("Front Stage Tech") are free-form text the migration
    // does not touch, so the copy guard reads the ROLE aloud and not the label.
    {
      was: ['frontstage_tech', 'backstage_tech'],
      is: ['frontstage_touchpoints', 'backstage_touchpoints'],
      migrations: ['21000122000000'],
      retired: ['frontstage_tech', 'backstage_tech'],
      copy: ['frontstage tech', 'backstage tech'],
    },
    // `support_systems` did two jobs — back-office people and back-office
    // systems. The people are `support_actions` (a new role for a lane an
    // adopter may add); the systems are touchpoints, and every support_systems
    // lane in this template is a systems lane, so each becomes
    // `backstage_touchpoints`.
    {
      was: ['support_systems'],
      is: ['backstage_touchpoints'],
      migrations: ['21000122000000'],
      retired: ['support_systems'],
      copy: ['support systems'],
    },
    // `visual` said what the MEDIUM is where every sibling role says what the
    // row is FOR; it is `storyboard` now, the word the panel and the walkthrough
    // already used. `step_visual` named no lane here — a step never carried its
    // own storyboard variation — and is dropped, its concept folded into
    // `storyboard`.
    {
      was: ['visual', 'step_visual'],
      is: ['storyboard'],
      migrations: ['21000122000000'],
      retired: ['visual', 'step_visual'],
      copy: ['visual', 'step visual'],
    },
    /*
      THE DESIGN SYSTEM'S OWN VOCABULARY, which had four words for two ideas.

      A **badge** describes the thing it sits on: one per thing, not drawn from
      a set, never interactive — the divider caption, a touchpoint's own face.
      A **tag** is one value out of a set, selectable or removable. "Chip" and
      "pill" were a third and fourth name for those same two ideas and are not
      names any more.

      `retired` is empty and that IS the entry: no database object was ever
      called either word, so the identifier sweep has nothing to forbid, and a
      guard that cannot fire is a comment wearing a check's clothes. The copy
      list costs nothing — neither word reaches a reader today — and is what
      keeps it that way.

      Between those two lists sat the app's own vocabulary — a component, a
      prop, a constant, a variant string, a data attribute, a file name — held
      by review alone, which is how `FloatingSidebarPill`, `SliceRefocusPill`
      and `PathNotionPill` survived the touchpoint half of the rename. Since
      #158 that half is `scripts/tests/pill-is-not-a-name.test.mjs`, whose
      subject is every NAME under `src` with comments removed. It takes `pill`
      and not `chip`: `coverContent.chip` is still a live name here, and
      retiring it is its own change. The instance's
      `scripts/tests/badge-and-tag.test.mjs` is the model and takes both.
    */
    {
      was: ['pill', 'chip'],
      is: ['badge', 'tag'],
      migrations: [],
      retired: [],
      copy: ['pill', 'pills', 'chip', 'chips'],
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
 *               permanent entry must be explained in the header of the check
 *               that applies it — see
 *               `scripts/tests/retired-vocabulary.test.mjs`.
 *
 * @typedef {{ identifier: string, because: string, until?: string }} Exemption
 */

/** True when `identifier` is covered by one of `exemptions`. */
export function isExempt(identifier, exemptions) {
  return exemptions.some((entry) => entry.identifier === identifier)
}
