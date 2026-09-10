import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from 'vitest'
import assert from 'node:assert/strict'
import {
  CELL_DETAIL_PANEL_BOTTOM_CLASS,
  CELL_DETAIL_PANEL_BOTTOM_GAP_PX,
} from '@/components/editor/menubarHeaderLayout'

/**
 * Tailwind reads source text, not runtime strings.
 *
 * An arbitrary value built by interpolation — `` `!bottom-[${GAP}px]` `` —
 * produces a class name the compiler never saw, so no rule is generated and
 * the element silently keeps its unstyled position. The drawer's bottom inset
 * shipped that way: the constant was right, the class was inert, and the
 * panel ran under the annotation toolbar.
 *
 * Two checks: the one literal that had to stay in step with its constant, and
 * the general shape, so the next one fails here instead of on the canvas.
 */
test('the drawer bottom class states the gap it clears', () => {
  assert.equal(
    CELL_DETAIL_PANEL_BOTTOM_CLASS,
    `!bottom-[${CELL_DETAIL_PANEL_BOTTOM_GAP_PX}px]`,
    'the literal class and the named gap have drifted apart',
  )
})

const SRC = resolve(__dirname, '..')

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = resolve(dir, entry)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry) ? [path] : []
  })
}

test('no Tailwind arbitrary value is assembled at runtime', () => {
  const offenders: string[] = []
  for (const path of sourceFiles(SRC)) {
    const source = readFileSync(path, 'utf8')
    source.split('\n').forEach((line, index) => {
      // `something-[${…}` — a utility whose arbitrary value comes from a
      // template hole. The compiler cannot see the resulting class.
      if (/[a-z0-9]-\[\$\{/.test(line)) {
        offenders.push(`${path.slice(SRC.length + 1)}:${index + 1}`)
      }
    })
  }
  assert.deepEqual(
    offenders,
    [],
    `Tailwind cannot generate an interpolated class:\n${offenders.join('\n')}`,
  )
})
