import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { recordChange } from '@/lib/authoringSession'
import { toAuthoringError } from '@/lib/authoringErrors'

type Client = SupabaseClient<Database>

type EvidenceRow = Database['public']['Tables']['evidence']['Row']
type EvidenceInsert = Database['public']['Tables']['evidence']['Insert']

/** Mirrors the DB CHECK constraint — a bad kind fails at compile time. */
export type EvidenceKind =
  | 'interview'
  | 'survey'
  | 'analytics'
  | 'doc'
  | 'meeting'
  | 'decision'
  | 'observation'
  | 'other'

export type EvidenceDraft = {
  serviceLifecycleId: string
  cellId: string
  /** IR key-path placeholder until the map skill mints real ones. */
  cellKey: string
  kind: EvidenceKind
  title: string
  ref: string | null
  excerpt: string | null
  note: string | null
}

/**
 * Evidence writes, in the session ledger like every other write.
 *
 * Evidence was the one table edited around the funnel — an added source never
 * appeared in the session log and could not be taken back (decision
 * 2026-08-06, access-model plan F4: close the gap rather than document it).
 * Same shape as `cellContentMutations`: direct table write under the row
 * policies, then `recordChange` with a captured inverse; `record: false` is
 * how a revert's own write stays out of the log.
 */
export async function addEvidence(
  client: Client,
  draft: EvidenceDraft,
  options: { record?: boolean } = {},
): Promise<string> {
  const title = draft.title.trim()
  if (!title) {
    throw new Error('Evidence needs a title — an untitled source cites nothing.')
  }

  const { data, error } = await client
    .from('evidence')
    .insert({
      service_lifecycle_id: draft.serviceLifecycleId,
      cell_id: draft.cellId,
      cell_key: draft.cellKey,
      kind: draft.kind,
      title,
      ref: draft.ref?.trim() || null,
      excerpt: draft.excerpt?.trim() || null,
      note: draft.note?.trim() || null,
    })
    .select('id')
    .single()
  if (error) throw toAuthoringError(error)

  if (options.record !== false) {
    recordChange(
      'add_evidence',
      { evidence_id: data.id, cell_id: draft.cellId, title },
      { fn: 'delete_evidence', args: { evidence_id: data.id } },
    )
  }
  return data.id
}

/**
 * Remove one evidence row. `previous` is the full row as it stood — captured
 * by the caller before deleting — so the revert can put it back verbatim,
 * original id and timestamps included (re-inserting under a fresh id would
 * orphan anything that referenced the old one).
 */
export async function deleteEvidence(
  client: Client,
  evidenceId: string,
  previous?: EvidenceRow,
  options: { record?: boolean } = {},
): Promise<void> {
  const { error } = await client.from('evidence').delete().eq('id', evidenceId)
  if (error) throw toAuthoringError(error)

  if (options.record !== false) {
    recordChange(
      'delete_evidence',
      {
        evidence_id: evidenceId,
        title: previous?.title ?? '',
        // The revert path invalidates this cell's evidence query — without
        // it the delete side of the undo pair is uninvalidatable.
        cell_id: previous?.cell_id ?? null,
      },
      previous
        ? { fn: 'restore_evidence_row', args: { row: previous } }
        : undefined,
    )
  }
}

/** The revert side of `delete_evidence`: reinsert the captured row as-was. */
export async function restoreEvidenceRow(
  client: Client,
  row: EvidenceRow,
): Promise<void> {
  const { error } = await client
    .from('evidence')
    .insert(row as EvidenceInsert)
  if (error) throw toAuthoringError(error)
}
