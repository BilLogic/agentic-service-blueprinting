import { describe, expect, it } from 'vitest'
import { DIVIDER_MEANINGS } from '@/lib/dividerLines'
import { coverContent } from '@/content/coverContent'
import { coverTabSections } from '@/components/cover/coverModel'
import {
  STAKEHOLDER_KIND_LABELS,
  STAKEHOLDER_KIND_MEANING,
} from '@/hooks/useStakeholders'
import { STATUS_OPTIONS } from '@/components/blueprint/statusOptions'
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
  // The status select's own option list, which is the meaning record and the
  // short-name record as the control actually offers them. Read from the
  // options rather than rebuilt from the two records, so the sweep covers the
  // labels a reader picks from and not a second arrangement of them.
  'StatusSelect.STATUS_OPTIONS': STATUS_OPTIONS.map((option) => ({
    label: option.label,
    body: option.meaning ?? '',
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
 *
 * The label match is WORD-BOUNDARY aware. A bare `startsWith` fails a
 * `Support` body opening "Supporting teams…", which repeats nothing — it is a
 * different word that happens to begin with the same letters. The boundary is
 * "the next character is not a letter or digit", so `Support —`, `Support:`
 * and `Support is` are all still caught.
 */
function repeatsItsTerm(label: string, body: string): string | null {
  const opening = body.trim().toLowerCase()
  const term = label.trim().toLowerCase()
  const opensWith = (phrase: string) =>
    opening.startsWith(phrase) && !/[a-z0-9]/.test(opening.charAt(phrase.length))
  // "Storyboard — the frames…", "Storyboard: the frames…" and a bare
  // "Storyboard is…" are one mistake wearing three punctuations.
  if (term && opensWith(term)) return label
  if (opensWith('this is')) return 'This is'
  if (opensWith('these are')) return 'These are'
  for (const article of ['the', 'a', 'an']) {
    for (const verb of ['is', 'are']) {
      if (opensWith(`${article} ${term} ${verb}`)) {
        return `${article[0]!.toUpperCase()}${article.slice(1)} ${label} ${verb}`
      }
    }
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

/**
 * The predicate's own edges, which the roster cannot show.
 *
 * Every string in the roster passes, so a roster-only suite stays green when
 * the check stops catching anything at all — and just as green when it starts
 * catching words that merely begin with the label.
 */
describe('what counts as repeating the term', () => {
  it.each([
    ['Support', 'Support — teams, vendors and infrastructure.', 'Support'],
    ['Support', 'Support: teams and vendors.', 'Support'],
    ['Support', 'Support is where the work goes.', 'Support'],
    ['Lane', 'This is a row of the board.', 'This is'],
    ['Lane', 'These are the rows of the board.', 'These are'],
    ['Lane', 'The lane is a row of the board.', 'The Lane is'],
    ['Lane', 'A lane is a row of the board.', 'A Lane is'],
    ['Lane', 'An lane are rows of the board.', 'An Lane are'],
  ])('%s + "%s"', (label, body, matched) => {
    expect(repeatsItsTerm(label, body)).toBe(matched)
  })

  it.each([
    // A different word that happens to start with the label's letters.
    ['Support', 'Supporting teams, vendors and infrastructure behind the work.'],
    ['Core', 'Corridors the customer never sees.'],
    // The label appears, but not as the opening word.
    ['Lane', 'A row of the board — one lane per participant.'],
    // An article and the term, with no copula behind it, is prose.
    ['Lane', 'The lane holds one kind of participant.'],
  ])('%s + "%s" is not a repeat', (label, body) => {
    expect(repeatsItsTerm(label, body)).toBe(null)
  })
})
