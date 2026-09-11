import { useState, type FormEvent } from 'react'
import {
  AlertTriangle,
  BarChart3,
  CalendarCheck,
  CircleDashed,
  ClipboardList,
  Eye,
  FileText,
  Lightbulb,
  MessageSquare,
  Plus,
} from 'lucide-react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { DeferredSkeleton } from '@/components/ui/deferred-skeleton'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Field } from '@/components/blueprint/panelShell'
import { useSupabase } from '@/contexts/SupabaseProvider'
import { invalidateEvidence, useEvidence } from '@/hooks/useEvidence'
import { addEvidence } from '@/lib/evidenceMutations'
import { linkedTextSegments } from '@/lib/linkedText'
import { resolveFirstServiceId } from '@/lib/service'
import type { Database, Evidence } from '@/types/database'

const EVIDENCE_KINDS = [
  'interview',
  'survey',
  'analytics',
  'doc',
  'meeting',
  'decision',
  'observation',
  'other',
] as const

type EvidenceKind = (typeof EVIDENCE_KINDS)[number]

const KIND_ICONS: Record<EvidenceKind, typeof FileText> = {
  interview: MessageSquare,
  survey: ClipboardList,
  analytics: BarChart3,
  doc: FileText,
  meeting: CalendarCheck,
  decision: Lightbulb,
  observation: Eye,
  other: CircleDashed,
}

function kindIcon(kind: string) {
  const Icon = KIND_ICONS[kind as EvidenceKind] ?? CircleDashed
  return <Icon className="mt-px size-3.5 shrink-0 text-muted-foreground" aria-hidden />
}

/**
 * A saved source: one title, one kind, one note, one text treatment.
 *
 * It wore three at once — a monospaced link, an italic passage behind a left
 * rule, and the note — which is three ways of saying "this text is different"
 * stacked in a panel 264 pixels wide. The kind is a quiet suffix after the
 * title now, so the icon reinforces it rather than carrying it alone, and a
 * URL written inside the note is the link.
 */
function EvidenceRow({ row }: { row: Evidence }) {
  return (
    <li className="flex items-start gap-2 border-b border-muted py-2 last:border-0">
      {kindIcon(row.kind)}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-xs font-medium break-words text-foreground">
          {row.title}{' '}
          <span className="font-normal text-muted-foreground">{row.kind}</span>
        </p>
        {row.note ? (
          <p className="text-xs break-words text-muted-foreground">
            {linkedTextSegments(row.note).map((segment, index) =>
              segment.kind === 'link' ? (
                <a
                  key={index}
                  href={segment.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 transition-colors hover:text-foreground"
                >
                  {segment.text}
                </a>
              ) : (
                <span key={index}>{segment.text}</span>
              ),
            )}
          </p>
        ) : null}
      </div>
    </li>
  )
}

function AddSourceForm({
  client,
  cellId,
  onAdded,
}: {
  client: SupabaseClient<Database>
  cellId: string
  onAdded: () => void
}) {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<EvidenceKind>('interview')
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-fit gap-1 text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Plus className="size-3" />
        Add source
      </Button>
    )
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy || !title.trim()) return
    setBusy(true)
    setError(null)
    try {
      const serviceId = await resolveFirstServiceId(client)
      // Through the ledger wrapper, like every other write — an added source
      // shows in the session log and can be taken back.
      await addEvidence(client, {
        serviceId: serviceId,
        cellId,
        // TODO(map-skill): id placeholder — real IR key-paths come from
        // the skill.
        cellKey: cellId,
        kind,
        title: title.trim(),
        note: note.trim() || null,
      })
      setOpen(false)
      setTitle('')
      setNote('')
      onAdded()
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : String(submitError),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      className="flex flex-col gap-2 rounded-lg border border-border bg-muted/20 p-2.5"
      onSubmit={(event) => {
        void handleSubmit(event)
      }}
    >
      {/* Three fields, one group, no rule between them. The form used to draw
          a locator and a quotation as separate questions from the title; of 66
          rows in production the locator was filled zero times and the
          quotation twice, once with a summary. `Field` supplies the label —
          a placeholder disappears the moment an author starts typing, and the
          asterisk is this panel's only signal that a field cannot be left
          empty, so its absence on Note is what says Note is optional. */}
      <Field label="Kind">
        <select
          value={kind}
          aria-label="Kind"
          className="h-7 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          onChange={(event) => setKind(event.target.value as EvidenceKind)}
        >
          {EVIDENCE_KINDS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Title" required>
        <Input
          required
          placeholder="What the source is"
          aria-label="Title"
          className="h-7 text-xs"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </Field>
      <Field label="Note">
        <textarea
          rows={3}
          placeholder="Anything worth keeping — a quotation, an observation, a link"
          aria-label="Note"
          className="w-full resize-none rounded-md border border-input bg-background px-2 py-1.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </Field>
      {error ? (
        /* The source was not saved — an error, not a caution. */
        <Alert variant="destructive">
          <AlertTriangle className="size-3.5" aria-hidden />
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex items-center justify-end gap-1.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? 'Adding…' : 'Add source'}
        </Button>
      </div>
    </form>
  )
}

/** Reserves the summary line plus one source row while evidence loads. */
function EvidenceLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-hidden>
      <Skeleton className="h-4 w-24 rounded-full" />
      <div className="flex items-start gap-2 py-2">
        <Skeleton className="mt-px size-3.5 rounded-full" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Skeleton className="h-3 w-2/3 rounded-full" />
          <Skeleton className="h-3 w-1/3 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-7 w-28 rounded-md" />
    </div>
  )
}

