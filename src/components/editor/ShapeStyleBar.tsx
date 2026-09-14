import { useState } from 'react'
import { Check, ChevronDown, Circle, Square, Trash2 } from 'lucide-react'
import { Eyebrow } from '@/components/blueprint/Eyebrow'
import {
  ANNOTATION_DEFAULT_STROKE,
  ANNOTATION_FILL_SWATCHES,
  ANNOTATION_STROKE_SWATCHES,
  ANNOTATION_STROKE_WIDTHS,
  annotationSwatchName,
  type ShapeAnnotation,
} from '@/lib/canvasAnnotations'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  AnnotationStyleBarFrame,
  ShapeToolbarDivider,
  ShapeToolbarTooltip,
} from '@/components/editor/CanvasAnnotationBarChrome'
import {
  SHAPE_TOOLBAR_ICON_BUTTON_CLASS,
  SHAPE_TOOLBAR_ITEM_CLASS,
  SHAPE_TOOLBAR_MENU_CLASS,
  SHAPE_TOOLBAR_TRIGGER_CLASS,
} from '@/components/editor/canvasAnnotationChromeStyles'
import {
  ColorSwatch,
  StrokeWidthSwatch,
} from '@/components/editor/CanvasAnnotationSwatches'
import { cn } from '@/lib/utils'

