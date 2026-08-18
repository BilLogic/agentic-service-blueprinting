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
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useSupabase } from '@/contexts/SupabaseProvider'
import { useCellFindings } from '@/hooks/useCellFindings'
import { useEvidence } from '@/hooks/useEvidence'
import { safeExternalHref } from '@/lib/sliceCells'
import { cn } from '@/lib/utils'
import type { Evidence, Finding } from '@/types/database'

const KIND_ICONS: Record<string, typeof FileText> = {
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
  const Icon = KIND_ICONS[kind] ?? CircleDashed
  return (
    <Icon className="mt-px size-3.5 shrink-0 text-muted-foreground" aria-hidden />
  )
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
            {/* A citation ref or URL — machine data; mono keeps a truncated
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
    </div>
  )
}

function EvidenceList({ cellId }: { cellId: string }) {
  const result = useEvidence(cellId)

  if (result.status === 'loading') return <EvidenceLoadingSkeleton />
  if (result.status === 'error') {
    return (
      <p className="text-2xs text-muted-foreground">
        Evidence could not be loaded: {result.message}
      </p>
    )
  }

  const rows = result.data

  return (
    <div className="flex flex-col gap-1">
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
    </div>
  )
}

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  warn: 1,
  info: 2,
}

function FindingRow({ row }: { row: Finding }) {
  return (
    <li className="flex items-start gap-2 border-b border-border/35 py-2 last:border-0">
      <AlertTriangle
        className={cn(
          'mt-px size-3.5 shrink-0',
          row.severity === 'critical'
            ? 'text-destructive'
            : 'text-muted-foreground',
        )}
        aria-hidden
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="flex items-baseline gap-1.5 text-xs font-medium text-foreground">
          <span className="truncate font-mono">{row.check_name}</span>
          <span className="shrink-0 rounded-full border border-border bg-muted px-1.5 py-px font-mono text-3xs leading-tight text-muted-foreground">
            {row.severity}
          </span>
        </p>
        {row.note ? (
          <p className="text-2xs leading-snug text-muted-foreground">
            {row.note}
          </p>
        ) : null}
      </div>
    </li>
  )
}

function FindingsList({ cellId }: { cellId: string }) {
  const result = useCellFindings(cellId)

  // Loading and error stay silent: findings are an audit artifact, and an
  // empty/failed read must not add noise to every cell panel.
  if (result.status !== 'ready' || result.data.length === 0) return null

  const rows = [...result.data].sort(
    (a, b) =>
      (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3),
  )

  return (
    <div className="flex min-w-0 flex-col gap-1" data-cell-findings="">
      <p className="text-xs font-semibold text-foreground">
        Open findings ({rows.length})
      </p>
      <ul className="flex flex-col">
        {rows.map((row) => (
          <FindingRow key={row.id} row={row} />
        ))}
      </ul>
    </div>
  )
}

type CellEvidenceSectionProps = {
  /** Canonical (resolved) cell id; null when the cell is fallback-only. */
  cellId: string | null
}

/**
 * Evidence + open findings for the selected cell — read-only surfaces.
 * Hidden entirely in no-DB sessions (the fixture carries no derived rows,
 * and an offline note on every cell would be noise); a database-backed
 * session sees the evidence list (public-readable by policy) and any open
 * audit findings touching the cell.
 */
export function CellEvidenceSection({ cellId }: CellEvidenceSectionProps) {
  const { client, configured } = useSupabase()

  if (!configured || !client || !cellId) return null

  return (
    <div className="flex min-w-0 flex-col gap-4" data-cell-evidence-section="">
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-xs font-semibold text-foreground">Evidence</p>
        <EvidenceList cellId={cellId} />
      </div>
      <FindingsList cellId={cellId} />
    </div>
  )
}
