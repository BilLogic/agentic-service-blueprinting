import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  consumersOf,
  declarationsIn,
  resolveValue,
  rulesDeclaring,
  sourceFiles,
  sourceMatching,
  stripComments,
  stylesheet,
  stylesheets,
  winningDeclaration,
} from '@/lib/tokenModel'

/**
 * The seam's own guard.
 *
 * ADR 6 makes `tokenModel` the one place that answers what the token layer
 * declares, so every rule built on it inherits whatever the reader cannot see.
 * A reader's blind spot does not announce itself: no rule fails, because a
 * rule only fails on what it can read. That is the failure mode this file
 * exists to make loud, and each case below is one the simpler readers this
 * model replaced actually got wrong on this tree.
 */

describe('the declaration reader', () => {
  it('sees a declaration wrapped across lines', () => {
    // Forty-two declarations in this tree are wrapped, and `--primary` — the
    // most-derived name in the system — is one of them. A per-line regex, the
    // shape both readers this model replaced used, sees none of them.
    const wrapped = rulesDeclaring('--primary')
    expect(wrapped).toHaveLength(1)
    expect(wrapped[0].file).toBe('semantic.css')
    expect(wrapped[0].selector).toBe(':root, .dark, .light')
    // Whitespace-collapsed, so how a value was wrapped is not part of what it is.
    expect(wrapped[0].value).toBe(
      'oklch( var(--primary-lightness) var(--primary-chroma) var(--primary-hue) )',
    )
    expect(wrapped[0].value).not.toMatch(/\n/)
  })

  it('reports a wrapped declaration at the line its name sits on', () => {
    const [declaration] = rulesDeclaring('--primary')
    const line = stylesheet('semantic.css').text.split('\n')[
      declaration.line - 1
    ]
    expect(line).toContain('--primary:')
  })

  it('misses none of the declarations in any sheet', () => {
    // The blunt cross-check: count `--name:` at the start of a line in the raw
    // text and compare, sheet by sheet. A reader that drops a shape drops the
    // count with it. Every stylesheet is checked rather than a chosen one,
    // because choosing is the habit this model exists to end.
    for (const sheet of stylesheets()) {
      const text = sheet.text.replace(/\/\*[\s\S]*?\*\//g, (comment) =>
        comment.replace(/[^\n]/g, ' '),
      )
      const written = [...text.matchAll(/^\s*--[a-zA-Z0-9-]+\*?\s*:/gm)].length
      expect(
        `${sheet.file}: ${declarationsIn(sheet.file).length}`,
      ).toBe(`${sheet.file}: ${written}`)
    }
  })

  it('reads a Tailwind namespace reset as a declaration', () => {
    // `unset-tw-colors.css` is `--color-amber-*: initial` resets and nothing
    // else. A name pattern that stopped at the hyphen made the whole file
    // invisible, which is a file the cascade depends on being there.
    //
    // The shape is the assertion, never the count: WHICH families belong on
    // the list is `tailwindColorReset.test.ts`'s question, and it answers it
    // against Tailwind's own theme rather than against a number written here.
    const resets = declarationsIn('unset-tw-colors.css')
    expect(resets.length).toBeGreaterThan(0)
    expect(resets.every((entry) => entry.name.endsWith('-*'))).toBe(true)
    expect(resets.every((entry) => entry.value === 'initial')).toBe(true)
  })
})

describe('the cascade', () => {
  it('sets aside a print-only override', () => {
    // `print.css` restates thirteen dials inside `@media print`, under
    // `:root, .dark`. A resolver without at-rule context reports print.css as
    // the winner for every one of them, in both themes — which would make the
    // screen palette unmeasurable from here.
    const inPrint = rulesDeclaring('--hue').find(
      (entry) => entry.file === 'print.css',
    )
    expect(inPrint?.context).toEqual(['@media print'])
    expect(winningDeclaration('--hue', 'light')?.file).toBe('themes/light.css')
    expect(winningDeclaration('--hue', 'dark')?.file).toBe('themes/dark.css')
  })

  it('breaks the :root / .dark tie on source order, the way the browser does', () => {
    // Both selectors carry specificity (0,1,0), so the later import wins.
    // `themes/light.css` matches bare `:root`, which matches under dark too;
    // `themes/dark.css` imports after it and is what takes `--surface` back.
    const order = new Map(stylesheets().map((s) => [s.file, s.order]))
    expect(order.get('themes/light.css')!).toBeLessThan(
      order.get('themes/dark.css')!,
    )
    expect(resolveValue('--surface', 'light')).toBe('0.995')
    expect(resolveValue('--surface', 'dark')).toBe('0.19')
  })

  it('chases var() through to a value', () => {
    // `--primary` is three dials deep and every colour assertion rests on the
    // resolved triple rather than on the text of the declaration.
    expect(resolveValue('--primary', 'light')).toBe('oklch( 0.205 0 159 )')
    expect(resolveValue('--primary', 'dark')).toBe('oklch( 0.922 0 159 )')
  })
})

