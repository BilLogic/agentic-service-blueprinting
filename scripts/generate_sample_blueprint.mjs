#!/usr/bin/env node
/**
 * Sample-content generator — the META-BLUEPRINT: the service blueprint OF
 * this template itself. The sample lifecycle maps an adopter's journey with
 * agentic service blueprinting (Discover → Adopt → Map → Operate, with
 * Operate looping back to Map), so the product demonstrates itself and every
 * cell doubles as true documentation of how the kit actually behaves.
 *
 * Emits BOTH template sample artifacts from one source of truth:
 *   - src/data/sampleBlueprint.ts  — the offline / no-DB fallback module
 *   - supabase/seed.sql         — the equivalent database seed (lifecycle →
 *     phases → scenarios → paths/steps/layers/cells/triggers → demo slices)
 *
 * What the content deliberately exercises (the template's rendering smoke):
 *   - five scenarios across four phases, incl. the phase loop
 *     (Operate.loops_to_phase_id → Map) drawn on the overview canvas
 *   - one scenario with TWO genuinely divergent paths (no-database run vs
 *     Supabase run) shaped so the compare views show every verdict: fully
 *     shared columns (quiet), divergent columns, path-only cells, and
 *     shared slots inside divergent columns (striped wash in merged view)
 *   - every canonical layer_role, so all three divider lines render, plus
 *     pill lanes (newline multi-pill AND slot-sibling cells), a visual row,
 *     and a CJK lane display name (样例数据) as the non-ASCII smoke test
 *   - trigger kinds: forward cross-layer, same-column, spine chains,
 *     backward in-lane loops (rework + re-audit), and panel-only `needs`
 *     dependencies with labels and notes
 *   - links to REAL repo paths, so cell detail panels point at the code
 *   - two demo slices (journey + step) over the new content
 *
 * Deterministic UUIDs: f0000000-0000-4000-8000-<S><P><KK><AAAA><BBBB>
 *   S = scenario ordinal (0 = lifecycle-scoped), P = path ordinal
 *   (0 = scenario-scoped), KK = kind (00 path, 01 layer, 02 step, 03 cell,
 *   04 trigger, 05 slice, 06 slice item, 07 phase),
 *   AAAA/BBBB = row/column-and-slot (or index) slots.
 *
 * Usage: node scripts/generate_sample_blueprint.mjs
 */

import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_PATH = join(REPO_ROOT, 'src', 'data', 'sampleBlueprint.ts')
const SEED_OUT_PATH = join(REPO_ROOT, 'supabase', 'seed.sql')

const pad2 = (n) => String(n).padStart(2, '0')
const pad4 = (n) => String(n).padStart(4, '0')

const KIND = {
  path: 0,
  layer: 1,
  step: 2,
  cell: 3,
  trigger: 4,
  slice: 5,
  sliceItem: 6,
  phase: 7,
}

/** f0000000-0000-4000-8000-<S><P><KK><AAAA><BBBB> */
function fid(scenarioOrdinal, pathOrdinal, kind, a = 0, b = 0) {
  return `f0000000-0000-4000-8000-${scenarioOrdinal}${pathOrdinal}${pad2(kind)}${pad4(a)}${pad4(b)}`
}

/** The sample lifecycle (also used by the SQL seed emission below). */
const LIFECYCLE_ID = 'f0000000-0000-4000-8000-000000000010'

const LIFECYCLE = {
  id: LIFECYCLE_ID,
  name: 'Blueprint Kit Adoption',
  description:
    'The service blueprint of this template itself — how a team discovers, adopts, maps with, and operates agentic service blueprinting. Replace it with your own service; until then it doubles as documentation.',
}

/** Fixed timestamp for generated derived rows — deterministic output. */
const FIXTURE_TIMESTAMP = '2026-08-18T00:00:00+00:00'

/** GitHub blob base for cell links — every path is verified to exist. */
const REPO_URL = 'https://github.com/BilLogic/agentic-service-blueprinting/blob/main'
const repoLink = (label, path) => ({ type: 'url', label, url: `${REPO_URL}/${path}` })

const PHASES = [
  {
    ordinal: 1,
    key: 'DISCOVER',
    name: 'Discover',
    description: 'The adopter finds the kit and decides it is worth an afternoon.',
  },
  {
    ordinal: 2,
    key: 'ADOPT',
    name: 'Adopt',
    description: 'The kit goes from repository to running app on the adopter’s machine.',
  },
  {
    ordinal: 3,
    key: 'MAP',
    name: 'Map',
    description: 'sb:map turns the adopter’s own service into a validated, imported blueprint.',
  },
  {
    ordinal: 4,
    key: 'OPERATE',
    name: 'Operate',
    description:
      'The blueprint stays true through audits, what-ifs, slices, and agent sessions — and loops back to Map when the service changes.',
    loopsToKey: 'MAP',
  },
]
const phaseId = (ordinal) => fid(0, 0, KIND.phase, ordinal, 0)
const phaseByKey = Object.fromEntries(PHASES.map((p) => [p.key, p]))

/**
 * Scenario cell spec:
 *   { lane, col, content, slot?, description?, links?, paths?,
 *     owner?, perceivedOwner?, fn?, form?, valueProps? }
 * `content` is a string (present on every path) or a per-path-key record
 * (present only on the named paths; differing values = a divergent slot).
 * `slot` > 0 emits a slot-sibling cell (tech lanes: one cell per touchpoint).
 * The last five are the cell spec (`cells.owner` … `cells.value_props`):
 * `owner`/`perceivedOwner` render as the owner pair in the panel, `fn`/`form`/
 * `valueProps` as its FUNCTION / FORM / VALUE block. They are emitted into both
 * artifacts, so a keyless clone shows the same spec a seeded database does.
 */
