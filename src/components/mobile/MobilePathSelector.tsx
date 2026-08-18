import { Check, ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { PathListItem } from '@/lib/pathSelection'

/**
 * The top-bar path control (plan 2026-08-16-002 Phase 3): the phone reads
 * one path at a time, so the thing that picks it lives in the chrome, not
 * as a chip row inside the reader's scroll. A pill naming the current path;
 * tapping it opens the scenario's few paths (happy / unhappy / exception).
 * The shell decides when to render this — only surfaces with a path
 * dimension get a selector at all.
 */
export function MobilePathSelector({
  paths,
  activePathId,
  onSelect,
}: {
  paths: PathListItem[]
  activePathId: string | null
  onSelect: (pathId: string) => void
}) {
  const active = paths.find((path) => path.id === activePathId) ?? paths[0]
  if (!active) return null

  // One path: still SAY which path this is, but as a read-only chip — a
  // menu with a single choice is a control that answers nothing.
  if (paths.length === 1) {
    return (
      <span
        aria-label={`Path: ${active.name}`}
        className={cn(
          'flex h-8 max-w-40 items-center rounded-full border border-border/60 bg-transparent',
          'px-2.5 text-xs text-muted-foreground',
        )}
      >
        <span className="min-w-0 truncate">{active.name}</span>
      </span>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label={`Path: ${active.name}`}
            className={cn(
              'flex h-8 max-w-40 items-center gap-1 rounded-full border border-border bg-card',
              'px-2.5 text-xs text-muted-foreground',
            )}
          >
            <span className="min-w-0 truncate">{active.name}</span>
            <ChevronDown className="size-3 shrink-0" />
          </button>
        }
      />
      <DropdownMenuContent align="end">
        {paths.map((path) => (
          <DropdownMenuItem
            key={path.id}
            onClick={() => onSelect(path.id)}
            className="min-h-11 gap-2"
          >
            <span className="min-w-0 flex-1 truncate">{path.name}</span>
            {path.id === active.id ? (
              <Check className="size-4 shrink-0" aria-hidden />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
