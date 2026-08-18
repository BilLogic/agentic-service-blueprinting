import { useState } from 'react'
import { X } from 'lucide-react'
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@/components/editor/SegmentedControl'
import { IconTooltip } from '@/components/editor/IconTooltip'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSupabase } from '@/contexts/SupabaseProvider'
import { invalidateQueries } from '@/hooks/useSupabaseQuery'
import { clearCellDependency, setCellDependency } from '@/lib/authoringRpc'
import {
  DEPENDENCY_KINDS,
  DEPENDENCY_KIND_HINTS,
  DEPENDENCY_KIND_LABELS,
  validateDraftDependency,
  type DependencyEndpoint,
  type DraftDependency,
} from '@/lib/dependencyValidation'
import type { DependencyKind } from '@/lib/authoringRpc'

export type ExistingDependency = {
  id: string
  targetCellId: string
  targetLabel: string
  kind: string
  label: string | null
}

/**
 * Connect this cell to another one in the same version.
 *
 * `trigger` draws an arrow; `needs` does not, and that asymmetry is the whole
 * point of having two kinds. A blueprint where every relationship is drawn is
 * unreadable, and most "this depends on that" facts are constraints rather
 * than handoffs — worth recording, not worth drawing.
 *
 * Candidates come from the caller rather than a query here: the panel already
 * holds the version's cells, and re-reading them would be a second round trip
 * for data on screen.
 */
export function CellDependencyEditor({
  source,
  candidates,
  existing,
  onDone,
}: {
  source: DependencyEndpoint
  candidates: DependencyEndpoint[]
  existing: ExistingDependency[]
  onDone: () => void
}) {
  const { client } = useSupabase()
  const [draft, setDraft] = useState<DraftDependency>({
    sourceCellId: source.cellId,
    targetCellId: null,
    kind: 'trigger',
    label: '',
    note: '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const target =
    candidates.find((entry) => entry.cellId === draft.targetCellId) ?? null
  const problems = validateDraftDependency(draft, source, target, existing)

  const refresh = () => {
    // Arrows are drawn from the grid read, so the canvas has to re-read —
    // invalidating a panel-local query would leave the line on screen.
    invalidateQueries('lifecycle-phases')
  }

  const handleAdd = async () => {
    if (!client || busy || problems.length > 0 || !draft.targetCellId) return
    setBusy(true)
    setError(null)
    try {
      await setCellDependency(client, {
        sourceCellId: draft.sourceCellId,
        targetCellId: draft.targetCellId,
        kind: draft.kind,
        label: draft.label,
        note: draft.note,
      })
      refresh()
      setDraft((current) => ({ ...current, targetCellId: null, label: '' }))
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : String(addError))
    } finally {
      setBusy(false)
    }
  }

  const handleRemove = async (dependencyId: string) => {
    if (!client || busy) return
    setBusy(true)
    setError(null)
    try {
      await clearCellDependency(client, dependencyId)
      refresh()
    } catch (removeError) {
      setError(
        removeError instanceof Error ? removeError.message : String(removeError),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-3" data-cell-dependency-editor="">
      {existing.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {existing.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center gap-2 text-xs text-foreground/80"
            >
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-3xs font-medium">
                {DEPENDENCY_KIND_LABELS[entry.kind as DependencyKind] ??
                  entry.kind}
              </span>
              <span className="min-w-0 flex-1 truncate">{entry.targetLabel}</span>
              <IconTooltip
                label={`Remove the connection to ${entry.targetLabel}`}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove connection to ${entry.targetLabel}`}
                  disabled={busy}
                  onClick={() => handleRemove(entry.id)}
                >
                  <X className="size-3" />
                </Button>
              </IconTooltip>
            </li>
          ))}
        </ul>
      ) : null}

      {/* One control, two positions — the same track-and-raised-square
          vocabulary as the View/Edit switch, because that is what this is:
          a mode for the connection, not two competing buttons. */}
      <SegmentedControl
        aria-label="Connection kind"
        value={draft.kind}
        onValueChange={(kind) => setDraft((current) => ({ ...current, kind }))}
      >
        {DEPENDENCY_KINDS.map((kind) => (
          <SegmentedControlItem key={kind} value={kind}>
            {DEPENDENCY_KIND_LABELS[kind]}
          </SegmentedControlItem>
        ))}
      </SegmentedControl>
      <p className="text-xs text-muted-foreground">
        {DEPENDENCY_KIND_HINTS[draft.kind]}
      </p>

      <select
        value={draft.targetCellId ?? ''}
        onChange={(event) =>
          setDraft((current) => ({
            ...current,
            targetCellId: event.target.value || null,
          }))
        }
        className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
        aria-label="Connect to"
      >
        <option value="">Pick a cell…</option>
        {candidates
          .filter((entry) => entry.cellId !== source.cellId)
          .map((entry) => (
            <option key={entry.cellId} value={entry.cellId}>
              {entry.label}
            </option>
          ))}
      </select>

      <Input
        value={draft.label}
        placeholder="Label (optional)"
        className="h-7 text-xs"
        onChange={(event) =>
          setDraft((current) => ({ ...current, label: event.target.value }))
        }
      />

      {problems.length > 0 && draft.targetCellId ? (
        <ul
          className="flex flex-col gap-1 text-xs text-muted-foreground"
          data-dependency-problems=""
        >
          {problems.map((problem) => (
            <li key={problem}>· {problem}</li>
          ))}
        </ul>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          disabled={busy || problems.length > 0}
          onClick={handleAdd}
        >
          {busy ? 'Connecting…' : 'Connect'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Done
        </Button>
      </div>
    </div>
  )
}
