import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { COVER_ASSET_MANIFEST } from '../../scripts/sync-cover-assets.mjs'
import { coverFigures } from '@/components/cover/coverModel'
import { coverContent } from '@/content/coverContent'

// Pins the template skin's content contract (plan §6 U3): generalized copy
// only, every rendered figure accounted for in the sync manifest and on
// disk, descriptive alt text everywhere, and the defs tables carrying the
// terms their figures actually show.

const ASSETS_DIR = fileURLToPath(new URL('../../docs/assets', import.meta.url))

/** Deployment vocabulary that must never reach the template skin. `PLUS` is
 * matched case-sensitively — the ordinary word "plus" is legitimate copy. */
const FORBIDDEN = [/\bPLUS\b/, /\buno\b/i, /\btutors?\b/i]

function allStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value)
  else if (Array.isArray(value)) for (const v of value) allStrings(v, out)
  else if (value && typeof value === 'object') {
    for (const v of Object.values(value)) allStrings(v, out)
  }
  return out
}

describe('coverContent', () => {
  it('ships the four tabs in order', () => {
    expect(coverContent.tabs.map((tab) => tab.label)).toEqual([
      'Overview',
      'Blueprints',
      'Slices',
      'Skills',
    ])
  })

  it('contains no deployment-specific vocabulary anywhere', () => {
    for (const text of allStrings(coverContent)) {
      for (const pattern of FORBIDDEN) {
        expect(text).not.toMatch(pattern)
      }
    }
  })

  it('every tab has sections, and the page offers exactly one action', () => {
    for (const tab of coverContent.tabs) {
      expect(tab.sections.length).toBeGreaterThan(0)
    }
    expect(coverContent.primaryCtaLabel).toBe('Open the blueprint')
  })

  it('carries the degraded-state and chip strings', () => {
    expect(coverContent.states.noSlices).toContain('/sb:slice')
    expect(coverContent.chip.copiedLabel).toBe('Copied')
    expect(coverContent.chip.copyLabel).toBe('Copy')
  })

  it('every figure has non-empty alt text describing what it shows', () => {
    const figures = coverFigures(coverContent)
    expect(figures.length).toBeGreaterThan(0)
    for (const figure of figures) {
      expect(figure.alt.trim().length).toBeGreaterThan(10)
      // Alt describes the figure, not the file.
      expect(figure.alt).not.toMatch(/\.svg/i)
      expect(figure.width).toBeGreaterThan(0)
      expect(figure.height).toBeGreaterThan(0)
    }
  })

  it('every rendered figure src is /cover/<name> with <name> in the sync manifest', () => {
    for (const figure of coverFigures(coverContent)) {
      const match = /^\/cover\/([^/]+)$/.exec(figure.src)
      expect(match, `unexpected src shape: ${figure.src}`).not.toBeNull()
      expect(COVER_ASSET_MANIFEST).toContain(match?.[1])
    }
  })

  it('every manifest figure exists in docs/assets/', () => {
    for (const name of COVER_ASSET_MANIFEST) {
      expect(existsSync(join(ASSETS_DIR, name)), `missing ${name}`).toBe(true)
    }
  })

  it('places each figure on the section its drawing belongs to', () => {
    const sections = coverContent.tabs.flatMap((tab) => tab.sections)
    const figureOf = (id: string) =>
      sections.find((candidate) => candidate.id === id)?.figure?.src

    // The figures are authored truth; these three slots were the last empty
    // ones and the copy around them reads off the drawings.
    expect(figureOf('overview-when')).toBe('/cover/when-to-use.svg')
    // The definition and the presenting behaviour are one opening section
    // now, and "From path to presentation" belongs to it.
    expect(figureOf('slices-intro')).toBe('/cover/slice-concept.svg')
    expect(figureOf('slices-types')).toBe('/cover/slicing-model.svg')
  })

  it("the Overview defs list carries the four categories the figure shows", () => {
    const section = coverContent.tabs
      .flatMap((tab) => tab.sections)
      .find((candidate) => candidate.id === 'overview-when')
    expect(section?.kind).toBe('defs')
    if (section?.kind !== 'defs') return
    expect(section.items.map((item) => item.term)).toEqual([
      'Onboarding',
      'Stakeholder Alignment',
      'Decision Evaluation',
      'Context Management',
    ])
    // Each definition expands on the figure's caption rather than repeating it.
    for (const item of section.items) {
      expect(item.definition.length).toBeGreaterThan(60)
    }
  })

  it('every defs list has a header row for its two columns', () => {
    for (const tab of coverContent.tabs) {
      for (const section of tab.sections) {
        if (section.kind !== 'defs') continue
        expect(section.columns.term.length).toBeGreaterThan(0)
        expect(section.columns.definition.length).toBeGreaterThan(0)
      }
    }
  })

  it('gives every tab a guide link into the repo docs, labelled the same way', () => {
    for (const tab of coverContent.tabs) {
      expect(tab.link?.docPath).toMatch(/^docs\/guide\/.+\.md$/)
      expect(tab.link?.label).toBe('Learn more →')
    }
  })
})
