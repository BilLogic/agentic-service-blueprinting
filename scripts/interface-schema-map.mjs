/**
 * The interface→schema map: every panel label, and the name behind it.
 *
 * This is the ENFORCED half — the list CI acts on. The half a person reads is
 * `references/interface-schema-map.md`, and it is GENERATED from this one by
 * `scripts/generate-interface-schema-map.mjs`, which is the difference between
 * this map and the rename map next door. The rename map's two halves were
 * hand-kept and held together by a parity test; a generated document cannot
 * drift from its source, so the drift check is `--check` rather than an
 * assertion that two lists still agree.
 *
 * The document lived inside `CONTEXT.md` until #137. It was a hundred lines of
 * reference in a glossary — read by every session that opened the file to look
 * up one word — and its table restated, row by row, what the catalogue already
 * says. Now it is a disclosed reference: one pointer in `AGENTS.md`, whose
 * leading word is the surface a session is touching, and a body that is only
 * read when that pointer fires.
 *
 * IT LIVES UNDER `references/`, and that is the constraint this repository has
 * and the deployment does not. Paths under `references/` are a published
 * interface — `docs/adr/0004-reference-paths-are-a-published-interface.md` —
 * so a deployment that decides it wants this map can import it at a path that
 * holds still. None does today, which is why the path is not yet in
 * `scripts/check-reference-paths.mjs`: that list is the consumer's imports, and
 * a list that guards paths nobody reads misses the ones they do.
 *
 * WHAT IS GENERATED, AND FROM WHAT. The binding table restates the catalogue —
 * a label, the `table.column` it names, and the sentence the catalogue carries
 * about that column — so it is rendered rather than typed, from this list and
 * from `supabase/generated/portable-core.schema.sql`, the dump of what the
 * portable core builds. That dump is the catalogue as the REPOSITORY describes
 * it, needs no database, and is the same static source `check:instance-vocabulary`
 * and `scripts/tests/documented-value-sets.test.mjs` already read. The prose
 * around the table is hand-written, because a decision about why two words
 * differ is not in any catalogue.
 *
 * Read by:
 *   - `scripts/generate-interface-schema-map.mjs`         (the document)
 *   - `scripts/tests/labels-name-their-columns.test.mjs`  (#89 — the four rules)
 */

/**
 * Every panel label, the schema name behind it, and why they differ.
 *
 * `label` is matched against what a panel actually says, case-insensitively
 * and whole. `names` is one or more `table.column` names, or a bare table
 * where the label heads a whole relation rather than a field of one.
 * `because` is empty on every row whose label and name already agree, and
 * required on every row where they do not.
 *
 * ONE LABEL, SEVERAL NAMES is allowed, and a row is aligned only when it
 * aligns with EVERY name it lists — so a shared word cannot be smuggled past
 * this by pairing a divergence with an agreement.
 *
 * Ordered as a reader meets them: the cell's own fields, then the three
 * tabs and what stands under the first of them.
 */
