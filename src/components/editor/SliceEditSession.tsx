import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { SliceFrameEditor } from '@/components/editor/SliceFrameEditor'
import { CellPickContext, type CellPickApi } from '@/contexts/cellPickContext'
import { useCanvasModeValue } from '@/contexts/canvasModeContext'
import { useSupabase } from '@/contexts/SupabaseProvider'
import { invalidateQueries } from '@/hooks/useSupabaseQuery'
import type { SliceDetail } from '@/hooks/useSlice'
import {
  replaceSliceFrames,
  sliceToken,
  updateSliceMeta,
} from '@/lib/sliceMutations'
import {
  isSliceType,
  validateDraftSlice,
  type DraftFrame,
} from '@/lib/sliceValidation'

/** The saved slice, as frames the editor can mutate. */
function toDraftFrames(detail: SliceDetail): DraftFrame[] {
  return [...detail.items]
    .sort((left, right) => left.position - right.position)
    .map((item) => ({
      id: item.id,
      cells: [...item.cell_ids],
      caption: item.caption ?? '',
      narrative: item.narrative ?? '',
    }))
}

/**
 * An open editing session on one slice: the canvas becomes a picker, the
 * frame strip docks under it, and Save writes both halves.
 *
 * Clicking a cell on the canvas adds it to the **active frame** (or removes
 * it from wherever it is). That is the rule that makes the two surfaces one
 * editor rather than two: the strip says where new cells land, the canvas
 * says which cells.
 */
export function SliceEditSession({
  detail,
  onClose,
  children,
}: {
  detail: SliceDetail
  onClose: () => void
  children: ReactNode
}) {
  const { client } = useSupabase()
  const mode = useCanvasModeValue()
  const [frames, setFrames] = useState<DraftFrame[]>(() => toDraftFrames(detail))
  // Read from `detail`, not the draft: a storyboard upload writes straight to
  // `slice_items` and refreshes the slice, so the draft never sees it.
  const illustrationFor = useCallback(
    (itemId: string) =>
      detail.items.find((item) => item.id === itemId)?.illustration ?? null,
    [detail.items],
  )
  const [activeFrame, setActiveFrame] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const problems = useMemo(
    () =>
      validateDraftSlice({
        title: detail.slice.title,
        description: detail.slice.description ?? '',
        sliceType: isSliceType(detail.slice.slice_type)
          ? detail.slice.slice_type
          : 'custom',
        actor: detail.slice.actor ?? '',
        frames,
      }),
    [detail.slice, frames],
  )

  const toggle = useCallback(
    (cellId: string) => {
      setFrames((current) => {
        const owner = current.findIndex((frame) => frame.cells.includes(cellId))
        if (owner !== -1) {
          return current
            .map((frame, index) =>
              index === owner
                ? { ...frame, cells: frame.cells.filter((id) => id !== cellId) }
                : frame,
            )
            .filter((frame) => frame.cells.length > 0)
        }
        // No frames yet (every one was emptied) — the click starts one.
        if (current.length === 0) {
          return [{ cells: [cellId], caption: '', narrative: '' }]
        }
        const target = Math.min(activeFrame, current.length - 1)
        return current.map((frame, index) =>
          index === target ? { ...frame, cells: [...frame.cells, cellId] } : frame,
        )
      })
    },
    [activeFrame],
  )

  const pick = useMemo<CellPickApi>(() => {
    const order = new Map<string, number>()
    let sequence = 0
    for (const frame of frames) {
      for (const cell of frame.cells) order.set(cell, (sequence += 1))
    }
    return {
      // The whole tab is an editor: a plain click picks, no modifier needed.
      plainClick: true,
      picked: frames.flatMap((frame) => frame.cells),
      isPicked: (cellId) => order.has(cellId),
      orderOf: (cellId) => order.get(cellId),
      // Editing a slice is always additive-by-toggle: a plain click adding a
      // cell must not wipe the frames already built.
      pick: (cellId) => toggle(cellId),
      pickMany: (cellIds) => cellIds.forEach(toggle),
      clear: () => setFrames([]),
    }
  }, [frames, toggle])

  const handleSave = async () => {
    if (!client || busy || problems.length > 0) return
    setBusy(true)
    setError(null)
    try {
      // Meta first, under the concurrency guard: if someone else changed this
      // slice while it was open, stop before rewriting their frames.
      const outcome = await updateSliceMeta(
        client,
        detail.slice.id,
        sliceToken(detail.slice),
        {
          title: detail.slice.title,
          description: detail.slice.description ?? '',
          sliceType: isSliceType(detail.slice.slice_type)
            ? detail.slice.slice_type
            : 'custom',
          actor: detail.slice.actor ?? '',
          origin: detail.slice.origin,
        },
      )
      if (outcome.status === 'conflict') {
        setError(
          'This slice changed somewhere else while you were editing. Close the tab and reopen it to see the current version.',
        )
        return
      }

      await replaceSliceFrames(client, detail.slice.id, frames)
      invalidateQueries('slices')
      invalidateQueries(`slice:${detail.slice.id}`)
      onClose()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <CellPickContext.Provider value={pick}>
      {/* `h-full`, not `flex-1`: the tab content mounts inside an absolutely
          positioned wrapper that is not a flex container, so flex-1 would
          collapse this to its own content height and strand the canvas. */}
      <div className="flex h-full min-h-0 flex-col">
        <div className="relative min-h-0 flex-1">{children}</div>

        {error ? (
          <Alert variant="warning" className="mx-2 mb-1 shrink-0">
            <AlertTriangle className="size-3.5" aria-hidden />
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        ) : null}

        {/* The customization strip is Edit-mode furniture: flipping the
            slice tab to View reads the slice, and reading needs the canvas,
            not the composer. */}
        {mode === 'design' ? (
          <SliceFrameEditor
            frames={frames}
            activeFrame={activeFrame}
            problems={problems}
            sliceId={detail.slice.id}
            illustrationFor={illustrationFor}
            onActivate={setActiveFrame}
            onChange={setFrames}
          />
        ) : null}

        <div className="flex shrink-0 items-center gap-2 border-t border-border bg-sidebar px-3 py-1.5">
          {/* Problems only. The old standing instruction sentence was chrome
              that repeated itself on every open. */}
          <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
            {problems.length > 0 ? problems[0].message : ''}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-7 text-xs"
            disabled={busy || problems.length > 0}
            onClick={handleSave}
          >
            {busy ? 'Saving…' : 'Save slice'}
          </Button>
        </div>
      </div>
    </CellPickContext.Provider>
  )
}