/** Compact Figma-style shape controls: type · fill · stroke · delete. */
export function ShapeStyleBar({
  shape,
  zoom,
  onChange,
  onDelete,
}: {
  shape: ShapeAnnotation
  zoom: number
  onChange: (patch: Partial<ShapeAnnotation>) => void
  onDelete: () => void
}) {
  const [fillOpen, setFillOpen] = useState(false)
  const [strokeOpen, setStrokeOpen] = useState(false)
  const ShapeIcon = shape.type === 'ellipse' ? Circle : Square
  const fillPreview = shape.fillColor
  const strokePreview = shape.color

  return (
    <AnnotationStyleBarFrame
      x={shape.x}
      y={shape.y}
      width={shape.width}
      zoom={zoom}
    >
      <DropdownMenu>
        <ShapeToolbarTooltip label="Shape">
          <DropdownMenuTrigger
            aria-label="Shape"
            className={SHAPE_TOOLBAR_TRIGGER_CLASS}
          >
            <ShapeIcon className="size-4" strokeWidth={2} aria-hidden />
            <ChevronDown className="size-3 opacity-80" aria-hidden />
          </DropdownMenuTrigger>
        </ShapeToolbarTooltip>
        <DropdownMenuContent
          align="start"
          side="top"
          sideOffset={8}
          className={cn('min-w-36', SHAPE_TOOLBAR_MENU_CLASS)}
          data-annotation-chrome=""
        >
          <DropdownMenuItem
            onClick={() => onChange({ type: 'rect' })}
            className={SHAPE_TOOLBAR_ITEM_CLASS}
          >
            <Square className="size-4" aria-hidden />
            Rectangle
            {shape.type === 'rect' ? (
              <Check className="ml-auto size-3.5" aria-hidden />
            ) : null}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onChange({ type: 'ellipse' })}
            className={SHAPE_TOOLBAR_ITEM_CLASS}
          >
            <Circle className="size-4" aria-hidden />
            Ellipse
            {shape.type === 'ellipse' ? (
              <Check className="ml-auto size-3.5" aria-hidden />
            ) : null}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ShapeToolbarDivider />

      <Popover open={fillOpen} onOpenChange={setFillOpen}>
        <ShapeToolbarTooltip label="Fill">
          <PopoverTrigger
            aria-label="Fill"
            className={SHAPE_TOOLBAR_TRIGGER_CLASS}
          >
            <span
              className={cn(
                'size-4 rounded-full border border-(--border-annotation-chrome)',
                !fillPreview && 'swatch-empty-dark',
              )}
              style={fillPreview ? { backgroundColor: fillPreview } : undefined}
              aria-hidden
            />
            <ChevronDown className="size-3 opacity-80" aria-hidden />
          </PopoverTrigger>
        </ShapeToolbarTooltip>
        <PopoverContent
          align="center"
          side="top"
          sideOffset={8}
          className={cn('w-auto min-w-0 p-2.5', SHAPE_TOOLBAR_MENU_CLASS)}
          data-annotation-chrome=""
          onMouseDown={(e) => e.preventDefault()}
        >
          <Eyebrow className="mb-1.5 block text-(--foreground-annotation-chrome-tertiary)">
            Fill
          </Eyebrow>
          <div className="flex flex-wrap items-center gap-1.5">
            <ColorSwatch
              empty
              label="No fill"
              selected={shape.fillColor === null}
              onSelect={() => {
                onChange({ fillColor: null })
                setFillOpen(false)
              }}
            />
            {ANNOTATION_FILL_SWATCHES.map((swatch) => (
              <ColorSwatch
                key={`fill-${swatch}`}
                color={swatch}
                label={`Fill ${annotationSwatchName(swatch)}`}
                selected={shape.fillColor === swatch}
                onSelect={() => {
                  onChange({ fillColor: swatch })
                  setFillOpen(false)
                }}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <ShapeToolbarDivider />

      <Popover open={strokeOpen} onOpenChange={setStrokeOpen}>
        <ShapeToolbarTooltip label="Line style">
          <PopoverTrigger
            aria-label="Line style"
            className={SHAPE_TOOLBAR_TRIGGER_CLASS}
          >
            <span
              className="flex size-4 flex-col items-center justify-center gap-[2.5px]"
              aria-hidden
            >
              <span
                className="block h-px w-3.5 rounded-full"
                style={{ backgroundColor: strokePreview ?? 'var(--color-gray-700)' }}
              />
              <span
                className="block h-[2px] w-3.5 rounded-full"
                style={{ backgroundColor: strokePreview ?? 'var(--color-gray-700)' }}
              />
              <span
                className="block h-[3px] w-3.5 rounded-full"
                style={{ backgroundColor: strokePreview ?? 'var(--color-gray-700)' }}
              />
            </span>
            <ChevronDown className="size-3 opacity-80" aria-hidden />
          </PopoverTrigger>
        </ShapeToolbarTooltip>
        <PopoverContent
          align="center"
          side="top"
          sideOffset={8}
          className={cn('w-auto min-w-0 p-2.5', SHAPE_TOOLBAR_MENU_CLASS)}
          data-annotation-chrome=""
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <Eyebrow className="text-(--foreground-annotation-chrome-tertiary)">
              Stroke
            </Eyebrow>
            {shape.color ? (
              <div className="flex items-center gap-0.5">
                {ANNOTATION_STROKE_WIDTHS.map((width) => (
                  <StrokeWidthSwatch
                    key={width}
                    width={width}
                    selected={shape.strokeWidth === width}
                    onSelect={() => onChange({ strokeWidth: width })}
                  />
                ))}
              </div>
            ) : (
              <span className="text-xs text-(--foreground-annotation-chrome-tertiary)">
                None
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <ColorSwatch
              empty
              label="No stroke"
              selected={shape.color === null}
              onSelect={() => {
                onChange({ color: null })
                setStrokeOpen(false)
              }}
            />
            {ANNOTATION_STROKE_SWATCHES.map((swatch) => (
              <ColorSwatch
                key={`stroke-${swatch}`}
                color={swatch}
                label={`Stroke ${annotationSwatchName(swatch)}`}
                selected={shape.color === swatch}
                onSelect={() => {
                  onChange({
                    color: swatch,
                    strokeWidth:
                      shape.strokeWidth > 0
                        ? shape.strokeWidth
                        : ANNOTATION_DEFAULT_STROKE,
                  })
                  setStrokeOpen(false)
                }}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <ShapeToolbarDivider />

      <ShapeToolbarTooltip label="Delete">
        <button
          type="button"
          aria-label="Delete shape"
          onClick={onDelete}
          className={SHAPE_TOOLBAR_ICON_BUTTON_CLASS}
        >
          <Trash2 className="size-3.5" aria-hidden />
        </button>
      </ShapeToolbarTooltip>
    </AnnotationStyleBarFrame>
  )
}
