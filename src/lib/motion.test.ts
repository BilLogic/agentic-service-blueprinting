import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from 'vitest'
import assert from 'node:assert/strict'
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
