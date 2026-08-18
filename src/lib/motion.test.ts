import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from 'vitest'
import assert from 'node:assert/strict'
import {
  CANVAS_REVEAL_ARROWS,
  CANVAS_REVEAL_DONE,
} from '@/contexts/canvasRevealContext'
import {
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

test('every keyframe animation is disabled under reduced motion', () => {
  // The reduced-motion block must cover every selector that declares an
  // `animation:` — a new animated surface that skips the block is the bug
  // this guards against.
  const animated = [...css.matchAll(/^(\[[^\n]+\])\s*\{\n\s*animation:/gm)]
    .map((m) => m[1])
    // Attribute-selector chains: the reduced-motion block lists ancestors,
    // so match on the leading data attribute.
    .map((sel) => sel.match(/\[data-[a-z-]+\]/)![0])
  const reduced = css.match(
    /@media \(prefers-reduced-motion: reduce\) \{([\s\S]+?)\n\}/,
  )
  assert.ok(reduced, 'reduced-motion block exists')
  for (const sel of new Set(animated)) {
    assert.ok(
      reduced![1].includes(sel),
      `${sel} is covered by the reduced-motion block`,
    )
  }
})

/**
 * The reveal's stage ladder exists in TypeScript (canvasRevealContext) and
 * in blueprint.css as `[data-canvas-reveal='N']`. Nothing else links them:
 * inserting a stage means correct edits in both, and three-of-four correct
 * edits leave the suite green while a layer reveals on the wrong beat.
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
  // match is the last layer.
  assert.equal(Math.max(...stages), CANVAS_REVEAL_ARROWS)
  assert.equal(CANVAS_REVEAL_ARROWS + 1, CANVAS_REVEAL_DONE)
})

/**
 * Each reveal beat runs inside the chain's per-stage watchdog. The beats are
 * CSS (`--reveal-beat-*`, derived from `--motion-fade`); the watchdog is TS.
 * If a beat ever grew past it, the watchdog would advance the chain out from
 * under a layer still animating — and nothing else would notice.
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