export const LABEL_COLUMNS = Object.freeze(
  [
    { label: 'Content', names: ['cells.content'], because: '' },
    {
      label: 'Summary',
      names: [
        'cells.summary',
        'paths.summary',
        'phases.summary',
        'scenarios.summary',
        'services.summary',
        'steps.summary',
      ],
      because: '',
    },
    { label: 'Owner', names: ['cells.owner'], because: '' },
    { label: 'Perceived owner', names: ['cells.perceived_owner'], because: '' },
    { label: 'Function', names: ['cells.function'], because: '' },
    { label: 'Form', names: ['cells.form'], because: '' },
    {
      label: 'Value proposition',
      names: ['cells.value_props'],
      because:
        '`props` abbreviates this exact phrase and no other. A label is read once and a name is typed daily, so the panel spells out what the schema shortens.',
    },
    {
      label: 'Dependencies',
      names: ['cell_dependencies'],
      because:
        'The relation names both ends, because a dependency always runs from one cell to another. The tab is already standing inside a cell, so the prefix would be the one word on it that told a reader nothing.',
    },
    {
      label: 'Follows',
      names: ['cell_dependencies.kind'],
      because:
        "Names a VALUE read from one end rather than a column: these rows are `kind = 'leads_to'` arriving. The schema stores one row and the panel shows it twice, once from each end, so the label has to say which end a reader is standing at — and no column could be called this.",
    },
    {
      label: 'Leads to',
      names: ['cell_dependencies.kind'],
      because:
        "The same value from the other end — `kind = 'leads_to'` leaving, and here the label IS the value minus its underscore. What the pair carries that `kind` cannot is the direction, which is why the arriving end keeps a word of its own.",
    },
    {
      label: 'Enabled by',
      names: ['cell_dependencies.kind'],
      because:
        'The recorded kind, arriving — `kind = \'enables\'` with this cell as the target. The same one-row-two-ends rule as Follows: without its own word, a reader standing at the target reads "Enables › A" as this cell enabling A, the exact inversion the rename ended.',
    },
    {
      label: 'Enables',
      names: ['cell_dependencies.kind'],
      because:
        "The word IS the value — `kind = 'enables'` leaving, the recorded dependency that never draws — and `kind` is the name of the place holding it.",
    },
    {
      label: 'Tech in this step',
      names: ['cells.content'],
      because:
        "Not a field of anything: it heads the technology standing in the same step that nothing on this cell points at, and each item under it is one line parsed out of a tech cell's content. `content` names where the words live; the label names which cells they came from.",
    },
    { label: 'Evidence', names: ['evidence'], because: '' },
    { label: 'Resources', names: ['resources'], because: '' },
    {
      label: 'Actor',
      names: ['lanes.stakeholder_id'],
      because:
        'The registry the key points into is `stakeholders`, and the word this vocabulary uses for a party standing in the room is actor: a lane names its actor, and a `team` is a stakeholder that can never be one. The label says the narrower word, which is the only one the board is about.',
    },
    { label: 'Owner team', names: ['lanes.owner_team'], because: '' },
    { label: 'KPIs', names: ['lanes.kpis'], because: '' },
    { label: 'Tools', names: ['lanes.tools'], because: '' },
    { label: 'Business impact', names: ['phases.business_impact'], because: '' },
    {
      label: 'Operational requirements',
      names: ['phases.operational_requirements'],
      because: '',
    },
    { label: 'Paths', names: ['paths'], because: '' },
    { label: 'Status', names: ['cells.status', 'paths.status'], because: '' },
    {
      label: 'Author note',
      names: ['paths.note'],
      because:
        "`note` is this vocabulary's word for an author's aside, and the label says whose aside it is because it sits directly under Summary, which is the path's own sentence. That distinction is worth a word on screen and not worth a second column.",
    },
    { label: 'Funding', names: ['business_models.funding'], because: '' },
    { label: 'Pricing', names: ['business_models.pricing'], because: '' },
    { label: 'Delivery cost', names: ['business_models.delivery_cost'], because: '' },
    { label: 'Revenue model', names: ['business_models.revenue_model'], because: '' },
    { label: 'Partners', names: ['business_models.partners'], because: '' },
    {
      label: 'Examples',
      names: ['services.entity_examples'],
      because:
        'The section heads a jsonb map, not a field, and the column carries an `entity_` qualifier the label drops: on the service panel the only examples in question are the board’s six entity kinds, so the qualifier is understood and the heading says the plain word. The six inputs beneath it name the kinds, not columns, so they carry no row of their own; this one row binds the whole map.',
    },
    { label: 'Position', names: ['path_steps.position'], because: '' },
    {
      label: 'Storyboard',
      names: ['lanes.lane_role'],
      because:
        'The one row whose right-hand side is a VALUE rather than the name of a place to put one: `storyboard` is one of the eight `lane_role` admits, and this label heads the frames of the lanes carrying it. The word is in the schema; it is simply not a column name.',
    },
  ].map((row) => Object.freeze({ ...row, names: Object.freeze(row.names) })),
)

/* -------------------------------------------------------------- catalogue */

/** How the dump addresses a name: a column, or a bare relation. */
const address = (name) => (name.includes('.') ? `column:${name}` : `table:${name}`)

/**
 * The `COMMENT ON` statements of the schema dump, keyed the way `address()`
 * keys a name.
 *
 * A second reader of the same file rather than a wider `schemaInventory()`,
 * because the two want different things: that one reads structure — tables,
 * columns and the values a CHECK accepts — and this one reads the one prose
 * surface the schema carries. Widening the structural reader to return
 * sentences would make every caller of it pay for a field only this uses.
 */
