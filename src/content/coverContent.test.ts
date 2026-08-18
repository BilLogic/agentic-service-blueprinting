import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { COVER_ASSET_MANIFEST } from '../../scripts/sync-cover-assets.mjs'
import { coverFigures } from '@/components/cover/coverModel'
import { coverContent } from '@/content/coverContent'

// Pins the template skin's content contract (plan §6 U3): generalized copy
// only, every rendered figure accounted for in the sync manifest and on
// disk, descriptive alt text everywhere, and the two unauthored figure slots
// left genuinely empty rather than pointed at a file that does not exist.

const ASSETS_DIR = fileURLToPath(new URL('../../docs/assets', import.meta.url))

/** The two figures Bill has not authored yet. Their sections render
 * prose-only until the files land; nothing may reference them meanwhile. */
const PENDING_FIGURES = ['when-to-use.svg', 'slice-concept.svg']

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

  it('references neither pending figure — the two slots stay empty', () => {
    const referenced = coverFigures(coverContent).map((figure) => figure.src)
    for (const name of PENDING_FIGURES) {
      expect(referenced.join(' ')).not.toContain(name)
      expect(COVER_ASSET_MANIFEST).not.toContain(name)
    }
  })

  it('the two sections awaiting a figure carry their prose instead', () => {
    const sections = coverContent.tabs.flatMap((tab) => tab.sections)
    for (const id of ['overview-when', 'slices-view']) {
      const section = sections.find((candidate) => candidate.id === id)
      expect(section, `missing section ${id}`).toBeDefined()
      expect(section?.figure).toBeUndefined()
      // Prose-only means the section still says something on its own.
      const body =
        section?.kind === 'prose'
          ? section.paragraphs.join(' ')
          : section?.kind === 'defs'
            ? [section.intro ?? '', ...section.items.map((i) => i.definition)].join(' ')
            : ''
      expect(body.length).toBeGreaterThan(80)
    }
  })

  it('gives every tab a guide link into the repo docs', () => {
    for (const tab of coverContent.tabs) {
      expect(tab.link?.docPath).toMatch(/^docs\/guide\/.+\.md$/)
    }
  })
})
