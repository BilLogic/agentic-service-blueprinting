import { describe, expect, it } from 'vitest'
import { classLists } from '@/lib/classList'
import { inkFault, inkFaultsIn, rungFor } from '@/lib/typeInk'

/**
 * Ink is named, never dialled.
 *
 * The reader is `classList`, for the same reason the weight guard uses it:
 * a grep for `text-foreground/70` misses the site that writes it inside a
 * `cn()` branch, and a branch is where softened ink tends to live.
 */

describe('inkFaultsIn', () => {
  it('fails a dialled ink and names the rung to write instead', () => {
    const faults = inkFaultsIn(
      `<p className="text-sm text-foreground/70">Body</p>`,
      'components/blueprint/Thing.tsx',
    )
    expect(faults).not.toEqual([])
    expect(faults.join('\n')).toMatch(/name the rung/)
    expect(faults.join('\n')).toMatch(/text-muted-foreground/)
  })

  it('fails a dialled ink written in a cn() branch', () => {
    const faults = inkFaultsIn(
      `<p className={cn('text-sm', dim && 'text-muted-foreground/50')}>Body</p>`,
      'components/blueprint/Thing.tsx',
    )
    expect(faults.join('\n')).toMatch(/text-tertiary-foreground/)
  })

  it('fails a dialled ink behind a variant, since a hover is still ink', () => {
    const faults = inkFaultsIn(
      `<a className="text-muted-foreground hover:text-foreground/90">Link</a>`,
      'components/blueprint/Thing.tsx',
    )
    expect(faults.join('\n')).toMatch(/text-foreground\b/)
  })

  it('passes the named rungs', () => {
    for (const rung of [
      'text-foreground',
      'text-muted-foreground',
      'text-tertiary-foreground',
      'text-sidebar-foreground',
      'text-(--foreground-annotation-chrome-tertiary)',
    ]) {
      expect(
        inkFaultsIn(`<p className="text-sm ${rung}">Body</p>`, 'a.tsx'),
        rung,
      ).toEqual([])
    }
  })

  it('passes opacity that is not ink, because a wash is not a reading level', () => {
    expect(
      inkFaultsIn(
        `<div className="border-border/60 bg-muted/50 text-foreground">x</div>`,
        'a.tsx',
      ),
    ).toEqual([])
  })
})

describe('rungFor', () => {
  it('maps the three bands the conversion found', () => {
    expect(rungFor(90)).toBe('text-foreground')
    expect(rungFor(80)).toBe('text-foreground')
    expect(rungFor(70)).toBe('text-muted-foreground')
    expect(rungFor(60)).toBe('text-muted-foreground')
    expect(rungFor(50)).toBe('text-tertiary-foreground')
    expect(rungFor(45)).toBe('text-tertiary-foreground')
  })
})

describe('the vendored tree is exempt', () => {
  it('does not fault a CLI-owned file, which regenerates from upstream', () => {
    expect(
      inkFault({
        file: 'components/ui/sidebar.tsx',
        line: 1,
        classes: ['text-sidebar-foreground/70'],
      }),
    ).toBeNull()
    expect(
      inkFault({
        file: 'components/blueprint/Sidebar.tsx',
        line: 1,
        classes: ['text-sidebar-foreground/70'],
      }),
    ).not.toBeNull()
  })
})

describe('the authored tree', () => {
  it('names every ink', { timeout: 20_000 }, () => {
    const offenders = classLists().flatMap((site) => {
      const fault = inkFault(site)
      return fault ? [`${site.file}:${site.line}: ${fault}`] : []
    })
    expect(offenders, offenders.join('\n')).toEqual([])
  })
})
