import { cn } from '@/lib/utils'

/**
 * The drawn zone chip — a mono digit in a bordered circle. One component
 * shared by the divergence strip, the ledger's zone groups and (if the
 * gate passes) the merged canvas's fork badges, so ①②③ always means the
 * same thing everywhere. Drawn, not unicode circled digits: those render
 * at wildly different weights across platforms and stop at ㊿.
 */
export function CompareZoneChip({
  index,
  active = false,
  className,
}: {
  index: number
  active?: boolean
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex size-4 shrink-0 items-center justify-center rounded-full border font-mono text-3xs leading-none tabular-nums',
        active
          ? 'border-foreground/70 bg-background text-foreground'
          : 'border-muted-foreground/50 bg-background text-muted-foreground',
        className,
      )}
    >
      {index}
    </span>
  )
}
