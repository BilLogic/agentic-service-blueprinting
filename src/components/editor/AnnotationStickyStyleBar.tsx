import { useState } from 'react'
import { Bold, Check, ChevronDown, Strikethrough, Trash2 } from 'lucide-react'
import { Eyebrow } from '@/components/blueprint/Eyebrow'
import {
  ANNOTATION_FONT_SIZES,
  ANNOTATION_STICKY_SWATCHES,
  annotationFontSizeLabel,
  annotationSwatchName,
  type StickyAnnotation,
} from '@/lib/canvasAnnotations'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  AnnotationStyleBarFrame,
  AnnotationBarDivider,
  AnnotationBarTooltip,
} from '@/components/editor/CanvasAnnotationBarChrome'
import {
  ANNOTATION_BAR_ICON_BUTTON_CLASS,
  ANNOTATION_BAR_MENU_CLASS,
  ANNOTATION_BAR_TRIGGER_CLASS,
} from '@/components/editor/canvasAnnotationChromeStyles'
import { ColorSwatch } from '@/components/editor/CanvasAnnotationSwatches'
import { cn } from '@/lib/utils'

/** FigJam-style sticky controls: color · size · bold · strike · delete. */
export function AnnotationStickyStyleBar({
  sticky,
  zoom,
  onChange,
  onDelete,
}: {
  sticky: StickyAnnotation
  zoom: number
  onChange: (patch: Partial<StickyAnnotation>) => void
  onDelete: () => void
}) {
  const [colorOpen, setColorOpen] = useState(false)
  const [sizeOpen, setSizeOpen] = useState(false)
  const sizeLabel = annotationFontSizeLabel(sticky.fontSize)

  return (
    <AnnotationStyleBarFrame
      x={sticky.x}
      y={sticky.y}
      width={sticky.width}
      zoom={zoom}
    >
      <Popover open={colorOpen} onOpenChange={setColorOpen}>
        <AnnotationBarTooltip label="Color">
          <PopoverTrigger
            aria-label="Color"
            className={ANNOTATION_BAR_TRIGGER_CLASS}
          >
            <span
              className="size-4 rounded-full border border-(--border-annotation-chrome)"
              style={{ backgroundColor: sticky.color }}
              aria-hidden
            />
            <ChevronDown className="size-3 opacity-80" aria-hidden />
          </PopoverTrigger>
        </AnnotationBarTooltip>
        <PopoverContent
          align="center"
          side="top"
          sideOffset={8}
          className={cn('w-auto min-w-0 p-2.5', ANNOTATION_BAR_MENU_CLASS)}
          data-annotation-chrome=""
          onMouseDown={(e) => e.preventDefault()}
        >
          <Eyebrow className="mb-1.5 block text-(--foreground-annotation-chrome-tertiary)">
            Color
          </Eyebrow>
          <div className="flex flex-wrap items-center gap-1.5">
            {ANNOTATION_STICKY_SWATCHES.map((swatch) => (
              <ColorSwatch
                key={`sticky-${swatch}`}
                color={swatch}
                label={`Sticky ${annotationSwatchName(swatch)}`}
                selected={sticky.color.toUpperCase() === swatch.toUpperCase()}
                onSelect={() => {
                  onChange({ color: swatch })
                  setColorOpen(false)
                }}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <AnnotationBarDivider />

      <Popover open={sizeOpen} onOpenChange={setSizeOpen}>
        <AnnotationBarTooltip label="Text size">
          <PopoverTrigger
            aria-label="Text size"
            className={cn(ANNOTATION_BAR_TRIGGER_CLASS, 'min-w-[4.75rem]')}
          >
            <span className="text-sm font-medium tracking-tight">{sizeLabel}</span>
            <ChevronDown className="size-3 opacity-80" aria-hidden />
          </PopoverTrigger>
        </AnnotationBarTooltip>
        <PopoverContent
          align="center"
          side="top"
          sideOffset={8}
          className={cn('w-auto min-w-36 p-1', ANNOTATION_BAR_MENU_CLASS)}
          data-annotation-chrome=""
          onMouseDown={(e) => e.preventDefault()}
        >
          {ANNOTATION_FONT_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => {
                onChange({ fontSize: size })
                setSizeOpen(false)
              }}
              className={cn(
                'flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-left text-sm text-(--foreground-annotation-chrome) transition-colors hover:bg-(--wash-annotation-chrome)',
                sticky.fontSize === size && 'bg-(--wash-annotation-chrome)',
              )}
            >
              {annotationFontSizeLabel(size)}
              {sticky.fontSize === size ? (
                <Check className="size-3.5 opacity-90" aria-hidden />
              ) : null}
            </button>
          ))}
        </PopoverContent>
      </Popover>

      <AnnotationBarDivider />

      <AnnotationBarTooltip label="Bold">
        <button
          type="button"
          aria-label="Bold"
          aria-pressed={Boolean(sticky.bold)}
          onClick={() => onChange({ bold: !sticky.bold })}
          className={cn(
            ANNOTATION_BAR_TRIGGER_CLASS,
            sticky.bold && 'bg-(--wash-annotation-chrome-strong)',
          )}
        >
          <Bold className="size-3.5" aria-hidden />
        </button>
      </AnnotationBarTooltip>

      <AnnotationBarTooltip label="Strikethrough">
        <button
          type="button"
          aria-label="Strikethrough"
          aria-pressed={Boolean(sticky.strike)}
          onClick={() => onChange({ strike: !sticky.strike })}
          className={cn(
            ANNOTATION_BAR_TRIGGER_CLASS,
            sticky.strike && 'bg-(--wash-annotation-chrome-strong)',
          )}
        >
          <Strikethrough className="size-3.5" aria-hidden />
        </button>
      </AnnotationBarTooltip>

      <AnnotationBarDivider />

      <AnnotationBarTooltip label="Delete">
        <button
          type="button"
          aria-label="Delete sticky"
          onClick={onDelete}
          className={ANNOTATION_BAR_ICON_BUTTON_CLASS}
        >
          <Trash2 className="size-3.5" aria-hidden />
        </button>
      </AnnotationBarTooltip>
    </AnnotationStyleBarFrame>
  )
}
