import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/*
 * Every at-rule in the stylesheets has to be one a browser knows.
 *
 * A browser drops an unknown at-rule TOGETHER WITH ITS ENTIRE BLOCK, in
 * silence — no console warning, no build failure, no test failure. Whole
 * sections of a stylesheet stop applying and nothing says so.
 *
 * This is not hypothetical. A repo-wide rename of a domain word rewrote
 * `@layer` to `@lane` in eight places, and everything downstream kept
 * passing: the contract tests that pin these rules read the FILE, not the
 * cascade, so they saw the text they were looking for while browsers threw
 * the rules away. What went with it was the board's fill and border, the
 * canvas reveal's staging, and — worst — the `touch-action: none` that keeps
 * the browser from stealing a touch inside the board.
 *
 * So the file-reading contracts get a floor underneath them: whatever else
 * they assert, the rules they assert about must at least be parsed.
 */

const STYLES = fileURLToPath(new URL('../styles', import.meta.url))

/** Tailwind v4's own at-rules, plus the standard ones we use. */
const ALLOWED = new Set([
  'charset',
  'config',
  'container',
  'custom-variant',
  'font-face',
  'import',
  'keyframes',
  'layer',
  'media',
  'page',
  'plugin',
  'property',
  'source',
  'starting-style',
  'supports',
  'theme',
  'utility',
  'variant',
])

function cssFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return cssFiles(path)
    return path.endsWith('.css') ? [path] : []
  })
}

describe('stylesheet at-rules', () => {
  const files = cssFiles(STYLES)

  it('finds stylesheets to check', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  it.each(files.map((path) => [path.slice(STYLES.length + 1), path]))(
    '%s uses only at-rules a browser parses',
    (_name, path) => {
      const source = readFileSync(path, 'utf8')
      // Line-initial only: an at-rule inside a comment or a string is prose.
      const used = [...source.matchAll(/^@([a-z-]+)/gm)].map(
        (match) => match[1],
      )
      const unknown = [...new Set(used)].filter((rule) => !ALLOWED.has(rule))
      expect(unknown).toEqual([])
    },
  )
})
