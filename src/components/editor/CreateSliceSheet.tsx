import { useMemo, useState, type ReactElement } from 'react'
import { AlertTriangle, ArrowLeft } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { IconTooltip } from '@/components/editor/IconTooltip'
import { SliceScreenComposer } from '@/components/editor/SliceScreenComposer'
import { useSupabase } from '@/contexts/SupabaseProvider'
import { useViewState } from '@/contexts/viewStateStore'
import { invalidateQueries } from '@/hooks/useSupabaseQuery'
import { findFirstServiceId } from '@/lib/service'
import { createSlice } from '@/lib/sliceMutations'
import { deriveSliceType, describeSliceType } from '@/lib/sliceType'
import { validateDraftSlice, type DraftFrame } from '@/lib/sliceValidation'

/** One screen per cell. The starting shape, and the only one worth seeding. */
function seedScreens(cellIds: readonly string[]): DraftFrame[] {
  return cellIds.map((cell) => ({ cells: [cell], caption: '', narrative: '' }))
}

/**
 * Reconcile a live selection change with screens already shaped by hand.
 * Removals are honoured (and an emptied screen disappears, as everywhere
 * else); additions arrive as new one-cell screens at the end, which is the
 * same shape seeding would have given them.
 */
function mergeSelectionIntoScreens(
  current: DraftFrame[],
  cellIds: readonly string[],
): DraftFrame[] {
  const wanted = new Set(cellIds)
  const kept = current
    .map((screen) => ({
      ...screen,
      cells: screen.cells.filter((cell) => wanted.has(cell)),
    }))
    .filter((screen) => screen.cells.length > 0)
  const present = new Set(kept.flatMap((screen) => screen.cells))
  const added = cellIds.filter((cell) => !present.has(cell))
  return [...kept, ...seedScreens(added)]
}

/**
 * Making a slice out of the cells that are picked.
 *
 * A sheet hanging off the button, not a modal. The picked cells are the
 * subject, and a scrim dims the one thing you need to look at while deciding
 * whether the selection is right — so the canvas stays lit and the sheet sits
 * beside it. Closing it does not clear the picks; the selection outlives the
 * sheet.
 *
 * Two steps, because they are two different jobs. Shaping the screens is done
 * against the canvas, glancing between the list and the cells; naming is done
 * afterwards, once you know what you have made. Asking for a title first asks
 * for it at the moment you are least able to give it.
 *
 * No type picker and no quick-group presets. The type is read off the
 * selection, and grouping is a drag — both were controls that made the author
 * answer questions the app had already answered.
 */
