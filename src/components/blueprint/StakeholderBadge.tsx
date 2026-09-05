import { PanelKindBadge } from '@/components/blueprint/panelShell'
import {
  STAKEHOLDER_KIND_LABELS,
  STAKEHOLDER_KIND_MEANING,
  type StakeholderKind,
} from '@/hooks/useStakeholders'

/**
 * The owner badge — which member of the cast owns this row, what KIND of party
 * that is, and what the registry says this one IS.
 *
 * Two sections, and they are the reason this is a card rather than a sentence.
 * The name alone left a reader knowing that `Regular Tutor` owns the lane and
 * not knowing that "Staff" means somebody inside the organisation who can own
 * one at all — a distinction the schema turns on, because a `team` reaches a
 * lane through `owner_team` and is never its stakeholder. Category above
 * instance, hairline between, both headed the same way (#243).
 *
 * The instance definition is read from `stakeholders.summary` and is never
 * copied onto the thing that displays it. That is the whole reason the badge
 * takes a stakeholder rather than a string: a stakeholder is service-level and
 * owns many rows — `Regular Tutor` owns 37 lanes — so a copy per row would be
 * 37 chances to disagree with the one place the definition is authored.
 *
 * The definition hangs off the badge itself rather than an ⓘ beside it, for
 * the reason `PanelKindBadge` was built: the badge IS the name whose meaning
 * is in question, and hovering the word you do not recognise is where you
 * would look for it. The standing prohibition that goes with it — nothing
 * carries two mechanisms for one fact — is why no caller of this component
 * also prints the same sentence.
 *
 * A stakeholder with no summary still opens: the kind and its meaning are
 * authored constants and are always there, so the card is never empty. Only
 * the instance section drops out, because a heading over blank space is a
 * promise of content that never arrives.
 */
export function StakeholderBadge({
  name,
  kind,
  summary,
}: {
  name: string
  /** Which of the five kinds of party this row is. */
  kind: StakeholderKind
  /** The registry's own one-liner, or null while nobody has written one. */
  summary: string | null
}) {
  return (
    <PanelKindBadge
      label={name}
      title={name}
      category={{
        eyebrow: STAKEHOLDER_KIND_LABELS[kind],
        body: STAKEHOLDER_KIND_MEANING[kind],
      }}
      description={summary}
    />
  )
}
