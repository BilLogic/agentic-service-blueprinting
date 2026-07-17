import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export const EDITOR_SIDEBAR_WIDTH_CLASS = 'w-60'
export const EDITOR_SIDEBAR_COLLAPSED_WIDTH_CLASS = 'w-12'
export const EDITOR_SIDEBAR_WIDTH_PX = '15rem'

export function EditorFloatingPanel({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-background/95 shadow-sm backdrop-blur-sm',
        className,
      )}
    >
      {children}
    </div>
  )
}