export function CreateSliceSheet({
  cellIds,
  open,
  onOpenChange,
  onCreated,
  trigger,
}: {
  cellIds: readonly string[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
  trigger: ReactElement
}) {
  const { client, isEditPreview } = useSupabase()
  const { openTab } = useViewState()
  const [step, setStep] = useState<'screens' | 'name'>('screens')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Screens are seeded one-per-cell and then shaped by hand. When the
  // selection changes under an open sheet — the canvas stays live — the
  // composition is *merged*, never rebuilt: cells that left the selection
  // drop out of their screens, cells that joined append as new screens, and
  // every screen the author already shaped survives. Reseeding on any change
  // used to throw away minutes of drag-composed grouping for one stray pick.
  const [screens, setScreens] = useState<DraftFrame[]>(() => seedScreens(cellIds))
  const [seededFrom, setSeededFrom] = useState(cellIds)
  if (seededFrom !== cellIds) {
    setSeededFrom(cellIds)
    setScreens((current) => mergeSelectionIntoScreens(current, cellIds))
  }

  // Read once per selection rather than per render: it walks the DOM, and the
  // answer cannot change while the same cells are picked.
  const sliceType = useMemo(() => deriveSliceType(cellIds), [cellIds])

  const reset = () => {
    setStep('screens')
    setTitle('')
    setDescription('')
    setError(null)
  }

  const problems = validateDraftSlice({
    title,
    description,
    sliceType,
    // Always blank: the field is gone, and the column stays nullable
    // until a migration drops it.
    actor: '',
    frames: screens,
  })

  const handleCreate = async () => {
    if (!client || busy || !title.trim()) return
    setBusy(true)
    setError(null)
    try {
      const serviceId = await findFirstServiceId(client)
      if (!serviceId) {
        throw new Error('No service service found to attach this slice to.')
      }
      const slice = await createSlice(client, {
        serviceId,
        title,
        description,
        sliceType,
        actor: '',
        cellIds,
        frames: screens,
      })
      invalidateQueries('slices')
      reset()
      onCreated()
      // Land in the slice's own tab — the point of creating it is to look
      // at it, and the tab is also where it gets edited.
      openTab({ kind: 'slice', sliceId: slice.id })
    } catch (createError) {
      const message =
        createError instanceof Error ? createError.message : String(createError)
      // In the preview state every write comes back "permission denied", and
      // raw PostgREST text reads like a bug when it is actually the answer.
      setError(
        isEditPreview && /permission denied/i.test(message)
          ? 'Edit preview can’t write to the database. To author for real, put the authoring key in .env.local (see .env.example) and restart the dev server.'
          : message,
      )
    } finally {
      setBusy(false)
    }
  }

  const cellCount = screens.reduce((total, screen) => total + screen.cells.length, 0)

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) {
          setError(null)
          setStep('screens')
        }
      }}
    >
      <PopoverTrigger render={trigger} />
      <PopoverContent
        side="top"
        align="center"
        sideOffset={10}
        className="w-[26rem] p-0"
      >
        <div className="flex items-center gap-2 border-b border-muted px-3 py-2">
          {step === 'name' ? (
            <IconTooltip label="Back to screens" side="bottom">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label="Back to screens"
                className="shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => setStep('screens')}
              >
                <ArrowLeft className="size-3.5" />
              </Button>
            </IconTooltip>
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-foreground">New slice</p>
            {/*
              What the selection *is*, stated rather than asked. The old
              five-way toggle made the author classify something the picking
              had already decided.
            */}
            <p className="truncate text-2xs text-muted-foreground">
              {describeSliceType(sliceType, cellCount)}
            </p>
          </div>
        </div>

        {step === 'screens' ? (
          <>
            {/* The one scroll surface: capped to the viewport, scrolls once.
                The composer inside grows freely — no scroll within a scroll. */}
            <div
              data-slice-sheet-scroll=""
              className="max-h-[55vh] overflow-y-auto px-3 py-2"
            >
              <SliceScreenComposer screens={screens} onChange={setScreens} />
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-muted px-3 py-2">
              <Button
                type="button"
                size="sm"
                className="h-7 shrink-0 px-2.5 text-xs"
                disabled={cellCount === 0}
                onClick={() => setStep('name')}
              >
                Next
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-2.5 px-3 py-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-foreground">
                  Title<span className="ml-0.5 text-destructive">*</span>
                </span>
                <Input
                  value={title}
                  autoFocus
                  placeholder="First-time customer journey"
                  onChange={(event) => setTitle(event.target.value)}
                />
              </label>

              {/* Both fields, visible at once — this step exists to name the
                  thing, so hiding half the name behind a click saved four
                  pixels and cost a discovery. Required-ness is carried by the
                  labels, not by which field is on screen. */}
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Subtitle{' '}
                  <span className="font-normal text-muted-foreground/70">
                    · optional
                  </span>
                </span>
                <Input
                  value={description}
                  placeholder="What this slice shows, and who it is for"
                  onChange={(event) => setDescription(event.target.value)}
                />
              </label>

              {/*
                No Actor field. It was asked for, stored, and read by nothing —
                no header, no slide, no sidebar row — so it took a decision from
                the author and gave nothing back. For a journey slice the actor
                is already the lane its cells sit in, which is on screen.
              */}

              {error ? (
                <Alert variant="warning">
                  <AlertTriangle className="size-3.5" aria-hidden />
                  <AlertDescription className="text-xs">{error}</AlertDescription>
                </Alert>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-muted px-3 py-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={busy}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-7 px-2.5 text-xs"
                disabled={busy || problems.length > 0 || cellIds.length === 0}
                onClick={handleCreate}
              >
                {busy ? 'Creating…' : 'Create slice'}
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
