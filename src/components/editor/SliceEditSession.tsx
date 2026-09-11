import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { SliceSlideEditor } from '@/components/editor/SliceSlideEditor'
import { SlideRemovalDialog } from '@/components/editor/SlideRemovalDialog'
import { CellPickContext, type CellPickApi } from '@/contexts/cellPickContext'
import { useCanvasModeValue } from '@/contexts/canvasModeContext'
import { useSupabase } from '@/contexts/SupabaseProvider'
import { invalidateQueries } from '@/hooks/useSupabaseQuery'
import type { SliceDetail } from '@/hooks/useSlice'
import {
  replaceSlides,
  sliceToken,
  updateSliceMeta,
} from '@/lib/sliceMutations'
import {
  isSliceKind,
  validateDraftSlice,
  type DraftSlide,
} from '@/lib/sliceValidation'
import type { SlideWithImageSet } from '@/lib/slideImages'
import {
  settleSlides,
  toggleSlideCell,
  type SlideRemoval,
} from '@/lib/slideRemoval'
import { errorMessage } from '@/lib/utils'

/** The saved slice, as slides the editor can mutate. */
function toDraftSlides(detail: SliceDetail): DraftSlide[] {
  return [...detail.items]
    .sort((left, right) => left.position - right.position)
    .map((item) => ({
      id: item.id,
      cells: [...item.cell_ids],
      title: item.title ?? '',
      caption: item.caption ?? '',
    }))
}

/**
 * An open editing session on one slice: the canvas becomes a picker, the
 * slide strip docks under it, and Save writes both halves.
 *
 * Clicking a cell on the canvas adds it to the **active slide** (or removes
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
  const [slides, setSlides] = useState<DraftSlide[]>(() => toDraftSlides(detail))
  // Read from `detail`, not the draft: an illustration upload writes straight
  // to `slides` and refreshes the slice, so the draft never sees it.
  const savedSlideFor = useCallback(
    (itemId: string) => detail.items.find((item) => item.id === itemId) ?? null,
    [detail.items],
  )
  const [activeSlide, setActiveSlide] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const problems = useMemo(
    () =>
      validateDraftSlice({
        title: detail.slice.title,
        summary: detail.slice.summary ?? '',
        sliceKind: isSliceKind(detail.slice.kind)
          ? detail.slice.kind
          : 'custom',
        actor: detail.slice.actor ?? '',
        slides,
      }),
    [detail.slice, slides],
  )

  // A change waiting on the removal confirmation: what stays if it is
  // confirmed, and the slides it would take along with their content.
  const [pending, setPending] = useState<{
    kept: DraftSlide[]
    lost: SlideRemoval[]
  } | null>(null)

  // Uploads live on the saved row, not the draft — see `savedSlideFor`.
  const uploadsFor = useCallback(
    (slide: DraftSlide) => {
      if (!slide.id) return 0
      const saved = savedSlideFor(slide.id) as SlideWithImageSet | null
      return (
        saved?.slide_images?.filter((member) => member.image_url).length ?? 0
      )
    },
    [savedSlideFor],
  )

  // Every way cells leave slides comes through here: the strip's drags and
  // ✕, and the canvas's clicks and clear. A slide the change empties goes;
  // one that carries a caption or an upload goes only once that is confirmed.
  const takeCells = useCallback(
    (next: DraftSlide[]) => {
      const { kept, lost } = settleSlides(slides, next, uploadsFor)
      if (lost.length > 0) setPending({ kept, lost })
      else setSlides(kept)
    },
    [slides, uploadsFor],
  )

  // One settle for the whole batch, so a multi-pick that empties two slides
  // asks once, about both.
  const toggle = useCallback(
    (cellIds: readonly string[]) =>
      takeCells(
        cellIds.reduce(
          (current, cellId) => toggleSlideCell(current, cellId, activeSlide),
          slides,
        ),
      ),
    [activeSlide, slides, takeCells],
  )

  const pick = useMemo<CellPickApi>(() => {
    const order = new Map<string, number>()
    let sequence = 0
    for (const slide of slides) {
      for (const cell of slide.cells) order.set(cell, (sequence += 1))
    }
    return {
      // The whole tab is an editor: a plain click picks, no modifier needed.
      plainClick: true,
      picked: slides.flatMap((slide) => slide.cells),
      isPicked: (cellId) => order.has(cellId),
      orderOf: (cellId) => order.get(cellId),
      // Editing a slice is always additive-by-toggle: a plain click adding a
      // cell must not wipe the slides already built.
      pick: (cellId) => toggle([cellId]),
      pickMany: (cellIds) => toggle(cellIds),
      clear: () => takeCells(slides.map((slide) => ({ ...slide, cells: [] }))),
    }
  }, [slides, takeCells, toggle])

  const handleSave = async () => {
    if (!client || busy || problems.length > 0) return
    setBusy(true)
    setError(null)
    try {
      // Meta first, under the concurrency guard: if someone else changed this
      // slice while it was open, stop before rewriting their slides.
      const outcome = await updateSliceMeta(
        client,
        detail.slice.id,
        sliceToken(detail.slice),
        {
          title: detail.slice.title,
          summary: detail.slice.summary ?? '',
          sliceKind: isSliceKind(detail.slice.kind)
            ? detail.slice.kind
            : 'custom',
          actor: detail.slice.actor ?? '',
          authorship: detail.slice.authorship,
        },
      )
      if (outcome.status === 'conflict') {
        setError(
          'This slice changed somewhere else while you were editing. Close the tab and reopen it to see the current version.',
        )
        return
      }

      await replaceSlides(client, detail.slice.id, slides)
      invalidateQueries('slices')
      invalidateQueries(`slice:${detail.slice.id}`)
      onClose()
    } catch (saveError) {
      setError(errorMessage(saveError))
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
          <SliceSlideEditor
            slides={slides}
            activeSlide={activeSlide}
            problems={problems}
            sliceId={detail.slice.id}
            savedSlideFor={savedSlideFor}
            onActivate={setActiveSlide}
            onChange={setSlides}
            onRemoveCells={takeCells}
          />
        ) : null}

        <SlideRemovalDialog
          lost={pending?.lost ?? null}
          onKeep={() => setPending(null)}
          onRemove={() => {
            if (pending) setSlides(pending.kept)
            setPending(null)
          }}
        />

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
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
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
