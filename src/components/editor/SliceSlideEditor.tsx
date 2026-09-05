import { useState, type DragEvent } from 'react'
import { ChevronDown, GripVertical, Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { IconTooltip } from '@/components/editor/IconTooltip'
import { SliceStoryboardField } from '@/components/editor/SliceStoryboardField'
import { cn } from '@/lib/utils'
import { describeCell } from '@/lib/canvasCellQuery'
import type { DraftSlide, ValidationProblem } from '@/lib/sliceValidation'
import type { Json } from '@/types/database'

/**
 * The slide editor, docked under the canvas while a slice is being edited.
 *
 * Drag lives *here*, never on the artboard: the canvas is a pan/zoom surface,
 * and a drag that starts on a cell is already the camera's gesture. So the
 * two halves of editing split by what they are good at — the canvas adds and
 * removes cells by clicking, this strip decides grouping and order.
 *
 * Two drag targets, deliberately distinct:
 * - a **cell chip** moves between slides (the "which slide is this in"
 *   question);
 * - a **slide header** reorders slides (the "what order do they play in"
 *   question).
 */
export function SliceSlideEditor({
  slides,
  activeSlide,
  problems,
  sliceId,
  illustrationFor,
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
  illustrationFor: (itemId: string) => Json | null
  onActivate: (index: number) => void
  onChange: (slides: DraftSlide[]) => void
}) {
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
  // The strip folds like an accordion: the screens are working material,
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
  const sequenceByFrame = slides.map((slide, slideIndex) => {
    const before = slides
      .slice(0, slideIndex)
      .reduce((total, earlier) => total + earlier.cells.length, 0)
    return slide.cells.map((_, cellIndex) => before + cellIndex + 1)
  })

  return (
    <div className="flex shrink-0 flex-col border-t border-border bg-sidebar">
      <button
        type="button"
        aria-expanded={!collapsed}
        onClick={() => setCollapsed((value) => !value)}
        className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-2xs font-medium text-muted-foreground hover:text-foreground"
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
    <div className="flex max-h-56 shrink-0 gap-2 overflow-x-auto overflow-y-hidden px-2 pb-2">
      {slides.map((slide, index) => {
        const frameProblems = problems.filter(
          (problem) => problem.slide === index,
        )
        const isActive = index === activeSlide

        return (
          <div
            key={index}
            className={cn(
              // min-h-0 + overflow-hidden: a card taller than the strip must
              // clip inside itself, not paint its narrative over the next
              // row's captions.
              'group/slide flex min-h-0 w-56 shrink-0 flex-col gap-1.5 overflow-hidden rounded-lg border bg-card p-2 transition-colors',
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
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-foreground text-3xs font-semibold text-contrast">
                {index + 1}
              </span>
              <Input
                value={slide.title}
                placeholder="Screen title"
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

            <ul className="flex max-h-24 min-h-8 shrink-0 flex-col gap-1 overflow-y-auto">
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
                    // Top half inserts before this chip, bottom half after —
                    // one drag is the whole reordering grammar.
                    const box = event.currentTarget.getBoundingClientRect()
                    const before = event.clientY < box.top + box.height / 2
                    setCellDrop({
                      slide: index,
                      index: before ? cellIndex : cellIndex + 1,
                    })
                  }}
                  className={cn(
                    'group/cell flex cursor-grab items-center gap-1.5 rounded-md bg-muted/60 px-1.5 py-1 text-2xs active:cursor-grabbing',
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
                    {sequenceByFrame[index][cellIndex]}
                  </span>
                  {/* The cell's words, not the tail of its key. `070110` is
                      an address; nobody recognises their content by address. */}
                  <span className="min-w-0 flex-1 truncate text-2xs text-foreground/80">
                    {describeCell(cell).label}
                  </span>
                  <IconTooltip label="Take this cell out of the screen">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Remove cell from slice"
                      // Revealed on chip hover — a permanent ✕ per row is the
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

            <textarea
              value={slide.narrative}
              rows={2}
              // shrink-0: the textarea holds its two rows and scrolls its
              // own overflow rather than being squeezed by the card.
              placeholder="Narrative"
              onClick={(event) => event.stopPropagation()}
              onChange={(event) =>
                onChange(
                  slides.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, narrative: event.target.value }
                      : item,
                  ),
                )
              }
              className="w-full shrink-0 resize-none rounded-md border border-input bg-transparent px-1.5 py-1 text-2xs outline-none focus-visible:border-ring"
            />

            <SliceStoryboardField
              sliceId={sliceId}
              itemId={slide.id}
              illustration={slide.id ? illustrationFor(slide.id) : null}
            />

            {frameProblems.length > 0 ? (
              <p className="text-3xs text-destructive">
                {frameProblems[0].message}
              </p>
            ) : null}

            {/* Split and Merge are gone everywhere in slices — dragging a
                cell between screens IS both. Delete is the only action a
                drag cannot express, revealed on hover. */}
            <div className="flex items-center opacity-0 transition-opacity group-hover/slide:opacity-100 focus-within:opacity-100">
              <IconTooltip label={`Delete screen ${index + 1}`}>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Delete screen ${index + 1}`}
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
          onChange([...slides, { cells: [], title: '', narrative: '' }])
          onActivate(slides.length)
        }}
      >
        <Plus className="size-4" />
        Add screen
      </button>
    </div>
      )}
    </div>
  )
}
