import { ChevronDown, Check, type LucideIcon } from 'lucide-react'
import { IconTooltip } from '@/components/editor/IconTooltip'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { CanvasAnnotationTool } from '@/lib/canvasAnnotations'

export type FamilyTool = {
  id: CanvasAnnotationTool
  label: string
  icon: LucideIcon
}

/**
 * One slot for a family of related tools — Draw, Shapes, Content.
 *
 * Two targets in one control, which is Figma's shape menu exactly: the icon
 * activates the family's *current* tool, the chevron opens the list, and
 * whatever you pick becomes the face. A family therefore costs one slot rather
 * than four, and the bar stops being a row of near-identical squares that has
 * to be read left to right before anything can be clicked.
 *
 * The face remembering the last choice is what makes the second use cheap:
 * having drawn one ellipse, the next one is a single click on the same pixel.
 *
 * **The active family drops its chevron**, which is Figma again. A caret is an
 * offer to change tool, and the one family you have already chosen is the one
 * where that offer is least useful — so it is spent on the others, and the
 * active slot reads as a single solid pill instead of a pill with a seam in it.
 * The list is not lost: clicking the face again opens it, because re-selecting
 * the tool you are already holding is the one click with nothing else to mean.
 */
export function ToolFamilyMenu({
  label,
  tools,
  active,
  onSelect,
  open,
  onOpenChange,
}: {
  label: string
  tools: FamilyTool[]
  /** The whole toolbar's current tool; may belong to another family. */
  active: CanvasAnnotationTool
  onSelect: (tool: CanvasAnnotationTool) => void
  /**
   * Controlled by the toolbar rather than by this menu, so that the bar can
   * hold the rule "one thing open at a time" in one place — a menu cannot know
   * what else the bar is currently showing above itself.
   */
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const inFamily = tools.some((tool) => tool.id === active)
  // The face is the family's active tool, or the last one used in it. Falling
  // back to the first entry keeps the slot from ever rendering empty.
  const face = tools.find((tool) => tool.id === active) ?? tools[0]
  const FaceIcon = face.icon

  const faceButton = (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label={inFamily ? `${face.label} — ${label} tools` : face.label}
      aria-pressed={inFamily}
      onClick={
        inFamily
          ? undefined // the trigger below owns the click
          : () => {
              // Activating the face closes whatever the bar had open —
              // otherwise a menu left hanging from a previous click sits over
              // the options row this tool is about to show.
              onOpenChange(false)
              onSelect(face.id)
            }
      }
      className={cn(
        'size-7 shrink-0 p-0 text-muted-foreground hover:text-foreground',
        inFamily
          ? 'rounded-md text-foreground hover:bg-violet-100'
          : 'rounded-r-none',
      )}
    >
      <FaceIcon className={cn('size-3.5', inFamily && 'size-4')} aria-hidden />
    </Button>
  )

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <div
        className={cn(
          'pointer-events-auto flex shrink-0 items-center rounded-md',
          inFamily && 'bg-violet-100',
        )}
      >
        <Tooltip>
          <TooltipTrigger
            render={
              inFamily ? <DropdownMenuTrigger render={faceButton} /> : faceButton
            }
          />
          <TooltipContent side="top" className="text-xs">
            {face.label}
          </TooltipContent>
        </Tooltip>

        {/* Absent, not disabled, while this family holds the tool — see the
            note above the component. */}
        {inFamily ? null : (
          <IconTooltip label={`${label} tools`}>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`${label} tools`}
                  className="h-7 w-4 shrink-0 rounded-l-none px-0 text-muted-foreground hover:text-foreground"
                >
                  <ChevronDown className="size-3" aria-hidden />
                </Button>
              }
            />
          </IconTooltip>
        )}
      </div>

      <DropdownMenuContent align="center" side="top" className="min-w-40 text-xs">
        {tools.map((tool) => {
          const Icon = tool.icon
          return (
            <DropdownMenuItem key={tool.id} onClick={() => onSelect(tool.id)}>
              <Check
                className={cn('size-3', tool.id !== active && 'invisible')}
                aria-hidden
              />
              <Icon className="size-3.5" aria-hidden />
              {tool.label}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
