import { cn } from '@/lib/utils'

/** Shared hover/active styling for view and path filter toolbar buttons. */
export function filterToolbarButtonClass(checked: boolean, className?: string) {
  return cn(
    'inline-flex h-8 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-all duration-200',
    checked
      ? 'border-border/60 bg-card text-foreground shadow-sm ring-1 ring-black/[0.04]'
      : 'border-border/50 bg-muted/40 text-foreground hover:bg-muted/80',
    className,
  )
}