const SCENARIOS = [
  // -------------------------------------------------------------------
  // 1 · Discover the kit
  // -------------------------------------------------------------------
  {
    ordinal: 1,
    key: 'DISCOVER_KIT',
    phaseKey: 'DISCOVER',
    name: 'Discover the kit',
    description:
      'A first visit: the repository pitch, the live example, the model figures, and the decision to try it.',
    order: 1,
    viewType: 'single',
    navViewType: 'single',
    spineLane: 'adopter',
    paths: [
      {
        ordinal: 1,
        key: 'VISIT',
        name: 'First visit',
        path_type: 'happy',
        description: 'Reading the repo end to end, from pitch to decision.',
      },
    ],
    steps: [
      'Land on the repository',
      'Read the pitch',
      'Open the live demo',
      'Walk the model figures',
      'Meet the four skills',
      'Skim the guides',
      'Weigh the fit',
      'Decide to adopt',
    ],
    // Lane order matters: backstage actions sit directly above the support
    // lane so this scenario draws all THREE canonical divider lines —
    // interaction (after Adopter), visibility (after Repo front door), and
    // internal interaction (after Maintainers, because a support_systems lane
    // follows it). See references/layer-roles.md, "Line-anchoring semantics".
    lanes: [
      { row: 0, key: 'visual', name: 'Journey snapshots', role: 'visual' },
      { row: 1, key: 'adopter', name: 'Adopter', role: 'customer_actions' },
      { row: 2, key: 'frontdoor', name: 'Repo front door', role: 'frontstage_actions' },
      { row: 3, key: 'demo', name: 'Live demo', role: 'frontstage_tech' },
      { row: 4, key: 'maintainers', name: 'Maintainers', role: 'backstage_actions' },
      { row: 5, key: 'docs', name: 'README & guides', role: 'support_systems' },
    ],
    cells: [
      { lane: 'visual', col: 1, content: '' },
      { lane: 'visual', col: 3, content: '' },
      { lane: 'visual', col: 5, content: '' },
      { lane: 'visual', col: 8, content: '' },

      { lane: 'adopter', col: 1, content: 'Lands on the GitHub repository, usually from a link or a search' },
      { lane: 'adopter', col: 2, content: 'Reads the README pitch: the blueprint stops being a poster and becomes a database' },
      { lane: 'adopter', col: 3, content: 'Clicks through the example deployment and flips between path variants' },
      { lane: 'adopter', col: 4, content: 'Follows the hierarchy figure from lifecycle to phase to scenario to path' },
      { lane: 'adopter', col: 5, content: 'Reads what each of the four skills is for and where it ends' },
      { lane: 'adopter', col: 6, content: 'Opens the guide that matches their role' },
      { lane: 'adopter', col: 7, content: 'Checks the stack, the license, and what a deployment would expose' },
      { lane: 'adopter', col: 8, content: 'Decides to clone the template and try it on a real service' },

      {
        lane: 'frontdoor', col: 2,
        content: 'Positions the queryable blueprint against the static artifact it replaces',
        // The cell spec (FUNCTION / FORM / VALUE) shown in the panel's overview.
        fn: 'Answer “what is this and why would I use it?” before the reader scrolls, so nobody has to clone the kit to find out what it does.',
        form: 'Prose on the repository landing page, opening with the poster-to-database contrast and a link to a live example.',
        valueProps: [
          { for: 'A first-time visitor', value: 'A decision in one screen instead of an afternoon.' },
          { for: 'The maintainers', value: 'Fewer issues asking what the project is for.' },
        ],
        links: [repoLink('README — why a queryable blueprint', 'README.md')],
      },
      { lane: 'frontdoor', col: 3, content: 'Links the live example, with the note that nothing in the repo depends on it' },
      { lane: 'frontdoor', col: 4, content: 'Names the four levels in order — lifecycle, phase, scenario, path — and what each one is for' },
      { lane: 'frontdoor', col: 5, content: 'Summarizes each skill in one table row: what it is for, where it ends' },
      { lane: 'frontdoor', col: 6, content: 'Points each role at one guide instead of asking anyone to read all four' },
      { lane: 'frontdoor', col: 7, content: 'States the exposure note: deployed tables are publicly readable' },
      { lane: 'frontdoor', col: 8, content: 'Says the sample content is meant to be replaced, and which script replaces it' },

      {
        lane: 'demo', col: 3,
        content: 'Example deployment\nPhase overview canvas',
        // The owner pair, deliberately DIFFERENT — the case the docs call the
        // interesting one, and true here: a visitor reads the linked deployment
        // as the product, when it is one team's example of the stock renderer.
        owner: 'Kit maintainers',
        perceivedOwner: 'A hosted product',
        description:
          'The gap between the two owners is the point: nothing in this repository depends on that deployment, and an adopter deploys their own.',
        links: [
          {
            type: 'tech_description',
            label: 'Example deployment',
            description:
              'README links a deployment of the stock renderer, flagged as an example and not a dependency — nothing in this repo needs it.',
          },
        ],
      },
      { lane: 'demo', col: 4, content: 'Cell detail panel\nTrigger arrows\nDependency tab' },
      { lane: 'demo', col: 8, content: 'Clone template\nFork' },

      {
        lane: 'docs', col: 2,
        content: 'README.md',
        links: [repoLink('README.md', 'README.md')],
      },
      {
        lane: 'docs', col: 4,
        content: 'guide/01 — the blueprint model\ndocs/assets figures',
        links: [repoLink('guide/01 — The blueprint model', 'docs/guide/01-the-blueprint-model.md')],
      },
      {
        lane: 'docs', col: 6,
        content: 'guide/02 — using it in practice\nguide/04 — operations',
        links: [
          repoLink('guide/02 — Using it in practice', 'docs/guide/02-using-it-in-practice.md'),
          repoLink('guide/04 — Operations', 'docs/guide/04-operations.md'),
        ],
      },
      {
        lane: 'docs', col: 5,
        content: 'skills/map\nskills/audit\nskills/whatif\nskills/slice',
        description:
          'Four skills, each with its own SKILL.md and references: map builds and imports a blueprint, audit checks it, whatif traces a change through it, slice presents part of it.',
        links: [
          repoLink('skills/map/SKILL.md', 'skills/map/SKILL.md'),
          repoLink('skills/audit/SKILL.md', 'skills/audit/SKILL.md'),
          repoLink('skills/whatif/SKILL.md', 'skills/whatif/SKILL.md'),
          repoLink('skills/slice/SKILL.md', 'skills/slice/SKILL.md'),
        ],
      },
      {
        lane: 'docs', col: 7,
        content: 'LICENSE\nsupabase/DATABASE.md',
        links: [repoLink('supabase/DATABASE.md', 'supabase/DATABASE.md')],
      },
      {
        lane: 'docs', col: 8,
        content: 'AGENTS.md\nguide/03 — the plugin',
        description:
          'What an adopter reads next: the repository conventions an agent follows, and how the kit ships as an installable plugin.',
        links: [
          repoLink('AGENTS.md', 'AGENTS.md'),
          repoLink('guide/03 — The plugin', 'docs/guide/03-the-plugin.md'),
        ],
      },

      { lane: 'maintainers', col: 3, content: 'Keep the example deployment on the current renderer so the demo matches the code' },
      {
        lane: 'maintainers', col: 5,
        content: 'Ship the four skills, their references, and the subagents they dispatch, in this same repository',
        links: [repoLink('agents/ — the subagents the skills dispatch', 'agents/auditor.md')],
      },
      {
        lane: 'maintainers', col: 7,
        content: 'Record what shipped in CHANGELOG.md, release by release',
        links: [repoLink('CHANGELOG.md', 'CHANGELOG.md')],
      },
      {
        lane: 'maintainers', col: 8,
        content: 'Keep the sample content honest: every cell in it is a true statement about the kit',
        links: [
          repoLink('scripts/generate_sample_blueprint.mjs', 'scripts/generate_sample_blueprint.mjs'),
        ],
      },
    ],
    triggers: [
      { from: ['frontdoor', 2], to: ['demo', 3], label: 'See it live' },
      { from: ['adopter', 6], to: ['docs', 6] },
      // Cross-lane UPWARD: the support lane answers back into the front door.
      { from: ['docs', 5], to: ['frontdoor', 5], label: 'one row each' },
      {
        from: ['adopter', 8], to: ['frontdoor', 7], kind: 'needs',
        note: 'The decision to adopt depends on knowing what a public deployment exposes.',
      },
      {
        from: ['adopter', 4], to: ['docs', 4], kind: 'needs',
        note: 'The hierarchy only reads as a hierarchy with the model figures next to it.',
      },
    ],
  },

  // -------------------------------------------------------------------
  // 2 · Clone & first run — the divergent scenario (no-DB vs Supabase)
  // -------------------------------------------------------------------
  {
    ordinal: 2,
    key: 'FIRST_RUN',
    phaseKey: 'ADOPT',
    name: 'Clone & first run',
    description:
      'Two ways to a running app: the zero-config no-database run, and the same journey backed by a local Supabase stack.',
    order: 1,
    viewType: 'side-by-side',
    navViewType: 'stacked',
    spineLane: 'adopter',
    paths: [
      {
        ordinal: 1,
        key: 'NODB',
        name: 'No-database run',
        path_type: 'happy',
        description:
          'Zero config: clone, install, run — the bundled sample content renders with no environment at all.',
      },
      {
        ordinal: 2,
        key: 'SUPABASE',
        name: 'Supabase run',
        path_type: 'alternative',
        description:
          'The same first run backed by a local Supabase stack: migrations, seed, and live reads through the anon key.',
      },
    ],
    steps: [
      'Clone the repository',
      'Install dependencies',
      'Configure the environment',
      'Prepare the database',
      'Start the dev server',
      'Open the app',
      'Walk the sample content',
      'Compare the sample paths',
      'Open a demo slice',
      'Run the test suite',
      'Smoke the agent harness',
      'Deploy a preview',
    ],
    lanes: [
      { row: 0, key: 'visual', name: 'Journey snapshots', role: 'visual' },
      { row: 1, key: 'adopter', name: 'Adopter', role: 'customer_actions' },
      { row: 2, key: 'appfeedback', name: 'App feedback', role: 'frontstage_actions' },
      { row: 3, key: 'appui', name: 'App UI', role: 'frontstage_tech' },
      { row: 4, key: 'datalayer', name: 'Data layer', role: 'backstage_actions' },
      { row: 5, key: 'terminal', name: 'Terminal & scripts', role: 'backstage_tech' },
      // CJK display name — deliberate: lane labels are free-form in any
      // language, and this is the template's non-ASCII rendering smoke test.
      { row: 6, key: 'fixtures', name: '样例数据 · Sample data', role: 'support_systems' },
    ],
    cells: [
      { lane: 'visual', col: 1, content: '' },
      { lane: 'visual', col: 6, content: '' },
      { lane: 'visual', col: 8, content: '' },
      { lane: 'visual', col: 12, content: '' },

      { lane: 'adopter', col: 1, content: 'Clones BilLogic/agentic-service-blueprinting from GitHub' },
      { lane: 'adopter', col: 2, content: 'Runs npm install' },
      {
        lane: 'adopter', col: 3,
        content: {
          NODB: 'Skips .env entirely — the first run needs no environment',
          SUPABASE: 'Copies .env.example to .env and keeps it git-ignored',
        },
      },
      {
        lane: 'adopter', col: 4,
        content: { SUPABASE: 'Runs npm run supabase:start, then npm run supabase:reset' },
      },
      { lane: 'adopter', col: 5, content: 'Runs npm run dev' },
      { lane: 'adopter', col: 6, content: 'Opens localhost:5173 in the browser' },
      {
        lane: 'adopter', col: 7,
        content: {
          NODB: 'Walks the adoption lifecycle rendered from the bundled fixture',
          SUPABASE: 'Walks the same adoption lifecycle, now served from Postgres',
        },
      },
      { lane: 'adopter', col: 8, content: 'Flips Clone & first run between its two paths, stacked and merged' },
      { lane: 'adopter', col: 9, content: 'Opens “The adopter’s first hour” and steps through its frames' },
      { lane: 'adopter', col: 10, content: 'Runs npm test' },
      { lane: 'adopter', col: 11, content: 'Runs node scripts/agent-harness/run.mjs --smoke' },
      {
        lane: 'adopter', col: 12,
        content: {
          NODB: 'Deploys dist/ to any static host — the fallback ships in the bundle',
          SUPABASE: 'Sets VITE_SUPABASE_* at build time, then deploys dist/',
        },
      },

      {
        lane: 'appfeedback', col: 6,
        content: {
          NODB: 'Renders the sample content in no-DB mode, with nothing on the wire',
          SUPABASE: 'Renders the same content from live reads through the anon key',
        },
      },
      { lane: 'appfeedback', col: 7, content: 'Draws the overview canvas: four phases with the Operate → Map loop arrow' },
      { lane: 'appfeedback', col: 8, content: 'Marks shared columns quiet and divergent columns with the striped wash' },
      { lane: 'appfeedback', col: 9, content: 'Presents the slice as frames, each located on the blueprint' },
      { lane: 'appfeedback', col: 10, content: 'Reports the suite green — the same one CI runs, no database required' },
      { lane: 'appfeedback', col: 11, content: 'Reports the smoke case green, with the trace it judged' },

      { lane: 'appui', col: 6, content: 'Landing page\nOverview canvas' },
      // Slot siblings: one cell per touchpoint in the same (lane, step) slot.
      {
        lane: 'appui', col: 8, slot: 0,
        content: 'Stacked compare',
        links: [
          {
            type: 'tech_description',
            label: 'Stacked compare',
            description:
              'Each path renders as its own band; the column highlight marks where the bands disagree.',
          },
        ],
      },
      {
        lane: 'appui', col: 8, slot: 1,
        content: 'Merged compare + ledger',
        fn: 'Answer “where do these two paths actually differ?” in one grid, instead of asking the reader to diff two bands by eye.',
        form: 'A single combined grid: shared cells drawn once over a striped wash and labelled with the paths that share them, differences listed beneath in the ledger.',
        valueProps: [
          { for: 'Anyone comparing paths', value: 'The differences are enumerated, not hunted for.' },
        ],
        links: [
          {
            type: 'tech_description',
            label: 'Merged compare + ledger',
            description:
              'One combined grid per slot: shared cells draw once with member labels over a striped wash; the ledger lists every difference.',
          },
        ],
      },
      {
        lane: 'appui', col: 8, slot: 2,
        content: 'Path picker',
        links: [
          {
            type: 'tech_description',
            label: 'Path picker',
            description:
              'Flips the scenario between one path at a time and the stacked view. Three cells share this one slot — the slot-sibling mechanic tech lanes use for several touchpoints at the same moment.',
          },
        ],
      },
      { lane: 'appui', col: 7, content: 'Phase overview canvas\nScenario detail canvas\nCell detail panel' },
      { lane: 'appui', col: 9, content: 'Slice focus view\nPresentation mode' },
      { lane: 'appui', col: 12, content: 'Static build (dist/)' },

      {
        lane: 'datalayer', col: 3,
        content: {
          NODB: 'Detects missing VITE_SUPABASE_* and switches to the bundled fallback registry',
          SUPABASE: 'Reads VITE_SUPABASE_URL and the anon key from the environment',
        },
      },
      {
        lane: 'datalayer', col: 4,
        content: { SUPABASE: 'Applies every migration in supabase/migrations, then runs supabase/seed.sql' },
        links: [repoLink('supabase/seed.sql', 'supabase/seed.sql')],
      },
      {
        lane: 'datalayer', col: 6,
        content: {
          NODB: 'Resolves blueprints synchronously from src/data/blueprintFallbacks.ts',
          SUPABASE: 'Fetches phases, paths, and cells over PostgREST',
        },
        links: [repoLink('src/data/blueprintFallbacks.ts', 'src/data/blueprintFallbacks.ts')],
      },
      {
        lane: 'datalayer', col: 9,
        content: {
          NODB: 'Serves the demo slices from src/data/sliceFallbacks.ts',
          SUPABASE: 'Reads slices and slice_items rows seeded by the same generator',
        },
        links: [repoLink('src/data/sliceFallbacks.ts', 'src/data/sliceFallbacks.ts')],
      },
      {
        lane: 'datalayer', col: 7,
        content: {
          NODB: 'Answers cell-panel reads from the same bundled cell — owner pair and spec included',
          SUPABASE: 'Fetches the owner pair and the spec columns per cell, on panel open',
        },
        description:
          'The grid query carries only what the grid draws. Owner, perceived owner, function, form and value props are read one cell at a time, when a panel opens.',
      },
      {
        lane: 'datalayer', col: 12,
        content: {
          NODB: 'Nothing to configure at build time — the fallback module is part of the bundle',
          SUPABASE: 'The build bakes in the URL and anon key; the deployed tables are publicly readable',
        },
        description:
          'The exposure note the README states: a deployed build is read-only (write policies are `to authenticated` and there is no sign-in), but everything it can read, a visitor can read.',
      },

      { lane: 'terminal', col: 1, content: 'git clone' },
      { lane: 'terminal', col: 2, content: 'npm install' },
      { lane: 'terminal', col: 3, content: { SUPABASE: 'cp .env.example .env' } },
      { lane: 'terminal', col: 4, content: { SUPABASE: 'Supabase CLI\nDocker' } },
      { lane: 'terminal', col: 5, content: 'Vite dev server' },
      { lane: 'terminal', col: 10, content: 'Vitest — the same suite CI runs' },
      {
        lane: 'terminal', col: 11,
        content: 'Agent harness (--smoke)',
        links: [repoLink('scripts/agent-harness/run.mjs', 'scripts/agent-harness/run.mjs')],
      },
      {
        lane: 'terminal', col: 12,
        content: 'npm run build\nNetlify (or any static host)',
        links: [repoLink('netlify.toml', 'netlify.toml')],
      },

      {
        lane: 'fixtures', col: 6,
        content: 'src/data/sampleBlueprint.ts\nsupabase/seed.sql',
        description:
          'One generator emits both artifacts, so the no-DB fallback and the database seed can never drift apart.',
        // The second differing owner pair, and the one a new adopter most needs
        // to read: what fills the board on a fresh clone is the kit's own
        // sample, not their service — and it is meant to be replaced.
        owner: 'Kit maintainers',
        perceivedOwner: 'Your own service',
        fn: 'Give a keyless clone something true to render, and give every adopter a worked example to replace.',
        form: 'A generated TypeScript module and a matching SQL seed, id-identical, both written by one script.',
        valueProps: [
          { for: 'A new adopter', value: 'The app is never empty, and never lies about what it is showing.' },
          { for: 'The kit', value: 'The sample is documentation that cannot rot silently — it is regenerated, not hand-written.' },
        ],
        links: [repoLink('scripts/generate_sample_blueprint.mjs', 'scripts/generate_sample_blueprint.mjs')],
      },
      {
        lane: 'fixtures', col: 8,
        content: 'One cell spec → two paths',
        description:
          'A cell whose content is written per path key appears only on the paths that name it; a plain string appears on both. That single rule is what produces shared columns, divergent columns and path-only cells for the compare views to sort.',
      },
      { lane: 'fixtures', col: 9, content: 'Demo slices (journey + step + lane)' },
      { lane: 'fixtures', col: 10, content: 'Fixture-pinned Vitest cases' },
      {
        lane: 'fixtures', col: 11,
        content: 'app-surface.entry.ts',
        description:
          'The harness bundles this entry so it offers the agent the exact tool specs the app offers, over the exact sample content the app renders. No copies, so no drift.',
        links: [repoLink('scripts/agent-harness/app-surface.entry.ts', 'scripts/agent-harness/app-surface.entry.ts')],
      },
    ],
    triggers: [
      { from: ['adopter', 4], to: ['terminal', 4], paths: ['SUPABASE'] },
      { from: ['terminal', 5], to: ['appfeedback', 6], label: 'localhost:5173' },
      { from: ['adopter', 10], to: ['terminal', 10] },
      {
        from: ['datalayer', 6], to: ['fixtures', 6], kind: 'needs', paths: ['NODB'],
        note: 'The no-DB read resolves the generated fixture module; without it a keyless clone renders nothing.',
      },
      {
        from: ['datalayer', 6], to: ['datalayer', 4], kind: 'needs', paths: ['SUPABASE'],
        note: 'Live reads depend on the migrations and seed having been applied.',
      },
      // Cross-lane UPWARD: the fixture lane answers back into the panel read.
      { from: ['fixtures', 6], to: ['datalayer', 7], paths: ['NODB'], label: 'same cell' },
      {
        from: ['adopter', 12], to: ['datalayer', 12], kind: 'needs',
        note: 'What a deploy exposes is decided before the deploy, not after it.',
      },
    ],
  },

  // -------------------------------------------------------------------
  // 3 · Map your service — the sb:map journey
  // -------------------------------------------------------------------
  {
    ordinal: 3,
    key: 'MAP_SERVICE',
    phaseKey: 'MAP',
    name: 'Map your service',
    description:
      'The sb:map pipeline: elicitation → draft → validation → adversarial review → per-scenario sign-off → import → deploy.',
    order: 1,
    viewType: 'single',
    navViewType: 'single',
    spineLane: 'adopter',
    paths: [
      {
        ordinal: 1,
        key: 'GUIDED',
        name: 'Guided mapping',
        path_type: 'happy',
        description:
          'A full pass from “map our service” to a deployed blueprint, every phase ending at a deterministic gate.',
      },
    ],
    steps: [
      'Invoke sb:map',
      'Route by what exists',
      'Scope the service',
      'Settle the spine',
      'Read the sources',
      'Draft the structure',
      'Fill cells with provenance',
      'Validate the blueprint file',
      'Preview the render',
      'Adversarial review',
      'Resolve the findings',
      'Sign off per scenario',
      'Generate the fallbacks',
      'Generate the seed',
      'Import and verify',
      'Deploy',
    ],
    lanes: [
      { row: 0, key: 'visual', name: 'Journey snapshots', role: 'visual' },
      { row: 1, key: 'adopter', name: 'Adopter', role: 'customer_actions' },
      { row: 2, key: 'claude', name: 'Claude in the IDE', role: 'frontstage_actions' },
      { row: 3, key: 'preview', name: 'App preview', role: 'frontstage_tech' },
      { row: 4, key: 'agents', name: 'Subagent fleet', role: 'backstage_actions' },
      { row: 5, key: 'scripts', name: 'Pipeline scripts', role: 'backstage_tech' },
      { row: 6, key: 'references', name: 'References', role: 'support_systems' },
      { row: 7, key: 'hooks', name: 'Guardrail hooks', role: 'support_systems' },
    ],
    cells: [
      { lane: 'visual', col: 1, content: '' },
      { lane: 'visual', col: 6, content: '' },
      { lane: 'visual', col: 9, content: '' },
      { lane: 'visual', col: 12, content: '' },
      { lane: 'visual', col: 16, content: '' },

      { lane: 'adopter', col: 1, content: 'Asks for a service to be mapped — from documents, a diagram, or nothing at all' },
      { lane: 'adopter', col: 3, content: 'Answers the scoping question: one flow now, or the whole service' },
      { lane: 'adopter', col: 4, content: 'Names whose journey runs along the spine' },
      { lane: 'adopter', col: 6, content: 'Nods on the proposed step and lane outline before anything is built' },
      { lane: 'adopter', col: 7, content: 'Answers per-lane questions as the cells fill in' },
      { lane: 'adopter', col: 9, content: 'Reads the rendered draft in the browser' },
      { lane: 'adopter', col: 11, content: 'Decides which review findings to accept' },
      { lane: 'adopter', col: 12, content: 'Signs off each scenario against its content hash' },
      { lane: 'adopter', col: 16, content: 'Shares the deployed URL with the team' },

      { lane: 'claude', col: 1, content: 'Loads the sb:map skill and its elicitation protocol' },
      { lane: 'claude', col: 2, content: 'Routes by what exists: co-create, ingest, translate, or resume' },
      { lane: 'claude', col: 3, content: 'Right-sizes the scope before structuring anything' },
      { lane: 'claude', col: 4, content: 'Settles the spine before drawing lanes' },
      { lane: 'claude', col: 5, content: 'Dispatches document-readers instead of reading sources in its own context' },
      { lane: 'claude', col: 6, content: 'Proposes the outline as plain text and waits for a nod' },
      { lane: 'claude', col: 7, content: 'Writes cells with per-claim provenance, never inventing content' },
      { lane: 'claude', col: 8, content: 'Runs the validator until it exits 0' },
      { lane: 'claude', col: 10, content: 'Dispatches a fresh-context reviewer that never saw the drafting' },
      { lane: 'claude', col: 11, content: 'Fixes accepted findings in the blueprint file' },
      { lane: 'claude', col: 12, content: 'Computes the sign-off hash and records the approval' },
      { lane: 'claude', col: 13, content: 'Generates the no-database fallback module and registers it' },
      { lane: 'claude', col: 14, content: 'Generates the transactional seed' },
      { lane: 'claude', col: 15, content: 'Imports through the service account and verifies by reading back' },
      { lane: 'claude', col: 16, content: 'Deploys, then dispatches the render-checker over the live app' },

      { lane: 'preview', col: 9, slot: 0, content: 'Vite dev server' },
      {
        lane: 'preview', col: 9, slot: 1,
        content: 'Overview canvas',
        links: [
          {
            type: 'tech_description',
            label: 'Overview canvas',
            description:
              'The birds-eye view: phases in order, the loop arrow where a phase feeds back, scenarios beneath their phase.',
          },
        ],
      },
      { lane: 'preview', col: 9, slot: 2, content: 'Cell detail panel' },
      { lane: 'preview', col: 15, content: 'Imported scenario, read back live' },
      { lane: 'preview', col: 16, content: 'Deployed static build' },

      {
        lane: 'agents', col: 5,
        content: 'document-reader returns structure, keeping raw source text out of the main context',
        links: [repoLink('agents/document-reader.md', 'agents/document-reader.md')],
      },
      {
        lane: 'agents', col: 10,
        content: 'blueprint-reviewer returns numbered findings with severities',
        links: [repoLink('agents/blueprint-reviewer.md', 'agents/blueprint-reviewer.md')],
      },
      {
        lane: 'agents', col: 16,
        content: 'render-checker walks every scenario and screenshots each view',
        links: [repoLink('agents/render-checker.md', 'agents/render-checker.md')],
      },

      {
        lane: 'scripts', col: 6,
        content: 'blueprint/blueprint.json\nblueprint-workspace.json',
        description:
          'Where the blueprint lives before it is a database: the IR file the skills read and write, and the workspace-state file that tracks which scenarios are pending, drafted, signed off, or imported.',
        links: [
          repoLink('workspace-state.md', 'skills/map/references/workspace-state.md'),
          repoLink('references/ir-schema.json', 'references/ir-schema.json'),
        ],
      },
      {
        lane: 'scripts', col: 8,
        content: 'validate_ir.py (stdlib-only)',
        description:
          'No dependencies to install: the validator runs on a stock Python 3. It exits non-zero on any error, and the drafting phase does not end until it exits 0.',
        links: [repoLink('scripts/validate_ir.py', 'scripts/validate_ir.py')],
      },
      {
        lane: 'scripts', col: 12,
        content: 'compute_signoff_hash.py',
        fn: 'Bind an approval to exactly the content that was approved, so a later edit cannot inherit yesterday’s sign-off.',
        form: 'A hash computed over one scenario’s content and recorded with the approval in the workspace file.',
        valueProps: [
          { for: 'The person approving', value: 'What they signed is recoverable, not remembered.' },
          { for: 'The next session', value: 'A changed scenario shows as unsigned instead of quietly passing.' },
        ],
        links: [repoLink('scripts/compute_signoff_hash.py', 'scripts/compute_signoff_hash.py')],
      },
      {
        lane: 'scripts', col: 13,
        content: 'generate_fallbacks.py --register',
        description:
          'The script always writes the generated fallback module. --register additionally rewrites the two marker-delimited blocks in place — the registry in src/data/blueprintFallbacks.ts and the nav in src/types/nav.ts — so the app imports the new module. Without it the script prints those blocks for you to paste.',
        links: [repoLink('scripts/generate_fallbacks.py', 'scripts/generate_fallbacks.py')],
      },
      {
        lane: 'scripts', col: 14,
        content: 'generate_seed_sql.py',
        links: [repoLink('scripts/generate_seed_sql.py', 'scripts/generate_seed_sql.py')],
      },
      { lane: 'scripts', col: 15, content: 'Supabase CLI\nPostgREST read-back' },

      {
        lane: 'references', col: 1,
        content: 'elicitation-protocol.md',
        links: [repoLink('skills/map/references/elicitation-protocol.md', 'skills/map/references/elicitation-protocol.md')],
      },
      {
        lane: 'references', col: 4,
        content: 'lane-vocabulary.md\nlayer-roles.md',
        links: [repoLink('references/layer-roles.md', 'references/layer-roles.md')],
      },
      {
        lane: 'references', col: 6,
        content: 'data-model.md\nir-schema.json',
        links: [repoLink('references/data-model.md', 'references/data-model.md')],
      },
      {
        lane: 'references', col: 16,
        content: 'deploy-notes.md',
        links: [repoLink('skills/map/references/deploy-notes.md', 'skills/map/references/deploy-notes.md')],
      },

      {
        lane: 'hooks', col: 7,
        content: 'validate_ir_on_edit.py — re-validates the blueprint file on every edit',
        links: [repoLink('hooks/validate_ir_on_edit.py', 'hooks/validate_ir_on_edit.py')],
      },
      {
        lane: 'hooks', col: 15,
        content: 'secret_guard.py — the service-role key never reaches disk or transcript',
        owner: 'The adopter’s own machine',
        perceivedOwner: 'The kit',
        description:
          'The guard runs in the adopter’s harness, on their machine — the kit ships the hook, it does not hold the key.',
        links: [repoLink('hooks/secret_guard.py', 'hooks/secret_guard.py')],
      },
    ],
    triggers: [
      { from: ['claude', 5], to: ['agents', 5] },
      { from: ['claude', 10], to: ['agents', 10] },
      // Cross-lane UPWARD: the reviewer's findings come back up to Claude.
      { from: ['agents', 10], to: ['claude', 11], label: 'findings' },
      { from: ['scripts', 6], to: ['claude', 7], label: 'the IR file' },
      { from: ['adopter', 6], to: ['claude', 7], label: 'nod' },
      // Backward in-lane rework loop: accepted findings send the draft back.
      {
        from: ['claude', 11], to: ['claude', 7], label: 'rework',
        note: 'Accepted findings send the draft back to cell-filling before a re-validate.',
      },
      {
        from: ['claude', 15], to: ['claude', 14], kind: 'needs',
        note: 'The import consumes the generated seed.',
      },
      {
        from: ['adopter', 12], to: ['scripts', 12], kind: 'needs',
        note: 'Sign-off is bound to a content hash, not a feeling.',
      },
    ],
  },

  // -------------------------------------------------------------------
  // 4 · Review & present — sb:slice for stakeholders
  // -------------------------------------------------------------------
  {
    ordinal: 4,
    key: 'PRESENT',
    phaseKey: 'OPERATE',
    name: 'Review & present',
    description:
      'sb:slice takes one stakeholder view out of the blueprint and carries it into presentation mode and PDF.',
    order: 1,
    viewType: 'single',
    navViewType: 'single',
    spineLane: 'stakeholder',
    paths: [
      {
        ordinal: 1,
        key: 'READOUT',
        name: 'Stakeholder readout',
        path_type: 'happy',
        description: 'From “show me my part” to a presented, exportable slice that still points at its cells.',
      },
    ],
    steps: [
      'Ask for a view',
      'Choose the slice type',
      'Compose the frames',
      'Validate the slice',
      'Review the claims',
      'Import the slice',
      'Enter presentation mode',
      'Walk the frames',
      'Export to PDF',
    ],
    lanes: [
      { row: 0, key: 'stakeholder', name: 'Stakeholder', role: 'customer_actions' },
      { row: 1, key: 'skill', name: 'sb:slice in the IDE', role: 'frontstage_actions' },
      { row: 2, key: 'stage', name: 'Presentation surface', role: 'frontstage_tech' },
      { row: 3, key: 'reviewer', name: 'Reviewer', role: 'backstage_actions' },
      { row: 4, key: 'pipeline', name: 'Slice pipeline', role: 'backstage_tech' },
      { row: 5, key: 'tables', name: 'Derived tables', role: 'support_systems' },
    ],
    cells: [
      { lane: 'stakeholder', col: 1, content: 'Asks for just the part of the service that concerns their team' },
      { lane: 'stakeholder', col: 3, content: 'Nods on the proposed frames, or names the cells they wanted instead' },
      { lane: 'stakeholder', col: 5, content: 'Sees which claims the reviewer could not trace, before anything is presented' },
      { lane: 'stakeholder', col: 7, content: 'Watches one frame at a time on the dark stage' },
      { lane: 'stakeholder', col: 8, content: 'Follows the locator showing where each frame sits on the blueprint' },
      { lane: 'stakeholder', col: 9, content: 'Takes the PDF away; the slice still points at the cells it quotes' },

      { lane: 'skill', col: 2, content: 'Picks one of five slice types: journey, step, lane, cell, or custom' },
      { lane: 'skill', col: 3, content: 'Proposes member cells by name, in journey order, and waits for a nod' },
      { lane: 'skill', col: 4, content: 'Runs the slice validator until it exits 0' },
      { lane: 'skill', col: 5, content: 'Waits for the claim review before importing — a slice that quotes nothing is not shippable' },
      { lane: 'skill', col: 6, content: 'Imports the slice; items carry cell ids paired with cell keys' },
      { lane: 'skill', col: 7, content: 'Hands off to the app: the skill’s job ends at the import, presentation is the app’s' },

      {
        lane: 'stage', col: 7,
        content: 'Dark stage\nFilmstrip',
        fn: 'Hold one frame at a time in front of a room, without losing the fact that every frame came from a cell on the board.',
        form: 'A darkened full-bleed stage with a filmstrip of the remaining frames along the edge.',
        valueProps: [
          { for: 'The stakeholder', value: 'Their part of the service, in their language, at their length.' },
          { for: 'The blueprint owner', value: 'One artefact to present instead of a deck that drifts from the board.' },
        ],
      },
      { lane: 'stage', col: 8, content: 'Blueprint locator' },
      { lane: 'stage', col: 9, content: 'Print / PDF export' },

      {
        lane: 'reviewer', col: 5,
        content: 'blueprint-reviewer (slice mode) checks every claim traces to a cited cell',
        description:
          'A fresh context that never saw the drafting: nothing invented, nothing quoted that no cell says.',
        links: [repoLink('agents/blueprint-reviewer.md', 'agents/blueprint-reviewer.md')],
      },

      {
        lane: 'pipeline', col: 2,
        content: 'Five slice types: journey / step / lane / cell / custom',
        description:
          'The type decides the shape of the read: a journey follows one actor along the board, a step reads one column top to bottom, a lane follows one row across, a cell zooms in on one moment, custom is any hand-picked set.',
        links: [repoLink('skills/slice/SKILL.md', 'skills/slice/SKILL.md')],
      },
      {
        lane: 'pipeline', col: 3,
        content: 'slice_tools.py',
        links: [repoLink('skills/slice/scripts/slice_tools.py', 'skills/slice/scripts/slice_tools.py')],
      },
      {
        lane: 'pipeline', col: 4,
        content: 'slice-schema.json',
        links: [repoLink('skills/slice/references/slice-schema.json', 'skills/slice/references/slice-schema.json')],
      },
      { lane: 'pipeline', col: 6, content: 'slice_tools.py import\nRead-back verify' },

      {
        lane: 'tables', col: 6,
        content: 'slices\nslice_items',
        links: [
          {
            type: 'tech_description',
            label: 'slice_items',
            description:
              'Slice items reference cells softly — uuid arrays paired with cell keys — so a scenario re-import never cascades into a presentation.',
          },
        ],
      },
    ],
    triggers: [
      { from: ['skill', 6], to: ['stage', 7] },
      { from: ['skill', 4], to: ['pipeline', 4] },
      // Cross-lane UPWARD: the reviewer's verdict comes back to the skill.
      { from: ['reviewer', 5], to: ['skill', 6], label: 'clean' },
      { from: ['pipeline', 2], to: ['skill', 2] },
      {
        from: ['skill', 6], to: ['skill', 4], kind: 'needs',
        note: 'Only a validated slice is importable.',
      },
      {
        from: ['skill', 6], to: ['reviewer', 5], kind: 'needs',
        note: 'The import waits for the fresh-context claim review to come back clean.',
      },
    ],
  },

  // -------------------------------------------------------------------
  // 5 · Keep it true — audit → whatif → fix → re-import, looping
  // -------------------------------------------------------------------
  {
    ordinal: 5,
    key: 'STEWARD',
    phaseKey: 'OPERATE',
    name: 'Keep it true',
    description:
      'The stewardship loop: sb:audit finds drift, sb:whatif traces the fix, the re-import lands it — then the loop runs again.',
    order: 2,
    viewType: 'single',
    navViewType: 'single',
    spineLane: 'steward',
    paths: [
      {
        ordinal: 1,
        key: 'LOOP',
        name: 'Stewardship loop',
        path_type: 'happy',
        description: 'Audit finding → traced fix → re-import → re-audit; agent sessions answer from the result.',
      },
    ],
    steps: [
      'Notice drift',
      'Run the audit roster',
      'Triage the findings',
      'Trace a proposed change',
      'Decide the fix',
      'Update the blueprint file',
      'Re-validate',
      'Re-import',
      'Verify the render',
      'Ask the agent',
      'Answer from the blueprint',
    ],
    // Like Discover the kit, this scenario is ordered so the backstage-actions
    // lane sits directly above the support lane and the LINE OF INTERNAL
    // INTERACTION draws — the hand-off from the auditors to what they read.
    lanes: [
      { row: 0, key: 'steward', name: 'Steward', role: 'customer_actions' },
      { row: 1, key: 'skills', name: 'sb:audit & sb:whatif', role: 'frontstage_actions' },
      { row: 2, key: 'findingsui', name: 'Findings & agent surface', role: 'frontstage_tech' },
      { row: 3, key: 'machinery', name: 'Audit machinery', role: 'backstage_tech' },
      { row: 4, key: 'auditors', name: 'Auditor fleet', role: 'backstage_actions' },
      { row: 5, key: 'checkdocs', name: 'Check docs & references', role: 'support_systems' },
    ],
    cells: [
      { lane: 'steward', col: 1, content: 'Notices the service has drifted from what the blueprint says' },
      { lane: 'steward', col: 2, content: 'Names the scenario to audit and lets the whole roster run' },
      { lane: 'steward', col: 3, content: 'Triages each finding: accept, dismiss, or resolve' },
      { lane: 'steward', col: 8, content: 'Watches the re-import report the unchanged scenarios as no-ops' },
      { lane: 'steward', col: 5, content: 'Decides the fix on the traced copy, before anything moves' },
      { lane: 'steward', col: 9, content: 'Checks the re-imported scenario renders as expected' },
      { lane: 'steward', col: 10, content: 'Asks a question in chat instead of opening the canvas' },

      { lane: 'skills', col: 2, content: 'Runs the roster; findings land as triageable rows, not chat opinion' },
      { lane: 'skills', col: 4, content: 'sb:whatif walks trigger and needs edges downstream from the change' },
      { lane: 'skills', col: 6, content: 'Applies the accepted fixes to blueprint.json' },
      { lane: 'skills', col: 7, content: 'Re-runs validate_ir.py until it exits 0' },
      { lane: 'skills', col: 8, content: 'Re-imports; an unchanged scenario hashes to a no-op' },
      { lane: 'skills', col: 11, content: 'Answers with links back to the exact cells it read' },

      { lane: 'findingsui', col: 3, content: 'Findings list\nStatus chips (open / resolved / dismissed)' },
      {
        lane: 'findingsui', col: 10,
        content: 'Agent panel\nProvider & key settings',
        description:
          'How the agent gets a key: you paste your own, for whichever provider you pick. It is kept in this browser’s localStorage and nowhere else — no key is built into the app and none is held by anyone but you.',
        owner: 'You — bring your own key',
        perceivedOwner: 'A backend this app runs',
      },
      { lane: 'findingsui', col: 11, content: 'Scenario navigation\nCell focus' },

      {
        lane: 'auditors', col: 2,
        content: 'One auditor per check, seeing only that check’s doc and the export',
        links: [repoLink('agents/auditor.md', 'agents/auditor.md')],
      },
      {
        lane: 'auditors', col: 4,
        content: 'impact-tracer returns affected cells and the assumptions the change breaks',
        description:
          'It walks trigger and needs edges downstream, terminating on cyclic graphs with a visited set and a depth cap — loops are legal here, so it has to survive them.',
        links: [repoLink('agents/impact-tracer.md', 'agents/impact-tracer.md')],
      },

      {
        lane: 'machinery', col: 2,
        content: 'audit_tools.py',
        fn: 'Run the roster as machinery rather than judgement: one blind auditor per check, output validated against a fixed findings shape.',
        form: 'A stdlib-only Python module the skill calls, plus one export of the blueprint that every auditor reads.',
        valueProps: [
          { for: 'The steward', value: 'Findings arrive as triageable rows, not as a chat opinion to argue with.' },
          { for: 'The next run', value: 'Fingerprints dedupe repeats, so a re-audit surfaces what changed.' },
        ],
        links: [repoLink('skills/audit/scripts/audit_tools.py', 'skills/audit/scripts/audit_tools.py')],
      },
      { lane: 'machinery', col: 3, content: 'Finding fingerprints — check name + sorted cell keys, so re-runs dedupe' },
      {
        lane: 'machinery', col: 4,
        content: 'Downstream graph walk\nVisited set + depth cap',
      },
      { lane: 'machinery', col: 8, content: 'Content-hash idempotence' },
      {
        lane: 'machinery', col: 10,
        content: 'Fixed read/write tool surface\nlocalStorage key',
        description:
          'The agent has a fixed set of tools and no SQL: it answers from the same reads the app makes. With no database configured it reads the bundled sample content instead — the same content the canvas is drawing.',
        links: [repoLink('src/lib/agent/role.md', 'src/lib/agent/role.md')],
      },

      {
        lane: 'checkdocs', col: 2,
        content: 'check-gap-sweep.md\ncheck-jargon-lint.md\ncheck-channel-conflict.md',
        description: 'Three of the roster’s eight checks; the audit playbook lists them all.',
        links: [
          repoLink('skills/audit/references/check-gap-sweep.md', 'skills/audit/references/check-gap-sweep.md'),
          repoLink('references/audit-playbook.md', 'references/audit-playbook.md'),
        ],
      },
      {
        lane: 'checkdocs', col: 3,
        content: 'findings table\naudit/findings-report.json',
        description:
          'Where findings go: rows in the findings table when a database is reachable, and audit/findings-report.json as the ledger when one is not — the audit still runs, straight against the IR files.',
        links: [repoLink('skills/audit/SKILL.md', 'skills/audit/SKILL.md')],
      },
      {
        lane: 'checkdocs', col: 6,
        content: 'ir-schema.json\ndata-model.md',
        links: [
          repoLink('references/ir-schema.json', 'references/ir-schema.json'),
          repoLink('references/data-model.md', 'references/data-model.md'),
        ],
      },
      {
        lane: 'checkdocs', col: 10,
        content: 'agent role.md\nskill references, read in-app',
        description:
          'The in-app agent reads the same reference docs the IDE skills read; read_reference is one of its tools.',
        links: [repoLink('src/lib/agent/role.md', 'src/lib/agent/role.md')],
      },
    ],
    triggers: [
      { from: ['skills', 2], to: ['auditors', 2] },
      { from: ['steward', 3], to: ['skills', 4] },
      // Cross-lane UPWARD: the auditors' findings surface to the steward's view.
      { from: ['auditors', 2], to: ['findingsui', 3], label: 'findings' },
      { from: ['machinery', 10], to: ['findingsui', 10] },
      // The canonical backward loop: re-import sends the steward back around.
      {
        from: ['skills', 8], to: ['skills', 2], label: 're-audit',
        note: 'A re-import sends the loop back to the roster: audit, fix, import, verify — the Operate phase in miniature.',
      },
      {
        from: ['skills', 8], to: ['skills', 7], kind: 'needs',
        note: 'Only a re-validated file is re-importable.',
      },
    ],
  },
]