/**
 * The source reader, and the property the style rules cannot check about
 * themselves: that a reported `file:line` is the line the reader means.
 *
 * `stripComments` used to DELETE block comments rather than blank them, so
 * every newline inside a file's header vanished and every line number after it
 * shifted up by the header's height. Nothing failed, because a passing rule
 * reports no lines at all — the drift only shows once a rule starts failing,
 * which is the moment the number has to be right. Converting the token
 * discipline guard onto this model is that moment: it names a file and a line
 * for every offender it finds, and `dev/ArrowSituationCatalogPage.tsx` opens
 * with a thirteen-line header, so its `#2563eb` on line 28 was being reported
 * at line 15, on an import statement.
 */
describe('the source reader', () => {
  const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..')

  it('reads the whole of src, not a chosen list of roots', () => {
    // The rule this model absorbed already read every `.ts`/`.tsx` under
    // `src`. Sampling less while claiming to generalise would have been a
    // silent narrowing, which is the exact defect ADR 6 is about.
    const files = sourceFiles()
    expect(files.length).toBeGreaterThan(300)
    for (const root of ['components/', 'contexts/', 'hooks/', 'lib/', 'data/']) {
      expect(files.some((file) => file.file.startsWith(root))).toBe(true)
    }
    expect(files.some((file) => file.file === 'App.tsx')).toBe(true)
    expect(files.some((file) => file.file.includes('.test.'))).toBe(false)
  })

  it('keeps every line, so a stripped file numbers the same as the raw one', () => {
    for (const source of sourceFiles()) {
      const raw = readFileSync(resolve(SRC, source.file), 'utf8')
      expect(source.code.split('\n')).toHaveLength(raw.split('\n').length)
    }
  })

  it('reports a match at the line it sits on in the file on disk', () => {
    // One end-to-end check through the same path a rule takes, rather than
    // trusting the line-count equality above to imply it.
    const matches = sourceMatching(/ARROW_COLOR = /g)
    expect(matches.length).toBeGreaterThan(0)
    for (const match of matches) {
      const [file, line] = match.split(':')
      const raw = readFileSync(resolve(SRC, file), 'utf8').split('\n')
      expect(raw[Number(line) - 1]).toContain('ARROW_COLOR = ')
    }
  })

  it('still blanks what a comment says, so a comment is not a use', () => {
    const stripped = stripComments('const a = 1 /* text-red-500 */\nconst b = 2\n')
    expect(stripped).not.toContain('text-red-500')
    expect(stripped.split('\n')).toHaveLength(3)
  })

  it('sees a name read from source and from nowhere else', () => {
    // Liveness cannot be read off the stylesheets: `--colors-white` is
    // declared in `global.css` and read exactly once, from a JSX attribute.
    // A stylesheet-only scan would report it as dead.
    const reads = consumersOf('--colors-white')
    expect(reads.filter((entry) => entry.kind === 'stylesheet')).toEqual([])
    expect(reads.filter((entry) => entry.kind === 'source').length).toBe(1)
  })

  it('sees Tailwind bare-value shorthand as a read', () => {
    // `duration-(--motion-micro)` resolves the property exactly as `var()`
    // does. A `var(`-only scan reads straight past it, and every reference
    // written that way would be free to dangle.
    const shorthand = consumersOf('--motion-micro').filter(
      (entry) => entry.kind === 'source' && entry.via !== 'var',
    )
    expect(shorthand.length).toBeGreaterThan(0)
  })

  it('tells a fallback read from a bare one', () => {
    // The blueprint cell tokens are declared per role and read at the cell as
    // `var(--…-blueprint-cell, <default>)`, where the fallback arm IS the
    // resting state. A dangling-reference rule that could not see the comma
    // would have to either exempt them by name or fail on every one.
    const cell = consumersOf('--background-blueprint-cell')
    expect(cell.some((entry) => entry.hasFallback)).toBe(true)
  })
})
