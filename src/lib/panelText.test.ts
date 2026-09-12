import { describe, expect, it } from 'vitest'
import { classListHas, classLists } from '@/lib/classList'
import { sourceFiles } from '@/lib/tokenModel'

/**
 * Former `PANEL_TEXT` class lists, now written inline. Title and value
 * sit on `sm`; label and meta sit on `xs`. Weight and colour separate
 * the four jobs. There is no semantic type-role layer: a call site writes
 * the whole style where it stands, so a reader sees it without opening
 * another file.
 */
const FORMER_PANEL_TEXT = {
  title: 'min-w-0 text-sm font-semibold text-foreground',
  meta: 'text-xs font-normal text-muted-foreground',
  sectionLabel: 'text-xs font-medium text-muted-foreground',
  // Full ink, not the `/80` this inherited. The four panel roles are
  // separated by size and weight, with colour telling label and meta
  // (muted) apart from title and value (full) — an opacity between the
  // content rung and the caption rung was never one of the four.
  value: 'text-sm font-normal text-foreground',
} as const

type PanelRole = keyof typeof FORMER_PANEL_TEXT

/**
 * Per-file counts of `PANEL_TEXT.*` JSX sites on origin/main, taken after
 * the last batch that moved one. The retirement of the panel role layer
 * cites 28; the tree holds 21. The test enumerates those 21 so a
 * coincidental `text-xs font-medium text-muted-foreground` elsewhere
 * cannot satisfy a missing call site.
 */
const FORMER_SITE_COUNTS: Readonly<
  Record<string, Partial<Record<PanelRole, number>>>
> = {
  'components/blueprint/BlueprintCellDetailPanel.tsx': { title: 3, value: 1 },
  'components/blueprint/CellContentSection.tsx': {
    sectionLabel: 1,
    value: 1,
  },
  'components/blueprint/CellPanelEditor.tsx': { meta: 1, sectionLabel: 1 },
  'components/blueprint/LanePanel.tsx': { value: 1 },
  'components/blueprint/PanelSectionLabel.tsx': { sectionLabel: 1 },
  'components/blueprint/ResourcesList.tsx': { sectionLabel: 1 },
  'components/blueprint/StakeholderSelect.tsx': { meta: 3, value: 1 },
  'components/blueprint/StepPanel.tsx': { meta: 1, value: 1 },
  'components/blueprint/panelShell.tsx': {
    title: 1,
    meta: 2,
    sectionLabel: 1,
  },
}

describe('the former PANEL_TEXT call sites', () => {
  it('still write the classes the constant resolved to', { timeout: 20_000 }, () => {
    const sites = classLists()
    let total = 0
    for (const [file, roles] of Object.entries(FORMER_SITE_COUNTS)) {
      for (const [role, expected] of Object.entries(roles) as [
        PanelRole,
        number,
      ][]) {
        const count = sites.filter(
          (site) =>
            site.file === file &&
            classListHas(site.classes, FORMER_PANEL_TEXT[role]),
        ).length
        expect(count, `${file} ${role}`).toBe(expected)
        total += expected
      }
    }
    expect(total).toBe(21)
  })

  it('and the tree names no PANEL_TEXT identifier', () => {
    const hits = sourceFiles().filter((file) => /\bPANEL_TEXT\b/.test(file.code))
    expect(
      hits.map((file) => file.file),
      'PANEL_TEXT remains in the tree',
    ).toEqual([])
  })
})