// ---------------------------------------------------------------------------
// Build: specs → per-path BlueprintData
// ---------------------------------------------------------------------------

function laneByKey(scenario, key) {
  const lane = scenario.lanes.find((entry) => entry.key === key)
  if (!lane) throw new Error(`scenario ${scenario.key}: unknown lane "${key}"`)
  return lane
}

/** Cells of one scenario resolved onto one path (skipping absent per-path cells). */
function resolveCellsForPath(scenario, path) {
  const resolved = []
  for (const spec of scenario.cells) {
    const lane = laneByKey(scenario, spec.lane)
    const slot = spec.slot ?? 0
    let content
    if (typeof spec.content === 'string') content = spec.content
    else if (spec.content && typeof spec.content === 'object') {
      if (!(path.key in spec.content)) continue
      content = spec.content[path.key]
    } else throw new Error(`scenario ${scenario.key}: bad content at ${spec.lane}:${spec.col}`)
    resolved.push({ lane, col: spec.col, slot, content, spec })
  }
  return resolved
}

function buildScenario(scenario) {
  const S = scenario.ordinal
  const steps = scenario.steps.map((name, index) => ({
    id: fid(S, 0, KIND.step, index + 1, 0),
    name,
    column_position: index + 1,
  }))

  const blueprints = scenario.paths.map((path) => {
    const P = path.ordinal
    const layers = scenario.lanes.map((lane) => ({
      id: fid(S, P, KIND.layer, lane.row, 0),
      name: lane.name,
      role: lane.role === 'visual' ? 'visual' : lane.role,
      row_position: lane.row,
    }))

    const resolved = resolveCellsForPath(scenario, path)
    const cells = resolved.map(({ lane, col, slot, content, spec }) => ({
      id: fid(S, P, KIND.cell, lane.row, slot * 100 + col),
      layer_id: fid(S, P, KIND.layer, lane.row, 0),
      step_id: steps[col - 1].id,
      content,
      picture: null,
      description: spec.description ?? null,
      links: spec.links ?? [],
      ...(slot > 0 ? { slot_position: slot } : {}),
      // Cell spec — emitted only where authored, so the fixture stays lean.
      // `fn` in the spec, `function` on the row: the column is named for the
      // service-blueprint canon (FUNCTION / FORM / VALUE).
      ...(spec.owner ? { owner: spec.owner } : {}),
      ...(spec.perceivedOwner ? { perceived_owner: spec.perceivedOwner } : {}),
      ...(spec.fn ? { function: spec.fn } : {}),
      ...(spec.form ? { form: spec.form } : {}),
      ...(spec.valueProps ? { value_props: spec.valueProps } : {}),
    }))

    const hasCell = (laneKey, col) =>
      resolved.some((cell) => cell.lane.key === laneKey && cell.col === col && cell.slot === 0)
    const cellId = (laneKey, col) =>
      fid(S, P, KIND.cell, laneByKey(scenario, laneKey).row, col)

    const triggerSpecs = []
    // Forward chain along the customer spine (consecutive existing cells).
    const spineCols = resolved
      .filter((cell) => cell.lane.key === scenario.spineLane && cell.slot === 0)
      .map((cell) => cell.col)
      .sort((a, b) => a - b)
    for (let i = 0; i < spineCols.length - 1; i += 1) {
      triggerSpecs.push({
        from: [scenario.spineLane, spineCols[i]],
        to: [scenario.spineLane, spineCols[i + 1]],
      })
    }
    for (const trig of scenario.triggers) {
      if (trig.paths && !trig.paths.includes(path.key)) continue
      for (const [laneKey, col] of [trig.from, trig.to]) {
        if (!hasCell(laneKey, col)) {
          throw new Error(
            `scenario ${scenario.key} path ${path.key}: trigger references missing cell (${laneKey}:${col})`,
          )
        }
      }
      triggerSpecs.push(trig)
    }

    const triggers = triggerSpecs.map((trig, index) => ({
      id: fid(S, P, KIND.trigger, index + 1, 0),
      source_cell_id: cellId(trig.from[0], trig.from[1]),
      target_cell_id: cellId(trig.to[0], trig.to[1]),
      ...(trig.kind === 'needs' ? { kind: 'needs' } : {}),
      ...(trig.label ? { label: trig.label } : {}),
      ...(trig.note ? { note: trig.note } : {}),
    }))

    return {
      path: {
        id: fid(S, P, KIND.path, 0, 0),
        name: path.name,
        description: path.description,
        note: null,
        path_type: path.path_type,
      },
      layers,
      steps,
      cells,
      triggers,
    }
  })

  return { scenario, id: fid(S, 0, KIND.path, 0, 1), steps, blueprints }
}

