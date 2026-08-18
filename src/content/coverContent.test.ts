import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { COVER_ASSET_MANIFEST } from '../../scripts/sync-cover-assets.mjs'
import { coverFigures } from '@/components/cover/coverModel'
import { coverContent } from '@/content/coverContent'

// Pins the template skin's content contract (plan §6 U3): generalized copy
// only, every figure accounted for in the sync manifest and on disk, and
// descriptive alt text everywhere.

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
  it('ships the four amended tabs in order', () => {
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

  it('every tab has at least one section and one CTA row', () => {
    for (const tab of coverContent.tabs) {
      expect(tab.sections.length).toBeGreaterThan(0)
      expect(tab.sections.some((section) => section.kind === 'cta')).toBe(true)
    }
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

  it('every figure src is /cover/<name> with <name> in the sync manifest', () => {
    for (const figure of coverFigures(coverContent)) {
      const match = /^\/cover\/([^/]+)$/.exec(figure.src)
      expect(match, `unexpected src shape: ${figure.src}`).not.toBeNull()
      expect(COVER_ASSET_MANIFEST).toContain(match?.[1])
    }
  })

  it('all eleven authored figures are used, and each exists in docs/assets/', () => {
    const used = new Set(
      coverFigures(coverContent).map((figure) =>
        figure.src.replace('/cover/', ''),
      ),
    )
    expect([...used].sort()).toEqual([...COVER_ASSET_MANIFEST].sort())
    for (const name of COVER_ASSET_MANIFEST) {
      expect(existsSync(join(ASSETS_DIR, name)), `missing ${name}`).toBe(true)
    }
  })
})
