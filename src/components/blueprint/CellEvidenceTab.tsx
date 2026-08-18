import { useState, type FormEvent } from 'react'
import {
  AlertTriangle,
  BarChart3,
  CalendarCheck,
  CircleDashed,
  ClipboardList,
  Eye,
  ExternalLink,
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
import { useSupabase } from '@/contexts/SupabaseProvider'
import { invalidateEvidence, useEvidence } from '@/hooks/useEvidence'
import { addEvidence } from '@/lib/evidenceMutations'
import { resolveFirstLifecycleId } from '@/lib/lifecycle'
import { safeExternalHref } from '@/lib/sliceCells'
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

function EvidenceRow({ row }: { row: Evidence }) {
  const refHref = safeExternalHref(row.ref)
  return (
    <li className="flex items-start gap-2 border-b border-border/35 py-2 last:border-0">
      {kindIcon(row.kind)}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-xs font-medium text-foreground">{row.title}</p>
        {refHref ? (
          <a
            href={refHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-fit min-w-0 items-center gap-1 text-2xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ExternalLink className="size-3 shrink-0" aria-hidden />
            {/* A citation ref or URL — machine data, and mono keeps a truncated
                one scannable character by character. */}
            <span className="truncate font-mono">{row.ref}</span>
          </a>
        ) : null}
        {row.excerpt ? (
          <p className="border-l-2 border-border pl-2 text-2xs leading-snug text-muted-foreground italic">
            {row.excerpt}
          </p>
        ) : null}
        {row.note ? (
          <p className="text-2xs leading-snug text-muted-foreground">
            {row.note}
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
  const [ref, setRef] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-fit gap-1 text-xs text-muted-foreground"
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
      const lifecycleId = await resolveFirstLifecycleId(client)
      // Through the ledger wrapper, like every other write — an added source
      // shows in the session log and can be taken back.
      await addEvidence(client, {
        serviceLifecycleId: lifecycleId,
        cellId,
        // TODO(map-skill): id placeholder — real IR key-paths come from
        // the skill.
        cellKey: cellId,
        kind,
        title: title.trim(),
        ref: ref.trim() || null,
        excerpt: excerpt.trim() || null,
        note: note.trim() || null,
      })
      setOpen(false)
      setTitle('')
      setRef('')
      setExcerpt('')
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
      <select
        value={kind}
        aria-label="Source kind"
        className="h-7 w-full rounded-md border border-border bg-background px-2 font-mono text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
        onChange={(event) => setKind(event.target.value as EvidenceKind)}
      >
        {EVIDENCE_KINDS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <Input
        required
        placeholder="Title"
        aria-label="Source title"
        className="h-7 text-xs"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />
      <Input
        placeholder="Link or reference"
        aria-label="Source reference"
        className="h-7 text-xs"
        value={ref}
        onChange={(event) => setRef(event.target.value)}
      />
      <textarea
        rows={2}
        placeholder="Excerpt"
        aria-label="Source excerpt"
        className="w-full resize-none rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-ring"
        value={excerpt}
        onChange={(event) => setExcerpt(event.target.value)}
      />
      <textarea
        rows={2}
        placeholder="Note"
        aria-label="Source note"
        className="w-full resize-none rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-ring"
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
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
