#!/usr/bin/env node
/**
 * The two index files, generated from the docs themselves.
 *
 * `INDEX.md` at the root routes by TASK — the row an arriving agent matches
 * against the thing it was asked to do. `docs/index.md` lists every document
 * with the summary its own frontmatter states. Neither is hand-maintained,
 * because a hand-maintained index is a second copy of the tree and drifts
 * from it silently: the index still lists the file, so nothing looks wrong
 * until someone opens the link.
 *
 * The routing table below IS authored — which task sends you where is
 * editorial judgment and cannot be derived — but it lives in exactly one
 * place, this file, and ships into the generated output.
 *
 *   npm run docs:index         # write both files
 *   npm run check:docs-index   # fail on stale, or on a doc with no summary
 *
 * A DOC WITH NO `summary:` IS A FAILURE, not a blank cell. The summary is
 * what an agent reads when deciding whether to open the file; a row reading
 * "(none)" costs the reader the open anyway, so the index would be lying
 * about its own usefulness. The failure names every offending file.
 *
 * Documents under `docs/plans/` are history rather than protocol, and carry a
 * `status:` as well — they are listed in their own table with that value
 * showing, so nothing in here can present a finished plan as current
 * guidance. `docs/plans/overview.md` is the exception: it is the authored
 * overview of that folder, not a plan.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url))
const DOCS = join(REPO_ROOT, 'docs')

/** Generated, so never read as an input. */
const GENERATED_BASENAME = 'index.md'
/** History rather than protocol; listed separately, and carries a status. */
const HISTORY_DIR = 'plans'

/**
 * Task-shaped routing: a row per task someone arrives holding, phrased the
 * way they would ask it. Targets are repo-relative paths, and include the
 * plugin contract's own folders — an agent's task is far more often "which
 * rule applies" than "which document".
 */
const ROUTING = [
  ['What is this, and why would I want it?', 'README.md'],
  ['What does this word mean — lane, path, slice, dependency, finding?', 'CONTEXT.md'],
  ['What does this panel label actually name in the schema?', 'references/interface-schema-map.md'],
  ['Get it running on my machine', 'SETUP.md'],
  ['I am an agent — which skill do I follow?', 'AGENTS.md'],
  ['Read the whole thing start to finish', 'docs/guide/'],
  ['What exactly am I looking at in a blueprint?', 'docs/guide/01-the-blueprint-model.md'],
  ['What do I actually do with a blueprint?', 'docs/guide/02-using-it-in-practice.md'],
  ['How does the plugin machinery work, and what lands on my disk?', 'docs/guide/03-the-plugin.md'],
  ['Who may do what once it is deployed?', 'docs/guide/04-operations.md'],
  ['The tables, columns, enums and import order', 'references/data-model.md'],
  ['What a blueprint file has to contain', 'references/ir-schema.json'],
  ['What a backend has to satisfy to serve this app', 'references/adapter-contract.md'],
  ['Which tools the canvas agent may call, and which of them write', 'references/canvas-adapter.md'],
  ['What a lane role does to rendering; what to call a lane', 'references/lane-roles.md + references/lane-vocabulary.md'],
  ['Write or change an audit check', 'references/audit-playbook.md'],
  ['Fork this template and change it for my org', 'references/customization.md'],
  ['Connect the app to a database; what a column means; row-level security', 'docs/connectors/supabase/database.md'],
  ['My migration history desynced from upstream', 'docs/connectors/supabase/database.md'],
  ['Bring a backend that is not Supabase', 'references/adapter-contract.md + supabase/generated/portable-core.generated.sql'],
  ['CI went red and I do not know what the check defends', 'docs/engineering/checks.md'],
  ['Cut a release', 'docs/engineering/releasing.md'],
  ['Can I rename this / is it a breaking change?', 'docs/adr/0001-two-contract-tiers-and-a-frozen-identifier-layer.md'],
  ['Why do skills/, references/, agents/, hooks/ and scripts/ sit at the root?', 'docs/adr/0002-plugin-contract-folder-names.md'],
  ['Why does a service own its journey but share the catalog of tools and actors?', 'docs/adr/0003-a-service-owns-its-journey-and-shares-the-catalog.md'],
  ['May I move a file under references/ or skills/?', 'docs/adr/0004-reference-paths-are-a-published-interface.md'],
  ['Add or move a document', 'docs/guidelines/documentation.md'],
  ['Propose a change; what a commit and a pull request carry', 'docs/guidelines/contributing.md'],
  ['See what is already being worked on', 'GitHub issues — the queue is not in this repo'],
  ['Is this plan still true?', 'its frontmatter `status` — and docs/plans/overview.md'],
]

/** Frontmatter as a flat map. Absent block, or absent keys, give `{}`. */
export function frontmatter(source) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(source)
  if (!match) return {}
  const out = {}
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    out[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
  }
  return out
}

/** Every markdown file under `docs/`, minus the ones this script writes. */
function docFiles(docsRoot = DOCS) {
  const found = []
  const walk = (abs) => {
    const entries = readdirSync(abs, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    )
    for (const entry of entries) {
      const full = join(abs, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.name.endsWith('.md') && entry.name !== GENERATED_BASENAME) {
        found.push(relative(docsRoot, full).split(sep).join('/'))
      }
    }
  }
  if (existsSync(docsRoot)) walk(docsRoot)
  return found
}

