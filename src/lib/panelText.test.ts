import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { PANEL_TEXT } from '@/lib/panelText'

const SRC = fileURLToPath(new URL('..', import.meta.url))

/**
 * Collect every .ts/.tsx file under `src/`, skipping nothing: a label class
 * pasted in a test is still a pasted label class.
 *
 * @param {string} dir - Directory to walk.
 * @returns {string[]} Absolute paths.
 */
function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) out.push(full)
  }
  return out
}

describe('panel label tokens', () => {
  it('names two label styles, and they are not the same', () => {
    expect(PANEL_TEXT.sectionHeading).toBe('text-xs font-medium text-foreground')
    expect(PANEL_TEXT.sectionLabel).toBe('text-2xs font-medium text-muted-foreground')
    expect(PANEL_TEXT.sectionHeading).not.toBe(PANEL_TEXT.sectionLabel)
  })

  it.each([
    ['sectionHeading', PANEL_TEXT.sectionHeading],
    ['sectionLabel', PANEL_TEXT.sectionLabel],
  ] as const)('is the only place %s is spelled as classes', (_name, token) => {
    const quoted = [`'${token}'`, `"${token}"`, `\`${token}\``]
    const pasted: string[] = []
    for (const file of walk(SRC)) {
      if (file.endsWith('panelText.ts') || file.endsWith('panelText.test.ts')) continue
      const source = readFileSync(file, 'utf8')
      if (quoted.some((form) => source.includes(form))) {
        pasted.push(file.slice(SRC.length + 1))
      }
    }
    expect(pasted, `${_name} classes pasted inline:\n${pasted.join('\n')}`).toEqual([])
  })
})