export function commentsFromSchema(dump) {
  const comments = new Map()
  const COMMENT =
    /^COMMENT ON (TABLE|COLUMN) public\.([A-Za-z0-9_."]+) IS '((?:[^']|'')*)';/gm
  for (const match of dump.matchAll(COMMENT)) {
    // `pg_dump` quotes a reserved word — `public.path_steps."position"` — and
    // the map names its columns the way a person writes them.
    const name = match[2].replaceAll('"', '')
    comments.set(`${match[1] === 'TABLE' ? 'table' : 'column'}:${name}`, match[3].replaceAll("''", "'"))
  }
  return comments
}

/* ------------------------------------------------------------- rendering */

/** A cell's text, flattened and with the column separator escaped. */
const cell = (text) => String(text ?? '').replace(/\s+/g, ' ').replaceAll('|', '\\|').trim()

/** Every name the map binds, in the order a reader meets them, deduplicated. */
export function boundNames(map = LABEL_COLUMNS) {
  return [...new Set(map.flatMap((row) => [...row.names]))]
}

/**
 * The binding table: one row per label, exactly the three columns the section
 * has always had. `—` for a row that agrees with the schema, because a reason
 * written about a label that never diverged reads as a decision and settles
 * nothing.
 */
export function renderBinding(map = LABEL_COLUMNS) {
  return [
    '| The interface says | The schema says | Why they differ |',
    '|---|---|---|',
    ...map.map(
      (row) =>
        `| **${cell(row.label)}** | ${row.names.map((name) => `\`${name}\``).join(', ')} | ` +
        `${cell(row.because) || '—'} |`,
    ),
  ].join('\n')
}

/** The bound names the catalogue carries no `COMMENT ON` for. */
export function namesWithoutAComment(comments, map = LABEL_COLUMNS) {
  return boundNames(map).filter((name) => !comments.has(address(name)))
}

/**
 * How much of what this map binds the catalogue has a sentence about, and which
 * names it does not.
 *
 * THE COVERAGE, NOT THE PROSE, and that is a departure from the deployment's
 * generator worth stating. Its version restates each comment in a second table;
 * this one counts them and names the gaps. The reason is that a comment is
 * prose, `references/` is swept for prose, and two of the comments this map
 * would have republished are stale in a way the markdown sweep cannot see:
 * `paths` still says its kinds are "(happy, unhappy, exception, alternative)",
 * two of which `21000116000000` retired. A generated reference that teaches an
 * agent a retired value is the #102 class of defect, arriving through a door
 * nobody was watching. Counting is the half of the catalogue this document can
 * publish without becoming a second, staler copy of it.
 *
 * A name with no comment says so rather than being left out: a column an agent
 * reads with nothing written about it is a gap, and hiding it here would make
 * this document look complete.
 */
export function renderCoverage(comments, map = LABEL_COLUMNS) {
  const names = boundNames(map)
  const missing = namesWithoutAComment(comments, map)
  const lines = [
    `${names.length - missing.length} of ${names.length} names carry a comment in the ` +
      'catalogue. Read them there — `\\d+ <table>` in psql, or the `COMMENT ON` ' +
      'statements in the dump.',
  ]
  if (missing.length === 0) {
    return [...lines, '', 'Every name this map binds is described.'].join('\n')
  }
  return [
    ...lines,
    '',
    `${missing.length} that carry none:`,
    '',
    ...missing.map((name) => `- \`${name}\``),
  ].join('\n')
}

/** Names this map binds that the dumped catalogue does not have. */
export function namesNotInCatalog(inventory, map = LABEL_COLUMNS) {
  return boundNames(map).filter((name) =>
    name.includes('.') ? !inventory.columns.has(name) : !inventory.tables.has(name),
  )
}

/* --------------------------------------------------------------- splice */

const marker = (name) => ({
  open: new RegExp(`<!-- generated:${name}[^>]*-->`),
  close: `<!-- /generated:${name} -->`,
})

/**
 * The document with the named generated section replaced by `body`.
 *
 * Same shape as `scripts/generate-docs-index.mjs`'s generated files,
 * deliberately: two generators writing into a Markdown document should mark
 * their output the same way, so a reader who has met one has met both.
 */
export function splice(doc, name, body, path = 'references/interface-schema-map.md') {
  const { open, close } = marker(name)
  const start = open.exec(doc)
  const end = doc.indexOf(close)
  if (!start || end === -1 || end < start.index) {
    throw new Error(`${path} has no <!-- generated:${name} --> … ${close} section`)
  }
  return `${doc.slice(0, start.index + start[0].length)}\n\n${body.trim()}\n\n${doc.slice(end)}`
}
