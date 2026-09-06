import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { rulesDeclaring } from '@/lib/tokenModel'
import {
  CANVAS_REVEAL_ARROWS,
  CANVAS_REVEAL_DONE,
} from '@/contexts/canvasRevealContext'
import {
  MOTION_CAMERA_EASE,
  MOTION_CAMERA_MS,
  MOTION_FADE_MS,
  MOTION_FADE_STAGGER_MS,
  MOTION_MICRO_MS,
  MOTION_STRUCTURAL_MS,
  MOTION_STRUCTURAL_EASE,
} from './motion'

/**
 * The motion vocabulary exists twice by necessity — TypeScript constants for
 * the JS that waits on animations, `--motion-*` custom properties for the CSS
 * that runs them. This test is the seam: it reads animations.css off disk and
 * asserts both sides carry the same numbers, the same way palette.test.ts
 * pins the TypeScript palette to colors.css.
 */
const css = readFileSync(
  resolve(__dirname, '../styles/animations.css'),
  'utf-8',
)

function cssToken(name: string): string {
  const match = css.match(new RegExp(`${name}:\\s*([^;]+);`))
  assert.ok(match, `animations.css declares ${name}`)
  return match![1].trim()
}

test('motion durations match between motion.ts and animations.css', () => {
  assert.equal(cssToken('--motion-structural'), `${MOTION_STRUCTURAL_MS}ms`)
  assert.equal(cssToken('--motion-fade'), `${MOTION_FADE_MS}ms`)
  assert.equal(cssToken('--motion-fade-stagger'), `${MOTION_FADE_STAGGER_MS}ms`)
  assert.equal(cssToken('--motion-camera'), `${MOTION_CAMERA_MS}ms`)
  assert.equal(cssToken('--motion-micro'), `${MOTION_MICRO_MS}ms`)
})

test('structural ease matches between motion.ts and the @theme key', () => {
  // Whitespace-insensitive: Prettier formats the cubic-bezier args in CSS.
  assert.equal(
    cssToken('--ease-structural').replace(/\s+/g, ' '),
    MOTION_STRUCTURAL_EASE.replace(/\s+/g, ' '),
  )
})

test('camera ease matches between motion.ts and the @theme key', () => {
  assert.equal(
    cssToken('--ease-camera').replace(/\s+/g, ' '),
    MOTION_CAMERA_EASE.replace(/\s+/g, ' '),
  )
})

/**
 * Every animated surface has a reduced-motion answer — in every stylesheet.
 *
 * This assertion used to read `animations.css` only, then `animations.css` and
 * `blueprint.css`. `utilities.css` declares an `animation:` too, on the
 * `delayed-appear` utility, and had no reduced-motion branch at all: a guard
 * that names its own files names the ones where its property holds. It asks
 * the model now, which reads every stylesheet the entry imports, so the next
 * animated surface is covered wherever someone puts it.
 */
test('every animation is disabled under reduced motion, in every stylesheet', () => {
  const rules = rulesDeclaring('animation')
  assert.ok(rules.length > 5, 'the model found the animated rules')

  const reduced = (rule: (typeof rules)[number]) =>
    rule.context.some((at) => /prefers-reduced-motion:\s*reduce/.test(at))

  // `@utility x` compiles to `.x`, which is what a reduced-motion rule targets.
  const key = (selector: string) =>
    selector.startsWith('@utility ')
      ? `.${selector.slice('@utility '.length).trim()}`
      : // Attribute-selector chains: the reduced-motion block lists ancestors,
        // so match on the leading data attribute. The value is part of it —
        // `[data-slot='skeleton']` is a different surface from `[data-slot]`.
        (selector.match(/\[data-[a-z-]+(?:=[^\]]*)?\]/)?.[0] ?? selector)

  const covered = rules
    .filter(reduced)
    .map((rule) => rule.selector)
    .join('\n')

  for (const rule of rules.filter((entry) => !reduced(entry))) {
    assert.ok(
      covered.includes(key(rule.selector)),
      `${rule.file}:${rule.line} ${rule.selector} has no reduced-motion branch`,
    )
  }
})

/**
 * The reveal's stage ladder exists in TypeScript (canvasRevealContext) and
 * in blueprint.css as `[data-canvas-reveal='N']`. Nothing else links them:
 * inserting a stage means correct edits in both, and three-of-four correct
 * edits leave the suite green while a lane reveals on the wrong beat.
 */
const blueprintCss = readFileSync(
  resolve(__dirname, '../styles/blueprint.css'),
  'utf-8',
)

test('reveal stages match between canvasRevealContext and blueprint.css', () => {
  const stages = [
    ...blueprintCss.matchAll(/\[data-canvas-reveal='(\d+)'\]/g),
  ].map((match) => Number(match[1]))
  assert.ok(stages.length > 0, 'blueprint.css keys rules on reveal stages')
  // The attribute is removed at DONE, so the highest stage any rule can
  // match is the last lane.
  assert.equal(Math.max(...stages), CANVAS_REVEAL_ARROWS)
  assert.equal(CANVAS_REVEAL_ARROWS + 1, CANVAS_REVEAL_DONE)
})

/**
 * Each reveal beat runs inside the chain's per-stage watchdog. The beats are
 * CSS (`--reveal-beat-*`, derived from `--motion-fade`); the watchdog is TS.
 * If a beat ever grew past it, the watchdog would advance the chain out from
 * under a lane still animating — and nothing else would notice.
 */
test('every reveal beat fits inside the stage watchdog', () => {
  const beats = [
    ...blueprintCss.matchAll(
      /--reveal-beat-\d+:\s*(?:var\(--motion-fade\)|calc\(var\(--motion-fade\)\s*\*\s*([\d.]+)\))/g,
    ),
  ].map((match) => MOTION_FADE_MS * (match[1] ? Number(match[1]) : 1))
  assert.equal(beats.length, 4, 'four beats, each derived from --motion-fade')
  assert.ok(
    Math.max(...beats) < MOTION_STRUCTURAL_MS * 2,
    'longest beat must finish before the stage watchdog fires',
  )
})