const built = SCENARIOS.map(buildScenario)
const scenarioById = new Map(built.map((entry) => [entry.scenario.key, entry]))

// ---------------------------------------------------------------------------
// Cell keys — the IMPORT key convention (6 segments: lifecycle/phase/
// scenario/path/layer/step), matching scripts/generate_seed_sql.py and
// slice_tools.cell_key(). App-minted keys (`mint_cell_key`) use their own
// form; the two never collide because seeds and app-created cells are
// distinct rows. Slot-sibling cells (slot > 0) carry NO key: the 6-segment
// identity names the slot, and cells.cell_key is unique — the slot's first
// cell owns the key, siblings are recovered by position.
// ---------------------------------------------------------------------------

/**
 * Segment slug, mirroring the SQL `key_slug` exactly: ascii slug when the
 * name has ascii, else a deterministic md5 fragment so non-ASCII (CJK)
 * segments are never silently dropped from a key.
 */
const keySlug = (value) => {
  const raw = String(value ?? '')
  if (raw === '') return null
  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug !== '' ? slug : `x${createHash('md5').update(raw).digest('hex').slice(0, 8)}`
}

const cellKeyFor = (scenario, pathName, layerName, stepName) =>
  [
    keySlug(LIFECYCLE.name),
    keySlug(phaseByKey[scenario.phaseKey].name),
    keySlug(scenario.name),
    keySlug(pathName),
    keySlug(layerName),
    keySlug(stepName),
  ].join('/')

