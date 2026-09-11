import { useEffect, useState, useSyncExternalStore, type DragEvent } from 'react'
import {
  getSlideSheetHeight,
  persistSlideSheetHeight,
  setSlideSheetHeight,
  subscribeSlideSheetHeight,
} from '@/lib/slideSheetHeight'
import { ChevronDown, GripVertical, Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { IconTooltip } from '@/components/editor/IconTooltip'
import { SlideImagesField } from '@/components/editor/SlideImagesField'
import { cn } from '@/lib/utils'
import { describeCell } from '@/lib/canvasCellQuery'
import type { DraftSlide, ValidationProblem } from '@/lib/sliceValidation'
import type { Slide } from '@/types/database'

/**
 * The slide editor, docked under the canvas while a slice is being edited.
 *
 * Drag lives *here*, never on the artboard: the canvas is a pan/zoom surface,
 * and a drag that starts on a cell is already the camera's gesture. So the
 * two halves of editing split by what they are good at — the canvas adds and
 * removes cells by clicking, this strip decides grouping and order.
 *
 * Two drag targets, deliberately distinct:
 * - a **cell badge** moves between slides (the "which slide is this in"
 *   question);
 * - a **slide header** reorders slides (the "what order do they play in"
 *   question).
 */
/**
 * The sheet's top edge, dragged.
 *
 * Same shape as `AgentDockDivider`, and deliberately so: one gesture idiom
 * for "make this region taller" rather than a second one that behaves
 * almost the same. Listeners live on `window` because a pointer that leaves
 * the 4px strip mid-drag must not end the drag.
 */
function SlideSheetDivider() {
  const [resizing, setResizing] = useState(false)

  useEffect(() => {
    if (!resizing) return
    const move = (event: PointerEvent) => {
      // The sheet grows UPWARD, so the height is the distance from the
      // pointer to the bottom of the window.
      setSlideSheetHeight(window.innerHeight - event.clientY)
    }
    const up = () => {
      setResizing(false)
      persistSlideSheetHeight()
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [resizing])

  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label="Resize the slides"
      onPointerDown={(event) => {
        event.preventDefault()
        setResizing(true)
      }}
      className={cn(
        'h-1 shrink-0 cursor-row-resize touch-none transition-colors',
        resizing ? 'bg-border' : 'hover:bg-border/80',
      )}
    />
  )
}

/**
 * Whether anything between `from` and `stop` can still scroll the way a
 * vertical wheel of `deltaY` points — a card, or a caption's textarea.
 */
function scrollsVertically(
  from: Element | null,
  stop: Element,
  deltaY: number,
): boolean {
  for (let node = from; node && node !== stop; node = node.parentElement) {
    if (!(node instanceof HTMLElement)) continue
    if (node.scrollHeight <= node.clientHeight) continue
    const room =
      deltaY > 0
        ? node.scrollHeight - node.clientHeight - node.scrollTop
        : node.scrollTop
    if (room > 1) return true
  }
  return false
}

export function SliceSlideEditor({
  slides,
  activeSlide,
  problems,
  sliceId,
  savedSlideFor,
  onActivate,
  onChange,
}: {
  slides: DraftSlide[]
  activeSlide: number
  problems: ValidationProblem[]
  sliceId: string
  /**
   * The saved illustration for a slide's row, read from the slice rather than
   * carried in the draft: the image is written straight to `slides` on
   * upload, so the draft would go stale the moment one lands.
   */
  savedSlideFor: (itemId: string) => Slide | null
  onActivate: (index: number) => void
  onChange: (slides: DraftSlide[]) => void
}) {
  const sheetHeight = useSyncExternalStore(
    subscribeSlideSheetHeight,
    getSlideSheetHeight,
    // The server has no window, and a sheet that renders at a
    // remembered height on the client and a different one in markup
    // is a hydration mismatch on the surface that owns the slides.
    () => 224,
  )
  // What is currently being dragged. Kept in state rather than read from the
  // dataTransfer during dragover, because the payload is not readable there
  // in every browser — only on drop.
  const [dragging, setDragging] = useState<
    | { kind: 'cell'; slide: number; cell: string }
    | { kind: 'slide'; slide: number }
    | null
  >(null)
  const [dropTarget, setDropTarget] = useState<number | null>(null)
  // Where a dragged cell would land inside a slide — one drag reorders,
  // whether the destination is the same slide or another.
  const [cellDrop, setCellDrop] = useState<{
    slide: number
    index: number
  } | null>(null)
  // The strip folds like an accordion: the slides are working material,
  // and while the canvas is the subject the strip collapses to one bar.
  const [collapsed, setCollapsed] = useState(false)

  const update = (next: DraftSlide[]) => {
    onChange(next)
    setDragging(null)
    setDropTarget(null)
    setCellDrop(null)
  }

  const moveCell = (cell: string, to: number, at?: number) => {
    // Remove first, then re-derive the insert index: pulling the cell out
    // shifts everything after it, and inserting at the pre-removal index is
    // how a drag one place down silently becomes a no-op.
    let insertAt = at
    const withoutCell = slides.map((slide, index) => {
      const position = slide.cells.indexOf(cell)
      if (position === -1) return slide
      if (
        index === to &&
        insertAt !== undefined &&
        position < insertAt
      ) {
        insertAt -= 1
      }
      return { ...slide, cells: slide.cells.filter((id) => id !== cell) }
    })

    const next = withoutCell.map((slide, index) => {
      if (index !== to) return slide
      const position = insertAt ?? slide.cells.length
      return {
        ...slide,
        cells: [
          ...slide.cells.slice(0, position),
          cell,
          ...slide.cells.slice(position),
        ],
      }
    })
    // A slide emptied by the move disappears — an empty slide is not a
    // renderable state, and leaving one behind would just fail validation.
    update(next.filter((slide) => slide.cells.length > 0))
  }

  const moveSlide = (from: number, to: number) => {
    if (from === to) return
    const next = [...slides]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    update(next)
  }

  const removeCell = (slideIndex: number, cell: string) => {
    const next = slides
      .map((slide, index) =>
        index === slideIndex
          ? { ...slide, cells: slide.cells.filter((id) => id !== cell) }
          : slide,
      )
      .filter((slide) => slide.cells.length > 0)
    update(next)
  }

  // Running cell number across slides — the same sequence the saved slice
  // shows on the canvas, so the editor and the artboard agree. Derived from
  // the slides above it rather than a running counter, which keeps it a pure
  // function of the render's input.
  const sequenceBySlide = slides.map((slide, slideIndex) => {
    const before = slides
      .slice(0, slideIndex)
      .reduce((total, earlier) => total + earlier.cells.length, 0)
    return slide.cells.map((_, cellIndex) => before + cellIndex + 1)
  })

  return (
    <div className="flex shrink-0 flex-col border-t border-border bg-sidebar">
      {/*
        Above the header, not below it: the grab target is the sheet's top
        EDGE, which is the line a reader is already looking at when they want
        it taller. Hidden while collapsed, where there is no height to drag.
      */}
      {collapsed ? null : <SlideSheetDivider />}
      <button
        type="button"
        aria-expanded={!collapsed}
        onClick={() => setCollapsed((value) => !value)}
        className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronDown
          className={cn(
            'size-3.5 transition-transform',
            collapsed && '-rotate-90',
          )}
          aria-hidden
        />
        Storyboard
      </button>
      {collapsed ? null : (
    <div
      // `height`, not `maxHeight`: the divider sets the sheet's size the way
      // the sidebar's edge sets the sidebar's. A maximum let the strip stop
      // at its tallest card, so a drag past that moved nothing.
      //
      // No sideways scroll bar: a trackpad swipes across natively, and a
      // mouse wheel is turned sideways below.
      className="blueprint-scroll flex shrink-0 gap-2 overflow-x-auto overflow-y-hidden px-2 pb-2"
      style={{ height: sheetHeight }}
      onWheel={(event) => {
        // A wheel that is mostly sideways is already scrolling the strip.
        if (Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return
        // A card with somewhere left to go keeps the wheel; at its end the
        // turn passes to the strip, the way nested page scrolling hands off.
        if (
          scrollsVertically(
            event.target as Element,
            event.currentTarget,
            event.deltaY,
          )
        ) {
          return
        }
        event.currentTarget.scrollLeft += event.deltaY
      }}
    >
      {slides.map((slide, index) => {
        const slideProblems = problems.filter(
          (problem) => problem.slide === index,
        )
        const isActive = index === activeSlide

        return (
          <div
            key={index}
            data-slide-card=""
            className={cn(
              // min-h-0 + overflow-y-auto: a card taller than the sheet
              // scrolls inside itself. Clipping it hid the images and the
              // caption with no way to reach them.
              'group/slide flex min-h-0 w-56 shrink-0 flex-col gap-1.5 overflow-y-auto overscroll-y-contain rounded-lg border bg-card p-2 transition-colors',
              isActive ? 'border-primary' : 'border-border',
              dropTarget === index && 'ring-2 ring-primary/40',
            )}
            onClick={() => onActivate(index)}
            onDragOver={(event: DragEvent) => {
              event.preventDefault()
              setDropTarget(index)
            }}
            onDragLeave={() => setDropTarget((current) => (current === index ? null : current))}
            onDrop={(event: DragEvent) => {
              event.preventDefault()
              if (!dragging) return
              if (dragging.kind === 'cell') {
                moveCell(
                  dragging.cell,
                  index,
                  cellDrop?.slide === index ? cellDrop.index : undefined,
                )
              } else {
                moveSlide(dragging.slide, index)
              }
            }}
          >
            <div
              draggable
              onDragStart={() => setDragging({ kind: 'slide', slide: index })}
              onDragEnd={() => setDragging(null)}
              className="flex cursor-grab items-center gap-1.5 active:cursor-grabbing"
            >
              {/* The grip names the gesture — a row that merely *is*
                  draggable looks exactly like one that is not. */}
              <GripVertical
                className="size-3 shrink-0 text-muted-foreground/50"
                aria-hidden
              />
              {/*
                Content-sized badge: `h-5 min-w-5` keeps one digit a circle,
                `px-1` grows it for two or more. The old `size-5` + 10px
                digit clipped at two.
              */}
              <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-foreground px-1 text-xs font-medium text-contrast">
                {index + 1}
              </span>
              <Input
                value={slide.title}
                // A placeholder is not a label: it disappears the moment
                // somebody types, so a FILLED card is two unnamed boxes, and
                // a screen reader gets a hint rather than a name. The visible
                // name lives on the field below, where there is room for one;
                // here the number and the strip already say which slide this
                // is, so the name is the accessible one.
                aria-label={`Slide ${index + 1} title`}
                placeholder="Slide title"
                className="h-6 min-w-0 flex-1 border-0 bg-transparent px-1 text-xs shadow-none focus-visible:ring-0"
                onClick={(event) => event.stopPropagation()}
                onChange={(event) =>
                  onChange(
                    slides.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, title: event.target.value }
                        : item,
                    ),
                  )
                }
              />
            </div>

            {/* No scroll box of its own: the card scrolls, and a capped list
                inside it was a second box answering the same wheel. */}
            <ul className="flex min-h-8 shrink-0 flex-col gap-1">
              {slide.cells.map((cell, cellIndex) => (
                <li
                  key={cell}
                  draggable
                  onDragStart={() =>
                    setDragging({ kind: 'cell', slide: index, cell })
                  }
                  onDragEnd={() => {
                    setDragging(null)
                    setCellDrop(null)
                  }}
                  onDragOver={(event: DragEvent) => {
                    if (dragging?.kind !== 'cell') return
                    event.preventDefault()
                    // Top half inserts before this badge, bottom half after —
                    // one drag is the whole reordering grammar.
                    const box = event.currentTarget.getBoundingClientRect()
                    const before = event.clientY < box.top + box.height / 2
                    setCellDrop({
                      slide: index,
                      index: before ? cellIndex : cellIndex + 1,
                    })
                  }}
                  className={cn(
                    'group/cell flex cursor-grab items-center gap-1.5 rounded-md bg-muted/60 px-1.5 py-1 text-xs active:cursor-grabbing',
                    cellDrop?.slide === index &&
                      cellDrop.index === cellIndex &&
                      'shadow-[0_-2px_0_0_var(--primary)]',
                    cellDrop?.slide === index &&
                      cellDrop.index === cellIndex + 1 &&
                      'shadow-[0_2px_0_0_var(--primary)]',
                  )}
                >
                  <GripVertical
                    className="size-3 shrink-0 text-muted-foreground/50"
                    aria-hidden
                  />
                  <span className="shrink-0 text-muted-foreground">
                    {sequenceBySlide[index][cellIndex]}
                  </span>
                  {/* The cell's words, not the tail of its key. `070110` is
                      an address; nobody recognises their content by address. */}
                  <span className="min-w-0 flex-1 truncate text-xs text-foreground/80">
                    {describeCell(cell).label}
                  </span>
                  <IconTooltip label="Take this cell out of the slide">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Remove cell from slice"
                      // Revealed on badge hover — a permanent ✕ per row is the
                      // loudest thing on a card that is mostly read.
                      className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/cell:opacity-100 focus-visible:opacity-100 hover:text-foreground"
                      onClick={(event) => {
                        event.stopPropagation()
                        removeCell(index, cell)
                      }}
                    >
                      <X className="size-2.5" />
                    </Button>
                  </IconTooltip>
                </li>
              ))}
            </ul>

            {/*
              Caption is the sentence a reader meets
              under the title on the stage — and it is the one field on this
              card whose name is not implied by anything around it. It gets a
              visible one, in the schema's word.
            */}
            <label className="flex flex-col gap-0.5">
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Caption
              </span>
            <textarea
              value={slide.caption}
              rows={2}
              // shrink-0: the textarea holds its two rows and scrolls its
              // own overflow rather than being squeezed by the card.
              placeholder="What a reader meets under the title"
              onClick={(event) => event.stopPropagation()}
              onChange={(event) =>
                onChange(
                  slides.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, caption: event.target.value }
                      : item,
                  ),
                )
              }
              className="w-full shrink-0 resize-none rounded-md border border-input bg-transparent px-1.5 py-1 text-xs outline-none focus-visible:border-ring"
            />
            </label>

            <SlideImagesField
              sliceId={sliceId}
              itemId={slide.id}
              saved={slide.id ? savedSlideFor(slide.id) : null}
            />

            {slideProblems.length > 0 ? (
              <p className="text-xs text-destructive">
                {slideProblems[0].message}
              </p>
            ) : null}

            {/* Split and Merge are gone everywhere in slices — dragging a
                cell between slides IS both. Delete is the only action a
                drag cannot express, revealed on hover. */}
            <div className="flex items-center opacity-0 transition-opacity group-hover/slide:opacity-100 focus-within:opacity-100">
              <IconTooltip label={`Delete slide ${index + 1}`}>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Delete slide ${index + 1}`}
                  className="ml-auto text-muted-foreground hover:text-destructive"
                  onClick={(event) => {
                    event.stopPropagation()
                    update(slides.filter((_, itemIndex) => itemIndex !== index))
                  }}
                >
                  <Trash2 className="size-3" />
                </Button>
              </IconTooltip>
            </div>
          </div>
        )
      })}

      {/* An empty trailing slide is where the next clicked cell lands. */}
      <button
        type="button"
        className="flex w-28 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
        onClick={() => {
          onChange([...slides, { cells: [], title: '', caption: '' }])
          onActivate(slides.length)
        }}
      >
        <Plus className="size-4" />
        Add slide
      </button>
    </div>
      )}
    </div>
  )
}
