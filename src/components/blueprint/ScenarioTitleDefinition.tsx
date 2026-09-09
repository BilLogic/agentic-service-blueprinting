import type { ReactElement } from 'react'
import { EntityDefinitionPopover } from '@/components/blueprint/EntityDefinitionPopover'
import type { NavItem } from '@/types/nav'

type ScenarioTitleDefinitionProps = {
  /** A phase slide's title says PHASE; a scenario's says SCENARIO. */
  kind?: 'phase' | 'scenario'
  /** The scenario whose note to carry, where the row has one. */
  slide?: Pick<NavItem, 'note'> | null
  children: ReactElement
}

/**
 * A slide header's title, carrying what a scenario IS and — where the row has
 * one — `scenarios.note`, the aside beside it.
 *
 * `ScenarioTitleBadge` already does this for a name printed ON a container's
 * edge. A slide header's name is an `<h1>`, not a badge, and the two must not
 * be the same component: one is a heading and the other is a label. What they
 * share is the card, so both reach for `EntityDefinitionPopover` and neither
 * composes sections of its own.
 *
 * The note rides on the WORD rather than on an ⓘ parked beside it. Four other
 * surfaces use that glyph to mean *opens the panel*, and one glyph cannot mean
 * both that and *there is an aside here*. So the aside goes onto the thing it
 * is about, where every other explanation on this canvas now lives.
 *
 * A popover rather than a tooltip, for the reason the badge gives: a tooltip
 * never opens on touch, so on a phone the note would not be readable at all.
 *
 * The summary is deliberately not passed. Both slide headers already print it
 * as prose directly under the title, and a popover repeating it would be two
 * mechanisms for one fact.
 */
export function ScenarioTitleDefinition({
  kind = 'scenario',
  slide,
  children,
}: ScenarioTitleDefinitionProps) {
  return (
    <EntityDefinitionPopover
      kind={kind}
      note={slide?.note ?? null}
      side="bottom"
    >
      {children}
    </EntityDefinitionPopover>
  )
}
