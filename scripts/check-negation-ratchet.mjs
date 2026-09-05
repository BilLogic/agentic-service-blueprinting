#!/usr/bin/env node
/**
 * Prohibition tokens across the always-loaded tier only fall.
 *
 * Steering by prohibition drags the forbidden behaviour into context and makes
 * it MORE available, not less — "don't think of an elephant". The fix is to
 * prompt the positive: state the target behaviour, so the banned one is never
 * spoken. A prohibition earns its place as a hard guardrail that cannot be
 * phrased positively — the secret rule is the whole of that category here —
 * and even then it carries its positive twin.
 *
 * This is a RATCHET, not a threshold. A threshold invites arguing about the
 * number and gets switched off the day it blocks someone; a ratchet only asks
 * that the count go down. It is this kit's instance of the standard's negation
 * ratchet (BilLogic/agentic-service-blueprinting#139, #135) and is
 * deliberately the same metric, the same five tokens and the same
 * quoted-speech rule as the deployment's `scripts/check-negation-ratchet.mjs`,
 * so that one harness review reads both numbers the same way.
 *
 * ── WHAT IS COUNTED, AND WHAT IS NOT ────────────────────────────────────────
 *
 * PROHIBITION TOKENS: five imperative bans, and the metric is named that
 * wherever it is printed, because it is not a count of negation as written. A
 * regex broad enough to catch negation as written also catches the contrastive
 * appositive — "a variant is an alternative, not a stage" — which STATES A
 * TARGET and names the near miss beside it, so broadening the pattern would
 * penalise the writing this guard exists to encourage. Every match here is an
 * imperative ban, which is what makes the number impossible to litigate at the
 * moment it blocks someone.
 *
 * Quoted speech and code spans are exempt: `never` inside a code span is an
 * identifier, and `Say "I don't know"` is an instruction TO do something.
 *
 * SCOPE is the always-loaded tier — the files in `scripts/always-loaded.mjs`,
 * which cost every session their whole length before any task begins. The
 * skills under `skills/` and the rulebook under `references/` load when a
 * pointer fires, and `docs/adr/` is append-only: a decision record saying
 * "X is not reversible" ADDS prohibitions by doing its job, so a ratchet over
 * it would rise by construction.
 *
 * ── THE RECORDED COUNT ──────────────────────────────────────────────────────
 *
 * `RECORDED` is the baseline, kept here rather than in a JSON file beside it
 * because the corpus is one file: a separate baseline would be a second place
 * to look for a single number. It carries the FILE COUNT as well as the token
 * count, and a run measuring fewer files fails — a ratchet fails only when the
 * count RISES, so a corpus that lost a file clears it every time and reports a
 * smaller, greener number while doing so.
 *
 * A fall is a pass with a nudge to re-record: the count is a fact about prose,
 * and a good rewrite must never arrive as a red build. (The char budget next
 * door DOES fail downward, because a stale ceiling silently stops describing
 * the file, while a stale prohibition count still blocks every rise it was
 * recorded to block.)
 *
 * Run: node scripts/check-negation-ratchet.mjs   (also: npm run check:negation)
 */
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { ALWAYS_LOADED, TIER_NOUN } from './always-loaded.mjs'

const REPO_ROOT = resolve(new URL('..', import.meta.url).pathname)

/** The five tokens, in one place, so the regex and the label cannot drift apart. */
export const PROHIBITION_TOKENS = ['never', "don't", 'do not', 'cannot', 'must not']

/** What the number is called wherever it is written down or printed. */
export const METRIC = 'prohibition tokens'

/** The baseline: what the tier scored when this was last recorded (#139). */
export const RECORDED = { files: 1, tokens: 1 }

const PROHIBITION = new RegExp(`\\b(${PROHIBITION_TOKENS.join('|')})\\b`, 'gi')
const stripQuoted = (text) => text.replace(/"[^"\n]*"/g, '""').replace(/`[^`\n]*`/g, '``')

/**
 * One document's score.
 *
 * Exported so the tests assert the REAL counter rather than a re-implementation
 * of it — including what it deliberately does not see.
 */
export const countProhibitions = (text) => (stripQuoted(text).match(PROHIBITION) || []).length

/** The tier's census: one entry per file that scores, plus the total. */
export function measure(root = REPO_ROOT, files = ALWAYS_LOADED) {
  const counts = {}
  let total = 0
  for (const rel of files) {
    const n = countProhibitions(readFileSync(join(root, rel), 'utf8'))
    if (n > 0) counts[rel] = n
    total += n
  }
  return { files: files.length, counts, total }
}

/**
 * The verdict. Pure, so both failing branches can be asserted without authoring
 * a prohibition into the real router.
 */
export function verdict({ files, counts, total }, recorded = RECORDED) {
  const census =
    Object.entries(counts)
      .map(([file, n]) => `${file} ${n}`)
      .join(' · ') || 'none'
  const failures = []
  if (files < recorded.files) {
    failures.push(
      `[negation] the ${TIER_NOUN} shrank: ${files} file(s) measured, against the ` +
        `${recorded.files} this count was recorded over.\n` +
        '  -> A ratchet fails only when the count RISES, so a tier that lost a file passes\n' +
        '     every time, and passes with a SMALLER number that reads like progress. If a\n' +
        '     file left the tier on purpose, re-record RECORDED and say which, and why.',
    )
  } else if (total > recorded.tokens) {
    failures.push(
      `[negation] ${METRIC} across the ${TIER_NOUN} rose ${recorded.tokens} -> ${total} (${census}).\n` +
        '  -> state the target behaviour instead of banning its opposite. A ban that is a real\n' +
        '     guardrail keeps its place — the secret rule is that category here — but pair it\n' +
        '     with the positive so attention lands on what to do. If the rise is deliberate,\n' +
        '     raise RECORDED.tokens in scripts/check-negation-ratchet.mjs and say why.',
    )
  }
  const fell = total < recorded.tokens
  return {
    failures,
    line:
      `[negation] ${total} ${METRIC} (${PROHIBITION_TOKENS.join(' / ')}) across the ` +
      `${TIER_NOUN}, against a recorded ${recorded.tokens} — ${census}` +
      (fell ? `. Down ${recorded.tokens - total}: lower RECORDED.tokens to ${total}.` : '.'),
  }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) {
  const { failures, line } = verdict(measure())
  if (failures.length > 0) {
    for (const failure of failures) console.error(failure)
    process.exit(1)
  }
  console.log(line)
}
