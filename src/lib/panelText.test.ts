import { describe, expect, it } from 'vitest'
import { classListHas, classLists } from '@/lib/classList'
import { sourceFiles } from '@/lib/tokenModel'

/**
 * Former `PANEL_TEXT` class lists, copied from `src/lib/panelText.ts` on
 * origin/main after #533. #537 retires the constant; the 21 JSX call sites
 * must still write these utilities. #535 moves meta and sectionLabel off
 * `text-2xs`; this ticket does not.
 */
const FORMER_PANEL_TEXT = {
  title: 'min-w-0 text-sm font-semibold leading-normal text-foreground',
  meta: 'text-2xs font-normal leading-tight text-muted-foreground',
  sectionLabel: 'text-2xs font-medium text-muted-foreground',
  value: 'text-sm font-normal text-foreground/80',
} as const

type PanelRole = keyof typeof FORMER_PANEL_TEXT

/**
 * Per-file counts of `PANEL_TEXT.*` JSX sites on origin/main after #533.
 * #537 cites 28; the tree holds 21. The test enumerates those 21 so a
 * coincidental `text-2xs font-medium text-muted-foreground` elsewhere
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
