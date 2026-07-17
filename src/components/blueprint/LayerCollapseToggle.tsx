import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

type LayerCollapseToggleProps = {
  layerName: string
  collapsed: boolean
  onToggle: () => void
  className?: string
}

export function LayerCollapseToggle({
  layerName,
  collapsed,
  onToggle,
  className,
}: LayerCollapseToggleProps) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground',
        className,
      )}
      data-print-hide
      aria-expanded={!collapsed}
      aria-label={
        collapsed ? `Expand ${layerName} layer` : `Collapse ${layerName} layer`
      }
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
    >
      {collapsed ? (
        <Plus className="size-3.5" aria-hidden />
      ) : (
        <Minus className="size-3.5" aria-hidden />
      )}
    </button>
  )
}
