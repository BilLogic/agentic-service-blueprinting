import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { findingFingerprint } from '@/lib/mutations/findingFingerprint'

type Client = SupabaseClient<Database>

export type FindingSource = 'audit' | 'whatif'
export type FindingSeverity = 'info' | 'warn' | 'critical'
export type FindingStatus = 'open' | 'resolved' | 'dismissed'

export type NewFinding = {
  lifecycleId: string
  source: FindingSource
  checkName: string
  severity: FindingSeverity
  note: string
  cellIds: string[]
  /** Zero-cell fingerprint scope, required when cellIds is empty. */
  scope?: string
  runId: string
}

export type RecordFindingOutcome = 'recorded' | 'updated-open' | 'stayed-dismissed' | 'reopened'

/**
 * Record one audit/whatif finding with the dedupe contract built in: an
 * open finding with the same fingerprint is updated in place, a dismissed
 * one stays dismissed (nothing is written), a resolved one reopens as a
 * new row. Mirrors the IDE's audit-playbook dedupe exactly, over the
 * canvas fingerprint dialect (findingFingerprint.ts).
 */
export async function recordFinding(
  client: Client,
  input: NewFinding,
): Promise<RecordFindingOutcome> {
  const fingerprint = await findingFingerprint(
    input.checkName,
    input.cellIds,
    input.scope,
  )
  const { data: existing, error: readError } = await client
    .from('findings')
    .select('id, status')
    .eq('service_lifecycle_id', input.lifecycleId)
    .eq('fingerprint', fingerprint)
    .order('updated_at', { ascending: false })
  if (readError) throw new Error(readError.message)

  const open = existing?.find((row) => row.status === 'open')
  const dismissed = existing?.find((row) => row.status === 'dismissed')
  if (open) {
    const { data, error } = await client
      .from('findings')
      .update({
        severity: input.severity,
        note: input.note,
        run_id: input.runId,
        cell_ids: input.cellIds,
        cell_keys: input.cellIds,
        source: input.source,
      })
      .eq('id', open.id)
      .select('id')
    if (error) throw new Error(error.message)
    if (!data || data.length === 0)
      throw new Error('The finding was not written — it may have been deleted since you read it.')
    return 'updated-open'
  }
  if (dismissed) return 'stayed-dismissed'

  const { error: insertError } = await client.from('findings').insert({
    service_lifecycle_id: input.lifecycleId,
    run_id: input.runId,
    source: input.source,
    check_name: input.checkName,
    severity: input.severity,
    note: input.note,
    cell_ids: input.cellIds,
    cell_keys: input.cellIds,
    fingerprint,
  })
  if (insertError) throw new Error(insertError.message)
  return existing && existing.length > 0 ? 'reopened' : 'recorded'
}

/** Triage: the only edit humans or agents make to an existing finding. */
export async function setFindingStatus(
  client: Client,
  findingId: string,
  status: FindingStatus,
): Promise<void> {
  const { data, error } = await client
    .from('findings')
    .update({ status })
    .eq('id', findingId)
    .select('id')
  if (error) throw new Error(error.message)
  if (!data || data.length === 0)
    throw new Error(`No finding with id ${findingId}.`)
}
