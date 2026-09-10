/**
 * The eighteen stakeholder definitions reach a screen, and keep reaching one.
 *
 * `stakeholders.summary` is populated on every row of the registry and was
 * written by the mutation layer for months while NOTHING selected it for a
 * reader. Renaming it from `note` fixed the word; this file is what stops the
 * column going quiet again, because a column with a writer and no reader
 * produces no error, no empty state and no failing test — it simply does not
 * appear, which is exactly why it went unnoticed.
 *
 * Three links have to hold, and breaking any one of them restores the old
 * silence without breaking anything else:
 *
 *   1. the owner badge puts the kind's meaning and the definition on its
 *      definition card,
 *   2. the stakeholder field renders that badge with the registry's own
 *      summary — and, where the badge is a picker instead, prints the same
 *      sentence,
 *   3. a lane that has a stakeholder and nothing else is not treated as empty,
 *      which is 74 of the 75 lanes that name one.
 *
 * Read as text rather than rendered. The question is which values these
 * components pass to each other, which is a fact about the source; rendering
 * `LanePanel` needs a Supabase client, a canvas-mode provider and a footer
 * host, and would test those three instead.
 *
 * And every assertion is paired with a RED case built by deleting the wiring
 * from a copy of the real source. A check that examined nothing would print
 * the same clean line — the argument `scripts/tests/rls-posture.test.mjs`
 * makes, applied to a reader instead of a policy.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const BLUEPRINT = join(process.cwd(), 'src', 'components', 'blueprint')

const read = (file: string) => readFileSync(join(BLUEPRINT, file), 'utf8')

type Sources = {
  badge: string
  select: string
  panel: string
}

/** The real three, read eagerly so a renamed file fails loudly. */
const REAL: Sources = {
  badge: read('StakeholderBadge.tsx'),
  select: read('StakeholderSelect.tsx'),
  panel: read('LanePanel.tsx'),
}

/**
 * What is broken about the path from the registry to a reader, as sentences.
 *
 * One function over all three files rather than three tests: the defect is a
 * BROKEN CHAIN, and a chain is only worth checking end to end. Each link
 * below can be severed on its own, and the RED cases do sever them on their
 * own, so the messages have to say which one went.
 */
export function readerFindings(sources: Sources): string[] {
  const findings: string[] = []

  // 1. The badge carries the definition into the card. `description` is the
  //    prop PanelKindBadge turns into a section; passing the summary as
  //    `title` or `label` instead would render it and still not be the
  //    affordance panel-affordances.md asks for.
  if (!/description=\{summary\}/.test(sources.badge)) {
    findings.push(
      'StakeholderBadge does not pass its summary to PanelKindBadge as `description`, so the definition never reaches the card',
    )
  }

  // 1b. And the CATEGORY half — the kind, and what that kind means. Added with
  //     the rule that gave the card a section above the instance: a
  //     reader who learns that `Regular Tutor` is staff and never learns what
  //     staff commits a party to has half the card.
  if (!/STAKEHOLDER_KIND_MEANING\[kind\]/.test(sources.badge)) {
    findings.push(
      'StakeholderBadge does not pass the kind meaning as its category, so the card opens on a party with no idea what sort of party it is',
    )
  }

  // 2a. The field renders the badge with the REGISTRY's summary. A literal or
  //     a lane-held copy would satisfy a looser check and reintroduce the
  //     duplication the column exists to avoid.
  if (!/<StakeholderBadge[\s\S]{0,200}?summary=\{selected\.summary\}/.test(sources.select)) {
    findings.push(
      'StakeholderSelect does not render the owner badge with `selected.summary`, so the read-only lane panel shows a name and no definition',
    )
  }

  // 2b. And says the same thing in the mode that has no badge to hover.
  if (!/\{selected\.summary\}/.test(sources.select)) {
    findings.push(
      'StakeholderSelect never prints `selected.summary`, so an author choosing an owner cannot see who they picked',
    )
  }

  // 3. A lane whose only authored fact is its owner still opens the body. Without
  //    this the badge above is unreachable on almost every lane that has one.
  const emptiness = /function isLaneEmpty\([\s\S]*?\n}/.exec(sources.panel)
  if (!emptiness) {
    findings.push('LanePanel no longer declares isLaneEmpty; the empty-state rule cannot be read')
  } else if (!/stakeholderId === null/.test(emptiness[0])) {
    findings.push(
      'isLaneEmpty ignores the stakeholder, so a lane that names one and nothing else renders PanelEmpty and the owner badge is never drawn',
    )
  }

  return findings
}

describe('the registry definition reaches a reader', () => {
  it('holds across the badge, the field and the lane panel', () => {
    expect(readerFindings(REAL)).toEqual([])
  })
})

describe('and the check goes red on each link, severed on its own', () => {
  it('red when the badge stops passing the summary to its card', () => {
    const findings = readerFindings({
      ...REAL,
      badge: REAL.badge.replace('description={summary}', 'description={null}'),
    })
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatch(/never reaches the card/)
  })

  it('red when the badge stops saying what kind of party this is', () => {
    const findings = readerFindings({
      ...REAL,
      badge: REAL.badge.replace(
        'STAKEHOLDER_KIND_MEANING[kind]',
        "'…'",
      ),
    })
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatch(/what sort of party it is/)
  })

  it('red when the field renders a badge with no definition behind it', () => {
    const findings = readerFindings({
      ...REAL,
      select: REAL.select.replace('summary={selected.summary}', "summary={null}"),
    })
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatch(/shows a name and no definition/)
  })

  it('red when the editable mode drops the sentence', () => {
    // Both branches read `selected.summary`, so severing the printed one means
    // removing the paragraph the picker sits above; the badge case above is
    // what proves the two findings are independent.
    const findings = readerFindings({
      ...REAL,
      select: REAL.select.replace(/\{selected\.summary\}/g, '{null}'),
    })
    expect(findings.map((entry) => entry)).toContain(
      'StakeholderSelect never prints `selected.summary`, so an author choosing an owner cannot see who they picked',
    )
  })

  it('red when a lane with only an owner is called empty again', () => {
    const findings = readerFindings({
      ...REAL,
      panel: REAL.panel.replace('lane.stakeholderId === null &&\n', ''),
    })
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatch(/renders PanelEmpty/)
  })

  it('red when isLaneEmpty is deleted outright', () => {
    const findings = readerFindings({
      ...REAL,
      panel: REAL.panel.replace(/function isLaneEmpty\([\s\S]*?\n}/, ''),
    })
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatch(/no longer declares isLaneEmpty/)
  })
})
