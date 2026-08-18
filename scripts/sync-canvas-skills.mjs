#!/usr/bin/env node
/**
 * One-way sync of the canvas agent's rulebook from THIS repo's canonical
 * skills/ + references/ trees into the app's vendored copy, with a drift
 * check for CI: `--check` exits 1 when the vendored bytes differ from the
 * source instead of copying.
 *
 * This inverts uno-blueprint's scripts/sync-agent-skill.mjs: there the
 * plugin repo was a sibling checkout; here the repo IS the canonical
 * source, so the sync is purely internal — one repo, one copy discipline.
 * The app bundles the vendored copy via ?raw imports and serves it through
 * the read_reference tool; the vendored dir stays flat because
 * read_reference serves files by bare name.
 *
 *   node scripts/sync-canvas-skills.mjs           # copy source → vendored
 *   node scripts/sync-canvas-skills.mjs --check   # CI drift guard (exit 1)
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const VENDORED = resolve(ROOT, 'src/lib/agent/skill/references')
const VENDORED_SKILLS = resolve(ROOT, 'src/lib/agent/skill/skills')

// Repo-relative source path per vendored reference. Shared core lives at
// references/; each skill's own materials under skills/<name>/references/.
// The IDE-only references (ingest/translate/review-import playbooks,
// adapter-contract, schemas) are deliberately NOT vendored — the canvas
// adapter translates their binding rules.
const FILES = [
  'references/canvas-adapter.md',
  'references/layer-roles.md',
  'references/lane-vocabulary.md',
  'references/data-model.md',
  'references/audit-playbook.md',
  'skills/map/references/elicitation-protocol.md',
  'skills/map/references/cocreate-playbook.md',
  'skills/whatif/references/whatif-playbook.md',
  'skills/audit/references/check-gap-sweep.md',
  'skills/audit/references/check-jargon-lint.md',
  'skills/audit/references/check-channel-conflict.md',
  'skills/audit/references/check-kpi-alignment.md',
  'skills/audit/references/check-perceived-owner.md',
  'skills/audit/references/check-value-ledger.md',
  'skills/audit/references/check-fee-visibility.md',
  'skills/audit/references/check-obsolete-source.md',
  'skills/slice/references/slice-playbook.md',
  'skills/slice/references/slice-templates.md',
]

// The four-skill architecture: the same SKILL.md files IDE humans get from
// the plugin, vendored for the composer's /slash triggers.
const SKILLS = [
  ['map/SKILL.md', 'map.md'],
  ['slice/SKILL.md', 'slice.md'],
  ['audit/SKILL.md', 'audit.md'],
  ['whatif/SKILL.md', 'whatif.md'],
]

const check = process.argv.includes('--check')

mkdirSync(VENDORED, { recursive: true })
mkdirSync(VENDORED_SKILLS, { recursive: true })

let drift = 0
const pairs = [
  ...FILES.map((file) => [
    resolve(ROOT, file),
    resolve(VENDORED, file.split('/').pop()),
    file,
  ]),
  ...SKILLS.map(([from, to]) => [
    resolve(ROOT, 'skills', from),
    resolve(VENDORED_SKILLS, to),
    `skills/${from}`,
  ]),
]
for (const [source, target, label] of pairs) {
  if (!existsSync(source)) {
    console.error(`missing source: ${label}`)
    drift += 1
    continue
  }
  const same =
    existsSync(target) &&
    readFileSync(source, 'utf8') === readFileSync(target, 'utf8')
  if (same) continue
  if (check) {
    console.error(`drift: ${label}`)
    drift += 1
  } else {
    copyFileSync(source, target)
    console.log(`synced: ${label}`)
  }
}

if (check && drift > 0) process.exit(1)
console.log(check ? 'vendored copy matches the source trees' : 'done')
