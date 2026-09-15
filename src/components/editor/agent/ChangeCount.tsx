import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * "N changes this session" — the ledger count, spoken once, in one place.
 * The ✦ used to be a literal character in the copy; it is the Sparkles icon
 * everywhere else in the app, so it is the Sparkles icon here too.
 */
export function ChangeCount({
  count,
  className,
}: {
  count: number
  className?: string
}) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center gap-1 text-xs tabular-nums',
        className,
      )}
      title={`${count} change${count === 1 ? '' : 's'} from this session`}
    >
      <Sparkles className="size-2.5" aria-hidden />
      {count}
      <span className="sr-only">
        {' '}
        change{count === 1 ? '' : 's'} from this session
      </span>
    </span>
  )
}