function EvidenceList({
  client,
  cellId,
}: {
  client: SupabaseClient<Database>
  cellId: string
}) {
  const result = useEvidence(cellId)

  if (result.status === 'error') {
    return (
      /* The fetch failed and the list is empty — an error, not a caution. */
      <Alert variant="destructive">
        <AlertTriangle className="size-3.5" aria-hidden />
        <AlertDescription className="text-xs">
          Evidence could not be loaded: {result.message}
        </AlertDescription>
      </Alert>
    )
  }

  const rows = result.status === 'ready' ? result.data : []

  return (
    <DeferredSkeleton
      loading={result.status === 'loading'}
      skeleton={<EvidenceLoadingSkeleton />}
    >
      <div className="flex flex-col gap-2">
        <p className="text-xs text-muted-foreground">
          {rows.length === 0 ? (
            <>
              <span aria-hidden>○ </span>
              assumption — no evidence yet
            </>
          ) : (
            <>
              {rows.length} {rows.length === 1 ? 'source' : 'sources'}
            </>
          )}
        </p>
        {rows.length > 0 ? (
          <ul className="flex flex-col">
            {rows.map((row) => (
              <EvidenceRow key={row.id} row={row} />
            ))}
          </ul>
        ) : null}
        <AddSourceForm
          client={client}
          cellId={cellId}
          onAdded={() => invalidateEvidence(cellId)}
        />
      </div>
    </DeferredSkeleton>
  )
}

type CellEvidenceTabProps = {
  /** Canonical (resolved) cell id; null when the cell is fallback-only. */
  cellId: string | null
}

/**
 * Evidence tab. Restricted SELECT means anonymous sessions must see a
 * sign-in prompt — never an all-assumption state derived from an empty
 * restricted read. No-DB sessions get an offline note.
 */
export function CellEvidenceTab({ cellId }: CellEvidenceTabProps) {
  const { client, configured, canWrite } = useSupabase()

  if (!configured || !client) {
    return (
      <p className="text-xs text-muted-foreground">
        Evidence is unavailable offline.
      </p>
    )
  }
  if (!canWrite) {
    return (
      <p className="text-xs text-muted-foreground">
        Evidence requires a connected editor.
      </p>
    )
  }
  if (!cellId) {
    return (
      <p className="text-xs text-muted-foreground">
        This cell is not in the database yet, so it cannot carry evidence.
      </p>
    )
  }

  return <EvidenceList client={client} cellId={cellId} />
}