// ---------------------------------------------------------------------------
// Demo slices — the derived layer's zero-config content: a journey slice
// over the first-run happy path and a step slice at the sign-off moment.
// ---------------------------------------------------------------------------

function demoCellRef(scenarioKey, pathKey, laneKey, col) {
  const { scenario, blueprints } = scenarioById.get(scenarioKey)
  const path = scenario.paths.find((entry) => entry.key === pathKey)
  const lane = laneByKey(scenario, laneKey)
  const id = fid(scenario.ordinal, path.ordinal, KIND.cell, lane.row, col)
  const blueprint = blueprints.find((bp) => bp.path.id === fid(scenario.ordinal, path.ordinal, KIND.path, 0, 0))
  if (!blueprint.cells.some((cell) => cell.id === id)) {
    throw new Error(`demo slice references missing cell (${scenarioKey}/${pathKey}/${laneKey}:${col})`)
  }
  return {
    id,
    key: cellKeyFor(scenario, path.name, lane.name, scenario.steps[col - 1]),
  }
}

function buildDemoSlices() {
  const timestamps = {
    created_by: null,
    created_at: FIXTURE_TIMESTAMP,
    updated_at: FIXTURE_TIMESTAMP,
  }
  const item = (sliceOrdinal, sliceId, position, caption, narrative, refs) => ({
    id: fid(0, 0, KIND.sliceItem, sliceOrdinal, position),
    slice_id: sliceId,
    position,
    caption,
    narrative,
    created_by: null,
    illustration: null,
    cell_ids: refs.map((ref) => ref.id),
    cell_keys: refs.map((ref) => ref.key),
    created_at: FIXTURE_TIMESTAMP,
    updated_at: FIXTURE_TIMESTAMP,
  })

  const journeyId = fid(0, 0, KIND.slice, 1, 0)
  const journey = {
    slice: {
      id: journeyId,
      service_lifecycle_id: LIFECYCLE_ID,
      title: 'The adopter’s first hour',
      description:
        'From git clone to a green harness smoke, on the no-database path — the hour the template promises to anyone with npm.',
      actor: 'Adopter',
      slice_type: 'journey',
      origin: 'generated',
      locale: 'en',
      position: 1,
      ...timestamps,
    },
    items: [
      item(1, journeyId, 1, 'Clone and install', 'Two commands stand between the repository and a working checkout.', [
        demoCellRef('FIRST_RUN', 'NODB', 'adopter', 1),
        demoCellRef('FIRST_RUN', 'NODB', 'adopter', 2),
      ]),
      item(1, journeyId, 2, 'First light', 'With no environment at all, the dev server renders the bundled sample content.', [
        demoCellRef('FIRST_RUN', 'NODB', 'adopter', 5),
        demoCellRef('FIRST_RUN', 'NODB', 'adopter', 6),
      ]),
      item(1, journeyId, 3, 'Prove it works', 'The test suite and the agent-harness smoke run green on a fresh clone.', [
        demoCellRef('FIRST_RUN', 'NODB', 'adopter', 10),
        demoCellRef('FIRST_RUN', 'NODB', 'adopter', 11),
      ]),
    ],
  }

  const stepId = fid(0, 0, KIND.slice, 2, 0)
  const step = {
    slice: {
      id: stepId,
      service_lifecycle_id: LIFECYCLE_ID,
      title: 'The sign-off moment',
      description:
        'One step of Map your service read vertically: who approves a scenario, and what binds the approval.',
      actor: null,
      slice_type: 'step',
      origin: 'generated',
      locale: 'en',
      position: 2,
      ...timestamps,
    },
    items: [
      item(2, stepId, 1, 'Who approves', 'The adopter signs off each scenario; Claude records the approval against a hash, not a feeling.', [
        demoCellRef('MAP_SERVICE', 'GUIDED', 'adopter', 12),
        demoCellRef('MAP_SERVICE', 'GUIDED', 'claude', 12),
      ]),
      item(2, stepId, 2, 'What binds it', 'compute_signoff_hash.py turns the scenario content into the hash the approval records.', [
        demoCellRef('MAP_SERVICE', 'GUIDED', 'scripts', 12),
      ]),
    ],
  }

  return [journey, step]
}

