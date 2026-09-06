import { useCallback } from 'react'
import { useSupabaseQuery, type QueryResult } from '@/hooks/useSupabaseQuery'
import type { Stakeholder } from '@/types/database'

/**
 * What sort of party a registry row is.
 *
 * The first four are ACTORS — they appear in the blueprint as somebody in the
 * room, and can be a lane's `stakeholder_id`. `team` is an accountable group:
 * it reaches a lane through `owner_team` and is never its stakeholder, because
 * Design does not stand in a room.
 */
export type StakeholderKind =
  | 'recipient'
  | 'staff'
  | 'partner'
  | 'provider'
  | 'team'

export const STAKEHOLDER_KIND_LABELS: Record<StakeholderKind, string> = {
  recipient: 'Recipient',
  staff: 'Staff',
  partner: 'Partner',
  provider: 'Provider',
  team: 'Team',
}

/**
 * What each kind of party IS, for the category half of the stakeholder card.
 *
 * The registry had a label for every kind and a meaning for none, so a reader
 * hovering `Blueprint owner` learned its own one-liner and never learned what
 * "Staff" commits it to. Five sentences, written for #243.
 *
 * The distinction they carry is the one the union above documents, and it is
 * the reason the schema has two columns rather than one: the first four are
 * actors who can be a lane's `stakeholder_id`; a `team` reaches a lane through
 * `owner_team` and is never its stakeholder. If the `team` sentence is ever
 * wrong, the schema is wrong with it.
 */
export const STAKEHOLDER_KIND_MEANING: Record<StakeholderKind, string> = {
  recipient:
    'Who the service is for. They stand in the room and can own a lane — the person every other party is arranged around.',
  staff:
    'People inside the organisation who deliver the service. They stand in the room with the recipient or just out of sight of them, and can own a lane.',
  partner:
    'An organisation or person outside the service that takes part in it. The service depends on them and does not direct them.',
  provider:
    'The service itself, named as a party. It is who a value entry is addressed to when the answer is "the service" rather than any one person in it.',
  team: 'An accountable group inside the organisation. A team owns a lane and is never one — it answers for the work rather than standing in the room.',
}

/**
 * The deployment's cast list.
 *
 * One registry replaces four free-text fields that named the same people and
 * agreed with none of them — `lanes.name`, `cells.value_props[].for`,
 * `slices.actor` and the business model's partners. Every surface that used to
 * suggest from whatever strings happened to be in the data reads this instead,
 * so "owner" and "Blueprint owner" stop being two people.
 *
 * The read is deliberately unscoped, and under the shared catalog (ADR 0003)
 * that is now CORRECT rather than a latent bug: the stakeholder pool is the
 * deployment's, so a lane in any service picks from one cast.
 */
export function useStakeholders(): QueryResult<Stakeholder[]> {
  const fallback = useCallback(() => [], [])

  return useSupabaseQuery<Stakeholder[]>(
    'stakeholders',
    async (client) => {
      const { data, error } = await client
        .from('stakeholders')
        .select('*')
        .order('kind')
        .order('name')
      if (error) throw new Error(error.message)
      return data ?? []
    },
    fallback,
  )
}
