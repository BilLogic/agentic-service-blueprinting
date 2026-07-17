import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type NotionPropertyRowProps = {
  label: string
  children: ReactNode
  className?: string
}

export function NotionPropertyRow({
  label,
  children,
  className,
}: NotionPropertyRowProps) {
  return (
    <div
      className={cn(
        'group -mx-1 flex min-h-[34px] items-start gap-3 rounded-sm px-1 py-1.5 transition-colors hover:bg-accent/50',
        className,
      )}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <span className="w-[7.5rem] shrink-0 pt-0.5 text-sm text-muted-foreground">
        {label}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