const demoSlices = buildDemoSlices()

// ---------------------------------------------------------------------------
// TS emission
// ---------------------------------------------------------------------------

function emitList(items, indent) {
  return items.map((item) => `${indent}${JSON.stringify(item)},`).join('\n')
}

function emitBlueprint(exportName, blueprint) {
  return `export const ${exportName}: BlueprintData = {
  path: ${JSON.stringify(blueprint.path)},
  layers: [
${emitList(blueprint.layers, '    ')}
  ],
  steps: [
${emitList(blueprint.steps, '    ')}
  ],
  cells: [
${emitList(blueprint.cells, '    ')}
  ],
  triggers: [
${emitList(blueprint.triggers, '    ')}
  ],
}
`
}

const totals = built.flatMap(({ scenario, blueprints }) =>
  blueprints.map((bp) => ({
    label: `${scenario.name} · ${bp.path.name}`,
    layers: bp.layers.length,
    steps: bp.steps.length,
    cells: bp.cells.length,
    triggers: bp.triggers.length,
  })),
)

const exportKeyFor = (scenario, path) => `SAMPLE_${scenario.key}_${path.key}`

const header = `// GENERATED by scripts/generate_sample_blueprint.mjs — edit the generator, not this file.
//
// The template's sample content is the META-BLUEPRINT: the service blueprint
// of this template itself. One lifecycle (${LIFECYCLE.name}), four phases
// (Discover → Adopt → Map → Operate, Operate looping back to Map), five
// scenarios covering the kit's real flows — discovery, the zero-config vs
// Supabase first run (two genuinely divergent paths), the sb:map pipeline,
// sb:slice presentation, and the audit/whatif stewardship loop. Every cell
// is a true statement about how the kit behaves, so the sample doubles as
// documentation. Registered as the offline fallback content in
// src/data/blueprintFallbacks.ts and src/types/nav.ts; the matching database
// seed is generated into supabase/seed.sql.
//
// Dimensions:
${totals
  .map(
    (t) =>
      `//   ${t.label}: ${t.layers} lanes, ${t.steps} steps, ${t.cells} cells, ${t.triggers} triggers`,
  )
  .join('\n')}

