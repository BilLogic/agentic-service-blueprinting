import { useState } from 'react'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Check,
  ChevronDown,
  Strikethrough,
  Trash2,
} from 'lucide-react'
import { Eyebrow } from '@/components/blueprint/Eyebrow'
import {
  ANNOTATION_FONT_SIZES,
  ANNOTATION_STROKE_SWATCHES,
  annotationFontSizeLabel,
  annotationSwatchName,
  type TextAnnotation,
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

const TEXT_ALIGN_OPTIONS = [
  { id: 'left' as const, label: 'Left', Icon: AlignLeft },
  { id: 'center' as const, label: 'Center', Icon: AlignCenter },
  { id: 'right' as const, label: 'Right', Icon: AlignRight },
]

/** Figma-style text controls: color · size · bold · strike · align · delete. */
export function AnnotationTextStyleBar({
  text,
  zoom,
  width,
  onChange,
  onDelete,
}: {
  text: TextAnnotation
  zoom: number
  width: number
  onChange: (patch: Partial<TextAnnotation>) => void
  onDelete: () => void
}) {
  const [colorOpen, setColorOpen] = useState(false)
  const [sizeOpen, setSizeOpen] = useState(false)
  const [alignOpen, setAlignOpen] = useState(false)
  const sizeLabel = annotationFontSizeLabel(text.fontSize)
  const align = text.align ?? 'left'
  const AlignIcon =
    TEXT_ALIGN_OPTIONS.find((option) => option.id === align)?.Icon ?? AlignLeft

  return (
    <AnnotationStyleBarFrame
      x={text.x}
      y={text.y}
      width={width}
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
              style={{ backgroundColor: text.color }}
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
            {ANNOTATION_STROKE_SWATCHES.map((swatch) => (
              <ColorSwatch
                key={`text-${swatch}`}
                color={swatch}
                label={`Text ${annotationSwatchName(swatch)}`}
                selected={text.color.toUpperCase() === swatch.toUpperCase()}
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
                text.fontSize === size && 'bg-(--wash-annotation-chrome)',
              )}
            >
              {annotationFontSizeLabel(size)}
              {text.fontSize === size ? (
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
          aria-pressed={Boolean(text.bold)}
          onClick={() => onChange({ bold: !text.bold })}
          className={cn(
            ANNOTATION_BAR_TRIGGER_CLASS,
            text.bold && 'bg-(--wash-annotation-chrome-strong)',
          )}
        >
          <Bold className="size-3.5" aria-hidden />
        </button>
      </AnnotationBarTooltip>

      <AnnotationBarTooltip label="Strikethrough">
        <button
          type="button"
          aria-label="Strikethrough"
          aria-pressed={Boolean(text.strike)}
          onClick={() => onChange({ strike: !text.strike })}
          className={cn(
            ANNOTATION_BAR_TRIGGER_CLASS,
            text.strike && 'bg-(--wash-annotation-chrome-strong)',
          )}
        >
          <Strikethrough className="size-3.5" aria-hidden />
        </button>
      </AnnotationBarTooltip>

      <AnnotationBarDivider />

      <Popover open={alignOpen} onOpenChange={setAlignOpen}>
        <AnnotationBarTooltip label="Alignment">
          <PopoverTrigger
            aria-label="Alignment"
            className={ANNOTATION_BAR_TRIGGER_CLASS}
          >
            <AlignIcon className="size-3.5" aria-hidden />
            <ChevronDown className="size-3 opacity-80" aria-hidden />
          </PopoverTrigger>
        </AnnotationBarTooltip>
        <PopoverContent
          align="center"
          side="top"
          sideOffset={8}
          className={cn('w-auto min-w-32 p-1', ANNOTATION_BAR_MENU_CLASS)}
          data-annotation-chrome=""
          onMouseDown={(e) => e.preventDefault()}
        >
          {TEXT_ALIGN_OPTIONS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                onChange({ align: id })
                setAlignOpen(false)
              }}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm text-(--foreground-annotation-chrome) transition-colors hover:bg-(--wash-annotation-chrome)',
                align === id && 'bg-(--wash-annotation-chrome)',
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              {label}
              {align === id ? (
                <Check className="ml-auto size-3.5 opacity-90" aria-hidden />
              ) : null}
            </button>
          ))}
        </PopoverContent>
      </Popover>

      <AnnotationBarDivider />

      <AnnotationBarTooltip label="Delete">
        <button
          type="button"
          aria-label="Delete text"
          onClick={onDelete}
          className={ANNOTATION_BAR_ICON_BUTTON_CLASS}
        >
          <Trash2 className="size-3.5" aria-hidden />
        </button>
      </AnnotationBarTooltip>
    </AnnotationStyleBarFrame>
  )
}
