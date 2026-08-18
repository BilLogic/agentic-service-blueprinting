import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Single small centered spinner for loading areas. Invisible for the first
 * ~300ms (CSS `delayed-appear`) so fast loads render nothing at all — no
 * layout-mimicking skeleton bars, no flash.
 */
export function DelayedSpinner({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        'delayed-appear flex h-full min-h-0 flex-1 items-center justify-center',
        className,
      )}
    >
      <Loader2 aria-hidden className="size-5 animate-spin text-muted-foreground" />
    </div>
  )
}
