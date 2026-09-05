#!/usr/bin/env node
/**
 * Pointer sweep over the always-loaded router.
 *
 * A POINTER is a routing item that names material outside the router and the
 * branch that should reach it — a row of § Skill routing, a bullet of § Before
 * the task, a backticked path beside a rule. Its wording, not its target,
 * decides whether the agent gets there. Three ways a router fails silently,
 * all caught here on every run:
 *
 *   1. A POINTER DOES NOT RESOLVE. A path renamed under a pointer leaves the
 *      agent told to load a document that is not there; nothing errors, the
 *      agent guesses. Same failure as a stale path in a skill's prose
 *      (`scripts/check-doc-paths.mjs`), one layer up — and the same failure
 *      the reference-path guard catches pointed outward at a consumer. Where
 *      the pointer names a section (`path.md` § Heading), the heading is
 *      checked too, case-insensitively, so a section renamed under a pointer
 *      is caught the same way.
 *   2. A POINTER BURIES ITS TRIGGER. An always-loaded pointer is scanned, not
 *      read; the first word is where it does its triggering work. "Any task
 *      that writes data" makes the agent read "Any" before it learns the item
 *      is about writes.
 *   3. A ROUTING ITEM CARRIES NO POINTER AT ALL. That is a body living in the
 *      router: prose every session pays for, in the one file that is supposed
 *      to route rather than teach. It belongs in the document it names.
 *
 * ── THE UNIT IS THE ITEM, NOT THE LINE ──────────────────────────────────────
 *
 * A ROUTING ITEM is a list item — bulleted or numbered — or a table row,
 * together with its wrapped continuation lines. The unit is the item because
 * prose wraps: a pointer commonly lands on the second physical line of an item,
 * and demanding that every such line lead with a trigger word would be a rule
 * about where the paragraph broke.
 *
 * ITS LEADING WORD is the first word of the item — of its first cell, for a
 * table row — after the list marker, markdown emphasis and any backticks are
 * stripped, lowercased and reduced to letters and hyphens. That word must not
 * be one of `FILLER`, the words that carry no branch.
 *
 * THE RULES THAT HOLD FOR EVERY SKILL ARE EXEMPT FROM RULES 2 AND 3, and only
 * from those. They are rules rather than routes — they bind before any pointer
 * could fire, which is why they are inline at all — so "state the branch
 * first" does not apply and neither does "carry a pointer". Their pointers,
 * where they have them, still have to resolve: a rule that cites a reference
 * is citing it for a reader who needs the body. The exemption is keyed to the
 * section heading naming `EXEMPT_SECTION`, so it is a property of where the
 * item lives rather than a list of item texts that quietly stops matching.
 *
 * SUBJECTS are the always-loaded tier (`scripts/always-loaded.mjs`), and the
 * sweep is by structure rather than by a list of pointers, so a pointer added
 * tomorrow is swept tomorrow.
 *
 * Mirrors the deployment's `scripts/check-pointers.mjs`
 * (BilLogic/agentic-service-blueprinting#139, #135) — same pointer grammar,
 * same filler set, same failure shape — so that one harness review reads both
 * repositories the same way. It differs in two places, both because this
 * repository is the kit rather than an app:
 *
 *   - `py` joins the extension list. The validator and the secret hook this
 *     router points at are Python (`scripts/validate_ir.py`,
 *     `hooks/secret_guard.py`); without the extension they would read as prose
 *     and go unswept, which is the one failure this check exists to prevent.
 *   - `EXEMPT_SECTION` is § Rules that hold for every skill rather than
 *     § Security lines. It is the same category — inline because it binds
 *     before a pointer could fire — under the name this router already used
 *     for it.
 *
 * Run: node scripts/check-pointers.mjs   (also: npm run check:pointers)
 */
import { readFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { ALWAYS_LOADED } from './always-loaded.mjs'

export const REPO_ROOT = resolve(new URL('..', import.meta.url).pathname)

/** The always-loaded routers. */
export const SUBJECTS = ALWAYS_LOADED

/** The section whose items are rules rather than routes. */
export const EXEMPT_SECTION = 'Rules that hold for every skill'

/** Words that carry no branch. An item opening with one has buried its trigger. */
export const FILLER = new Set([
  'a', 'an', 'the', 'any', 'when', 'if', 'need', 'needs', 'you', 'to', 'for',
  'please', 'also', 'some', 'this', 'that', 'it', 'and', 'or', 'in', 'on',
])

/** `path.ext`, or `dir/`, inside backticks, optionally followed by ` § Heading`. */
const POINTER =
  /`([A-Za-z0-9_@./-]+(?:\.(?:md|json|mjs|js|ts|tsx|py|yml|yaml|toml|sh|sql|css)|\/))`(?:\s*§\s*([^`|\n(—–:;]+))?/g

/** A section name ends where the sentence resumes. */
export function sectionName(raw) {
  if (!raw) return null
  const cut = raw.search(/\s(is|are|has|have|says|for|and|or|then|which|that)\s|\s[-,.]|$/)
  return raw.slice(0, cut === -1 ? undefined : cut).replace(/[.,]$/, '').trim() || null
}

/** A pointer names a PLACE in this repo: its first path segment is a real top-level entry. */
function isRepoRelative(root, rel) {
  return existsSync(join(root, rel.split('/')[0]))
}

const stripFences = (text) => text.replace(/```[\s\S]*?```/g, '')

/**
 * Every pointer in a stretch of text, in order.
 *
 * Exported so a test can drive the grammar directly — which is where the
 * bare-filename and glob cases live, and they are the ones a re-implementation
 * in a test would get wrong.
 */
export function pointersIn(text, root = REPO_ROOT) {
  const out = []
  for (const match of stripFences(text).matchAll(POINTER)) {
    const rel = match[1]
    if (/[*{}<>]/.test(rel)) continue // a glob or a placeholder, not a pointer
    // A bare filename (`SKILL.md`, `role.md`) names a SHAPE many folders have,
    // not a place; it is a pointer only if it sits at the repo root.
    if (!rel.includes('/') && !existsSync(join(root, rel))) continue
    if (rel.includes('/') && !isRepoRelative(root, rel)) continue // a fragment, not a place
    out.push({ rel, section: sectionName(match[2]) })
  }
  return out
}

/**
 * The routing items of a document: list items and table rows, each carrying its
 * wrapped continuation lines, the `## Heading` it sits under, and its trigger.
 */
export function itemsIn(text) {
  const lines = stripFences(text).split('\n')
  const items = []
  let section = ''
  let open = null
  const close = () => {
    if (open) items.push(open)
    open = null
  }
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    if (/^#{1,6}\s/.test(line)) {
      close()
      section = line.replace(/^#+\s*/, '').trim()
      continue
    }
    const listed = /^\s*(?:[-*]|\d+\.)\s+(.*)$/.exec(line)
    const isRow = line.trimStart().startsWith('|')
    const isRule = isRow && /^\|[\s:|-]*$/.test(line.trim())
    if (listed) {
      close()
      open = { section, trigger: listed[1], text: line }
      continue
    }
    if (isRow) {
      close()
      // The separator row, and the header row it belongs to, are the table's
      // frame rather than routing items.
      if (isRule) continue
      if (/^\|[\s:|-]*$/.test((lines[i + 1] ?? '').trim()) && (lines[i + 1] ?? '').includes('|')) continue
      const cells = line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|')
      items.push({ section, trigger: cells[0].trim(), text: line })
      continue
    }
    if (open && line.trim() !== '' && /^\s/.test(line)) {
      open.text += `\n${line}`
      continue
    }
    close()
  }
  close()
  return items
}

/** The word an item leads with: emphasis, backticks and punctuation stripped. */
export function leadingWord(trigger) {
  const first = trigger.replace(/^[*_`"'(]+/, '').trim().split(/\s+/)[0] ?? ''
  return first.toLowerCase().replace(/[^a-z-]/g, '')
}

export function headingExists(fileText, heading) {
  const want = heading.toLowerCase().replace(/[`*]/g, '').trim()
  return fileText
    .split('\n')
    .some(
      (line) =>
        /^#{1,6}\s/.test(line) &&
        line.replace(/^#+\s*/, '').replace(/[`*]/g, '').toLowerCase().trim().startsWith(want),
    )
}

export function sweep(root = REPO_ROOT, subjects = SUBJECTS) {
  const failures = []
  let pointers = 0
  let triggers = 0
  for (const rel of subjects) {
    const text = readFileSync(join(root, rel), 'utf8')
    for (const pointer of pointersIn(text, root)) {
      pointers += 1
      const abs = join(root, pointer.rel)
      if (!existsSync(abs)) {
        failures.push(`${rel}: pointer to \`${pointer.rel}\` does not resolve — no such file`)
        continue
      }
      // A directory pointer names a folder; there is no file to look for a heading in.
      if (pointer.rel.endsWith('/')) continue
      if (pointer.section && !headingExists(readFileSync(abs, 'utf8'), pointer.section)) {
        failures.push(
          `${rel}: pointer to \`${pointer.rel}\` § ${pointer.section} — no heading starts with that`,
        )
      }
    }
    for (const item of itemsIn(text)) {
      if (item.section.startsWith(EXEMPT_SECTION)) continue
      triggers += 1
      if (pointersIn(item.text, root).length === 0) {
        failures.push(
          `${rel}: § ${item.section} item "${item.trigger}" carries no pointer — ` +
            'a routing item that names no document is a body, and belongs in the document it names',
        )
        continue
      }
      const word = leadingWord(item.trigger)
      if (FILLER.has(word)) {
        failures.push(
          `${rel}: § ${item.section} item "${item.trigger}" leads with "${word}" — ` +
            'front-load the word that carries the branch',
        )
      }
    }
  }
  return { failures, pointers, triggers }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) {
  const { failures, pointers, triggers } = sweep()
  if (failures.length > 0) {
    console.error(
      `[pointers] ${failures.length} pointer problem(s):\n` +
        failures.map((one) => `  ${one}`).join('\n') +
        '\n  -> a pointer that does not resolve, or buries its trigger, is a document the agent will not reach.',
    )
    process.exit(1)
  }
  console.log(
    `[pointers] ${pointers} pointers resolve and ${triggers} routing items lead with their trigger word (${SUBJECTS.join(', ')})`,
  )
}