import type { BlueprintData } from '@/types/blueprint'
import type { Slice, SliceItem } from '@/types/database'

export const SAMPLE_LIFECYCLE_ID = '${LIFECYCLE_ID}'

export type SamplePhase = {
  id: string
  name: string
  description: string
  order_position: number
  loops_to_phase_id: string | null
}

export const SAMPLE_PHASES: SamplePhase[] = [
${PHASES.map((phase) =>
  `  ${JSON.stringify({
    id: phaseId(phase.ordinal),
    name: phase.name,
    description: phase.description,
    order_position: phase.ordinal,
    loops_to_phase_id: phase.loopsToKey ? phaseId(phaseByKey[phase.loopsToKey].ordinal) : null,
  })},`,
).join('\n')}
]

export type SampleScenario = {
  id: string
  phase_id: string
  name: string
  description: string
  order_position: number
  /** Client-vocabulary view type for the offline nav. */
  view_type: 'single' | 'stacked'
  path_ids: string[]
}

export const SAMPLE_SCENARIOS: SampleScenario[] = [
${built
  .map(
    ({ scenario, id, blueprints }) =>
      `  ${JSON.stringify({
        id,
        phase_id: phaseId(phaseByKey[scenario.phaseKey].ordinal),
        name: scenario.name,
        description: scenario.description,
        order_position: scenario.order,
        view_type: scenario.navViewType,
        path_ids: blueprints.map((bp) => bp.path.id),
      })},`,
  )
  .join('\n')}
]

