import { describe, expect, it } from 'vitest'
import { DIVIDER_MEANINGS } from '@/lib/dividerLines'
import { coverContent } from '@/content/coverContent'
import { coverTabSections } from '@/components/cover/coverModel'
import {
  STAKEHOLDER_KIND_LABELS,
  STAKEHOLDER_KIND_MEANING,
} from '@/hooks/useStakeholders'
import {
  ENTITY_STATUS,
  ENTITY_STATUS_MEANING,
  ENTITY_STATUS_SHORT,
} from '@/lib/entityStatus'
import { CANONICAL_LANE_ROLES, LANE_ROLES } from '@/lib/laneRoles'
import { ENTITY_KIND_DEFINITIONS, PANEL_TERMS } from '@/lib/panelTerms'
import {
  TOUCHPOINT_ROLE,
  TOUCHPOINT_ROLE_DEFINITION,
  TOUCHPOINT_ROLE_LABEL,
} from '@/lib/touchpointRole'

/**
 * A definition never repeats its term — one guard, over every module that
 * feeds one.
 *
 * The rule and the reason are in the entity-panels composition guideline.
 * What this file adds is REACH: the rule used to be checked on `PANEL_TERMS` alone, while eight lane
 * roles a few files away opened with their own name and nothing noticed. A
 * definition module that is not in the roster below is a module where the
 * rule is a hope, so a new one joins the list the day it is written.
 *
 * The pairs are flattened here rather than each module asserting for itself:
 * one predicate, one failure message, and a new module costs four lines.
 */
type DefinitionPair = { label: string; body: string }

/** Every (label, body) pair the app shows a reader, by the module holding it. */
const ROSTER: Record<string, readonly DefinitionPair[]> = {
  'laneRoles.LANE_ROLES': CANONICAL_LANE_ROLES.map((role) => LANE_ROLES[role]),
  'entityStatus.ENTITY_STATUS_MEANING': ENTITY_STATUS.map((status) => ({
    label: ENTITY_STATUS_SHORT[status],
    body: ENTITY_STATUS_MEANING[status],
  })),
  'panelTerms.PANEL_TERMS': Object.entries(PANEL_TERMS).map(
    ([label, body]) => ({ label, body }),
  ),
  'panelTerms.ENTITY_KIND_DEFINITIONS': Object.values(
    ENTITY_KIND_DEFINITIONS,
  ).map((term) => ({ label: term.label, body: term.definition })),
  'touchpointRole.TOUCHPOINT_ROLE_DEFINITION': TOUCHPOINT_ROLE.map((role) => ({
    label: TOUCHPOINT_ROLE_LABEL[role],
    body: TOUCHPOINT_ROLE_DEFINITION[role],
  })),
  'useStakeholders.STAKEHOLDER_KIND_MEANING': Object.entries(
    STAKEHOLDER_KIND_MEANING,
  ).map(([kind, body]) => ({
    label: STAKEHOLDER_KIND_LABELS[kind as keyof typeof STAKEHOLDER_KIND_LABELS],
    body,
  })),
  'BlueprintDividerBadge.DIVIDER_MEANINGS': Object.entries(
    DIVIDER_MEANINGS,
  ).map(([label, body]) => ({ label, body })),
  'coverContent definition tables': coverContent.tabs.flatMap((tab) =>
    coverTabSections(tab).flatMap((section) =>
      section.kind === 'defs'
        ? section.items.map((item) => ({
            label: item.term,
            body: item.definition,
          }))
        : [],
    ),
  ),
}

/**
 * The ways a body can say the word above it again.
 *
 * Each returns the phrase it matched, so a failure names the mistake rather
 * than only pointing at the string.
 */
function repeatsItsTerm(
  label: string,
  body: string,
): string | null {
  const opening = body.trim().toLowerCase()
  const term = label.trim().toLowerCase()
  // "Storyboard — the frames…", "Storyboard: the frames…" and a bare
  // "Storyboard is…" are one mistake wearing three punctuations.
  if (term && opening.startsWith(term)) return label
  if (opening.startsWith('this is')) return 'This is'
  if (opening.startsWith('these are')) return 'These are'
  for (const verb of ['is', 'are']) {
    if (opening.startsWith(`the ${term} ${verb}`)) return `The ${label} ${verb}`
  }
  return null
}

describe('a definition never repeats its term', () => {
  it.each(Object.entries(ROSTER))('%s', (_module, pairs) => {
    expect(pairs.length).toBeGreaterThan(0)
    for (const { label, body } of pairs) {
      expect(
        repeatsItsTerm(label, body),
        `"${label}" is already printed above this body: ${body}`,
      ).toBe(null)
    }
  })
})
