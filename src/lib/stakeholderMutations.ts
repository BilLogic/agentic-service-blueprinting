import type { SupabaseClient } from '@supabase/supabase-js'
import { recordChange } from '@/lib/authoringSession'
import { toAuthoringError } from '@/lib/authoringErrors'
import { requireRowsWritten } from '@/lib/optimisticConcurrency'
import type { Database } from '@/types/database'

type Client = SupabaseClient<Database>

export type StakeholderInput = {
  name: string
  kind: string
  /**
   * What this party IS, in one line. A DEFINITION, not an aside — which is
   * why the column is `summary` and not `note`: an aside is the author's
   * working state and belongs where a reader can ignore it, and this is the
   * sentence the badge shows every reader who asks who a party is.
   */
  summary: string | null
  aliases: string[]
}

/**
 * Add someone to the deployment's cast.
 *
 * Deliberately rare: the registry is reference data, and the seed already
 * holds everyone this blueprint names. A new row means a new actor, not a new
 * spelling of an existing one — those go in `aliases`. The cast is the
 * deployment's, not a service's (ADR 0003), so no service is named on insert;
 * `name` is unique across the whole deployment.
 */
export async function createStakeholder(
  client: Client,
  input: StakeholderInput,
): Promise<string> {
  const { data, error } = await client
    .from('stakeholders')
    .insert({
      name: input.name.trim(),
      kind: input.kind,
      summary: input.summary?.trim() || null,
      aliases: input.aliases.map((entry) => entry.trim()).filter(Boolean),
    })
    .select('id')
    .single()
  if (error) throw toAuthoringError(error)
  recordChange(
    'create_stakeholder',
    { stakeholder_id: data.id, name: input.name.trim() },
    { fn: 'delete_stakeholder', args: { stakeholder_id: data.id } },
  )
  return data.id
}

/**
 * Edit one.
 *
 * A rename lands on this row and nowhere else. `slices.actor` is free text a
 * slice carries for itself and no trigger rewrites it, so renaming a party
 * here leaves any slice that quoted the old spelling still quoting it —
 * `aliases` is where that spelling belongs, and is why the column exists.
 * Every surface that reads the cast by `stakeholder_id` — the lane picker,
 * the badge — follows the rename immediately, because they read the name from
 * this row rather than copying it.
 */
export async function updateStakeholder(
  client: Client,
  stakeholderId: string,
  input: StakeholderInput,
  previous?: StakeholderInput,
  options: { record?: boolean } = {},
): Promise<void> {
  const { data, error } = await client
    .from('stakeholders')
    .update({
      name: input.name.trim(),
      kind: input.kind,
      summary: input.summary?.trim() || null,
      aliases: input.aliases.map((entry) => entry.trim()).filter(Boolean),
    })
    .eq('id', stakeholderId)
    .select('id')
  if (error) throw toAuthoringError(error)
  requireRowsWritten(data, 'stakeholder')
  if (options.record !== false) {
    recordChange(
      'update_stakeholder',
      { stakeholder_id: stakeholderId, name: input.name.trim() },
      previous
        ? {
            fn: 'update_stakeholder',
            args: { stakeholder_id: stakeholderId, update: previous },
          }
        : undefined,
    )
  }
}

/** Undo of "added someone" — never offered as a tool of its own. */
export async function deleteStakeholder(
  client: Client,
  stakeholderId: string,
): Promise<void> {
  const { error } = await client
    .from('stakeholders')
    .delete()
    .eq('id', stakeholderId)
  if (error) throw toAuthoringError(error)
}