/**
 * `{ protocol, history, problems }` for one docs tree. `problems` is the
 * reason this script can fail: a document that states no summary.
 */
export function collect(docsRoot = DOCS) {
  const protocol = []
  const history = []
  const problems = []
  for (const path of docFiles(docsRoot)) {
    const fm = frontmatter(readFileSync(join(docsRoot, path), 'utf8'))
    const isHistory = path.startsWith(`${HISTORY_DIR}/`) && path !== `${HISTORY_DIR}/overview.md`
    if (!fm.summary) {
      problems.push({ path, missing: 'summary' })
      continue
    }
    if (isHistory && !fm.status) {
      problems.push({ path, missing: 'status' })
      continue
    }
    ;(isHistory ? history : protocol).push({ path, summary: fm.summary, status: fm.status })
  }
  return { protocol, history, problems }
}

function rootIndex({ protocol, history }) {
  return `<!-- GENERATED by scripts/generate-docs-index.mjs — edit the routing table in that script, or a doc's frontmatter. Never this file. -->

# Where to find things

Route by the task you arrived with. Every document, with what it answers, is
in [docs/index.md](./docs/index.md); what the folders mean is in
[docs/overview.md](./docs/overview.md).

| I need to… | Go to |
| --- | --- |
${ROUTING.map(([task, target]) => `| ${task} | ${target} |`).join('\n')}

## The five root files

| File | The question it answers |
| --- | --- |
| [README.md](./README.md) | What is this, and why would I want it? |
| [CONTEXT.md](./CONTEXT.md) | What does this word mean? |
| [SETUP.md](./SETUP.md) | How do I get it running? |
| INDEX.md | Where is the thing I need? *(this file, generated)* |
| [AGENTS.md](./AGENTS.md) | I am an agent — what do I read, and what may I not do? |

## Reading paths

- **Adopting the plugin** — README → SETUP → guide/03, then \`references/\` as
  the tasks come up.
- **Deploying the template** — SETUP → docs/connectors/supabase/database.md →
  guide/04.
- **Bringing your own backend** — references/adapter-contract.md →
  supabase/generated/portable-core.generated.sql → guide/04.
- **Working on this repository** — SETUP → docs/guidelines/contributing.md →
  docs/engineering/checks.md, with docs/adr/ before anything that renames.
- **An agent, any task** — AGENTS.md (auto-loaded) → CONTEXT.md → this table.

${protocol.length} protocol documents and ${history.length} plan${history.length === 1 ? '' : 's'} are indexed in [docs/index.md](./docs/index.md).
`
}

function docsIndex({ protocol, history }) {
  const historyTable =
    history.length === 0
      ? `No plans are in the tree today — see [plans/overview.md](./plans/overview.md) for what lands here and how it is marked.`
      : `| Plan | Status | What was decided |
| --- | --- | --- |
${history.map((r) => `| [${r.path}](./${r.path}) | \`${r.status}\` | ${r.summary} |`).join('\n')}`

  return `<!-- GENERATED by scripts/generate-docs-index.mjs — edit a doc's frontmatter, never this file. -->

# Every document

Summaries come from each document's own frontmatter. What the folders mean is
in [overview.md](./overview.md); routing by task is in
[INDEX.md](../INDEX.md).

## Protocol — living, always true

| Doc | What it answers |
| --- | --- |
${protocol.map((r) => `| [${r.path}](./${r.path}) | ${r.summary} |`).join('\n')}

## History — a snapshot of one moment, never current guidance

${historyTable}
`
}

function report(problems) {
  console.error(
    'Every document under docs/ states what it answers in its frontmatter. ' +
      'These do not:\n',
  )
  for (const { path, missing } of problems) {
    console.error(`  docs/${path} — no \`${missing}:\` in frontmatter`)
  }
  console.error(
    `\n${problems.length} document${problems.length === 1 ? '' : 's'}. Add a ` +
      'one-line `summary:` saying what the document answers (and, under ' +
      'docs/plans/, a `status:` — see docs/guidelines/documentation.md), then ' +
      'run:\n\n  npm run docs:index\n',
  )
}

function main() {
  const collected = collect()
  if (collected.problems.length > 0) {
    report(collected.problems)
    process.exit(1)
  }

  const targets = [
    [join(REPO_ROOT, 'INDEX.md'), rootIndex(collected), 'INDEX.md'],
    [join(DOCS, GENERATED_BASENAME), docsIndex(collected), 'docs/index.md'],
  ]

  if (process.argv.includes('--check')) {
    const stale = targets.filter(([path, next]) => {
      const current = existsSync(path) ? readFileSync(path, 'utf8') : ''
      return current !== next
    })
    if (stale.length > 0) {
      console.error(
        `${stale.map(([, , label]) => label).join(' and ')} ${stale.length === 1 ? 'is' : 'are'} stale — run:\n\n  npm run docs:index\n`,
      )
      process.exit(1)
    }
    console.log(
      `INDEX.md and docs/index.md are current (${collected.protocol.length} protocol documents, ${collected.history.length} plans)`,
    )
    return
  }

  for (const [path, next, label] of targets) {
    writeFileSync(path, next)
    console.log(`wrote ${label}`)
  }
}

// Same guard as scripts/check-standalone.mjs: comparing against a hand-built
// `file://` URL silently no-ops whenever the path needs escaping, so a
// checkout under a directory with a space in its name would run this script
// and have it do nothing, successfully.
const isMain =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) main()