`

const body = built
  .flatMap(({ scenario, blueprints }) =>
    blueprints.map((bp) => {
      const path = scenario.paths.find((p) => fid(scenario.ordinal, p.ordinal, KIND.path, 0, 0) === bp.path.id)
      return emitBlueprint(`${exportKeyFor(scenario, path)}_PATH_FALLBACK`, bp)
    }),
  )
  .join('\n')

const footer = `
/** Path fallbacks per scenario, in picker order. */
export const SAMPLE_BLUEPRINTS_BY_SCENARIO: Record<string, BlueprintData[]> = {
${built
  .map(
    ({ scenario, id, blueprints }) =>
      `  '${id}': [\n${blueprints
        .map((bp) => {
          const path = scenario.paths.find(
            (p) => fid(scenario.ordinal, p.ordinal, KIND.path, 0, 0) === bp.path.id,
          )
          return `    ${exportKeyFor(scenario, path)}_PATH_FALLBACK,`
        })
        .join('\n')}\n  ],`,
  )
  .join('\n')}
}

/**
 * Demo slices over the sample content — the zero-config content for the
 * slices surface (sidebar groups, focus view, presentation). Same shape as
 * the database rows, so the read hooks fall back to them verbatim.
 */
export const SAMPLE_DEMO_SLICES: Slice[] = [
${demoSlices.map(({ slice }) => `  ${JSON.stringify(slice)},`).join('\n')}
]

export const SAMPLE_DEMO_SLICE_ITEMS: Record<string, SliceItem[]> = {
${demoSlices
  .map(
    ({ slice, items }) =>
      `  '${slice.id}': [\n${items.map((row) => `    ${JSON.stringify(row)},`).join('\n')}\n  ],`,
  )
  .join('\n')}
}
`

writeFileSync(OUT_PATH, header + body + footer)

// ---------------------------------------------------------------------------
// SQL seed emission (supabase/seed.sql) — same content as the TS fallback.
// ---------------------------------------------------------------------------

const q = (value) => {
  if (value === null || value === undefined) return 'null'
  return `'${String(value).replace(/'/g, "''")}'`
}

function sqlRows(rows) {
  return rows.map((row) => `  (${row.join(', ')})`).join(',\n')
}

const allBlueprints = built.flatMap(({ scenario, id, steps, blueprints }) =>
  blueprints.map((bp) => ({ scenario, scenarioId: id, steps, bp })),
)

const seedParts = []
seedParts.push(`-- GENERATED by scripts/generate_sample_blueprint.mjs — edit the generator, not this file.
--
-- Sample seed: the META-BLUEPRINT — the service blueprint of this template
-- itself. One '${LIFECYCLE.name}' lifecycle, four phases (Discover →
-- Adopt → Map → Operate, with Operate.loops_to_phase_id → Map), five
-- scenarios covering the kit's real flows, incl. one two-path scenario
-- (no-database run vs Supabase run) shaped for the compare views. Matches
-- src/data/sampleBlueprint.ts and src/types/nav.ts exactly. Idempotent:
-- replaces the sample lifecycle.

begin;

-- Lifecycle-replace: drop the prior sample lifecycle (cascades to all children).
delete from public.service_lifecycles where id = ${q(LIFECYCLE_ID)};

insert into public.service_lifecycles (id, name, description) values
  (${q(LIFECYCLE_ID)}, ${q(LIFECYCLE.name)}, ${q(LIFECYCLE.description)});

insert into public.phases (id, service_lifecycle_id, name, description, order_position) values
${sqlRows(
  PHASES.map((phase) => [
    q(phaseId(phase.ordinal)),
    q(LIFECYCLE_ID),
    q(phase.name),
    q(phase.description),
    String(phase.ordinal),
  ]),
)};

-- The lifecycle loop: Operate feeds back into Map.
${PHASES.filter((phase) => phase.loopsToKey)
  .map(
    (phase) => `update public.phases
set loops_to_phase_id = ${q(phaseId(phaseByKey[phase.loopsToKey].ordinal))}
where id = ${q(phaseId(phase.ordinal))};`,
  )
  .join('\n')}

insert into public.service_scenarios (id, phase_id, name, description, order_position, view_type) values
${sqlRows(
  built.map(({ scenario, id }) => [
    q(id),
    q(phaseId(phaseByKey[scenario.phaseKey].ordinal)),
    q(scenario.name),
    q(scenario.description),
    String(scenario.order),
    q(scenario.viewType),
  ]),
)};
`)

seedParts.push(`insert into public.paths (id, service_scenario_id, name, description, note, path_type) values
${sqlRows(
  allBlueprints.map(({ scenarioId, bp }) => [
    q(bp.path.id),
    q(scenarioId),
    q(bp.path.name),
    q(bp.path.description),
    q(bp.path.note),
    q(bp.path.path_type),
  ]),
)};
`)

seedParts.push(`insert into public.steps (id, service_scenario_id, name) values
${sqlRows(
  built.flatMap(({ id, steps }) => steps.map((step) => [q(step.id), q(id), q(step.name)])),
)};
`)

seedParts.push(`insert into public.path_steps (path_id, step_id, column_position) values
${sqlRows(
  allBlueprints.flatMap(({ bp }) =>
    bp.steps.map((step) => [q(bp.path.id), q(step.id), String(step.column_position)]),
  ),
)};
`)

seedParts.push(`insert into public.layers (id, path_id, name, layer_role, row_position) values
${sqlRows(
  allBlueprints.flatMap(({ bp }) =>
    bp.layers.map((layer) => [
      q(layer.id),
      q(bp.path.id),
      q(layer.name),
      q(layer.role),
      String(layer.row_position),
    ]),
  ),
)};
`)

seedParts.push(`insert into public.cells (id, path_id, layer_id, step_id, slot_position, content, picture, description, links, owner, perceived_owner, function, form, value_props, cell_key) values
${sqlRows(
  allBlueprints.flatMap(({ scenario, bp }) => {
    const layerName = new Map(bp.layers.map((l) => [l.id, l.name]))
    const stepName = new Map(bp.steps.map((s) => [s.id, s.name]))
    return bp.cells.map((cell) => {
      const slot = cell.slot_position ?? 0
      return [
        q(cell.id),
        q(bp.path.id),
        q(cell.layer_id),
        q(cell.step_id),
        String(slot),
        q(cell.content),
        q(cell.picture),
        q(cell.description),
        `${q(JSON.stringify(cell.links))}::jsonb`,
        q(cell.owner ?? null),
        q(cell.perceived_owner ?? null),
        q(cell.function ?? null),
        q(cell.form ?? null),
        `${q(JSON.stringify(cell.value_props ?? []))}::jsonb`,
        // Slot siblings carry no key — cell_key is unique and names the slot.
        slot > 0
          ? 'null'
          : q(
              cellKeyFor(
                scenario,
                bp.path.name,
                layerName.get(cell.layer_id),
                stepName.get(cell.step_id),
              ),
            ),
      ]
    })
  }),
)};
`)

seedParts.push(`insert into public.cell_triggers (id, source_cell_id, target_cell_id, kind, label, note) values
${sqlRows(
  allBlueprints.flatMap(({ bp }) =>
    bp.triggers.map((trigger) => [
      q(trigger.id),
      q(trigger.source_cell_id),
      q(trigger.target_cell_id),
      q(trigger.kind ?? 'trigger'),
      q(trigger.label ?? null),
      q(trigger.note ?? null),
    ]),
  ),
)};
`)

// Derived layer: the same demo slices the TS fixture ships, so a seeded
// database and a no-DB session read identical content.
seedParts.push(`insert into public.slices (id, service_lifecycle_id, slice_type, title, description, actor, locale, origin, position) values
${sqlRows(
  demoSlices.map(({ slice }) => [
    q(slice.id),
    q(slice.service_lifecycle_id),
    q(slice.slice_type),
    q(slice.title),
    q(slice.description),
    q(slice.actor),
    q(slice.locale),
    q(slice.origin),
    String(slice.position),
  ]),
)};
`)

const sqlUuidArray = (ids) => `array[${ids.map((id) => `${q(id)}::uuid`).join(', ')}]`
const sqlTextArray = (values) => `array[${values.map((value) => q(value)).join(', ')}]`

seedParts.push(`insert into public.slice_items (id, slice_id, position, cell_ids, cell_keys, caption, narrative) values
${sqlRows(
  demoSlices.flatMap(({ items }) =>
    items.map((row) => [
      q(row.id),
      q(row.slice_id),
      String(row.position),
      sqlUuidArray(row.cell_ids),
      sqlTextArray(row.cell_keys),
      q(row.caption),
      q(row.narrative),
    ]),
  ),
)};

commit;
`)

writeFileSync(SEED_OUT_PATH, seedParts.join('\n'))

console.log(`Wrote ${OUT_PATH}`)
console.log(`Wrote ${SEED_OUT_PATH}`)
for (const t of totals) {
  console.log(`  ${t.label}: ${t.layers} lanes, ${t.steps} steps, ${t.cells} cells, ${t.triggers} triggers`)
}
