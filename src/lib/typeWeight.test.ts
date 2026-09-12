import { describe, expect, it } from 'vitest'
import { classLists, classListsIn } from '@/lib/classList'
import { sourceFiles } from '@/lib/tokenModel'
import { HEADING_TOKENS, weightFault, weightFaultsIn } from '@/lib/typeWeight'

/**
 * One working weight, and the guard that says so.
 *
 * 400 is content. 500 is the one working emphasis (labels, eyebrows, active
 * states, badge text). 600 is headings only. 700 is retired. The reader is
 * `classList` / `classLists` — a quoted-string search would miss a token
 * split across `cn()` arguments, which is how this tree writes them.
 */

describe('weightFaultsIn', () => {
  it('fails a non-heading site that carries two functional weights, naming the rule', () => {
    const faults = weightFaultsIn(
      `<span className="text-xs font-medium font-semibold text-muted-foreground">Label</span>`,
    )
    expect(faults).not.toEqual([])
    expect(faults.join('\n')).toMatch(/second functional weight/i)
  })

  it('fails font-bold, naming the rule', () => {
    const faults = weightFaultsIn(
      `<p className="text-sm font-bold tracking-tight">Differences</p>`,
    )
    expect(faults).not.toEqual([])
    expect(faults.join('\n')).toMatch(/font-bold/)
  })

  it('passes heading font-semibold', () => {
    expect(
      weightFaultsIn(
        `<h1 className="text-3xl font-semibold tracking-tight">Cover title</h1>`,
      ),
    ).toEqual([])
    expect(
      weightFaultsIn(
        `<DrawerTitle className="text-sm font-semibold tracking-tight">Panel title</DrawerTitle>`,
      ),
    ).toEqual([])
  })

  it('passes font-medium on a label', () => {
    expect(
      weightFaultsIn(
        `<span className="text-xs font-medium text-muted-foreground">Field</span>`,
      ),
    ).toEqual([])
  })
})

describe('the authored tree', () => {
  it('carries one working weight outside headings', { timeout: 20_000 }, () => {
    const sources = new Map(sourceFiles().map((file) => [file.file, file.code]))
    const offenders = classLists().flatMap((site) => {
      const fault = weightFault(site, sources.get(site.file) ?? '')
      return fault ? [`${site.file}:${site.line}: ${fault}`] : []
    })
    expect(offenders, offenders.join('\n')).toEqual([])
  })
})

describe('the reader the guard is written with', () => {
  it('sees a weight split across cn() arguments as one site', () => {
    const source = `
      <span className={cn('text-xs font-medium', cond && 'font-semibold')}>x</span>
    `
    const sites = classListsIn(source)
    expect(sites.some((site) => site.classes.includes('font-medium'))).toBe(
      true,
    )
    expect(sites.some((site) => site.classes.includes('font-semibold'))).toBe(
      true,
    )
    expect(weightFaultsIn(source).join('\n')).toMatch(/second functional weight/i)
  })
})

describe('heading tokens', () => {
  it('passes font-semibold on a named heading token even when the tag is not a heading', () => {
    expect(
      weightFaultsIn(`
        <p className="min-w-0 text-sm font-semibold text-foreground">Cell name</p>
      `),
    ).toEqual([])
  })

  it('every heading token is still a name the tree writes with font-semibold', () => {
    const code = sourceFiles()
      .map((file) => file.code)
      .join('\n')
    const stale = HEADING_TOKENS.filter((name) => !code.includes(name))
    expect(
      stale,
      `heading token no longer written: ${stale.join(', ')}`,
    ).toEqual([])
    expect(code).toMatch(
      /min-w-0 text-sm font-semibold text-foreground/,
    )
    expect(code).toMatch(/CANVAS_HEADER_TEXT\s*=\s*'[^']*font-semibold/)
    expect(code).toMatch(
      /BLUEPRINT_MENUBAR_TITLE_TEXT_CLASS\s*=\s*'[^']*font-semibold/,
    )
  })
})
