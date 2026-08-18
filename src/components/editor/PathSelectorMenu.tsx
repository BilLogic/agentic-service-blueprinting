import { Check, ChevronDown } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { usePathSelectionContext } from '@/hooks/usePathSelection'
import { getPathColor } from '@/lib/pathColorTheme'
import { cn } from '@/lib/utils'
import type { PathOption } from '@/components/blueprint/PathMultiSelect'

/**
 * The top-bar path control (plan 2026-08-17-002 U2): desktop reads and
 * COMPARES paths, so this is a multi-select over the same
 * PathSelectionContext the sidebar checklist used — only the mount moved.
 * The trigger is deliberately compact (decided 2026-08-17): overlapping
 * path-color dots plus a count, never the full names; a single selection
 * may show its (truncated) name.
 */
export function PathSelectorMenu({ options }: { options: PathOption[] }) {
  const { activePathKeys, togglePathKey } = usePathSelectionContext()
  if (options.length === 0) return null

  const selected = options.filter((option) =>
    activePathKeys.includes(option.id),
  )
  const dots = (selected.length > 0 ? selected : options).slice(0, 3)

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label={`Paths shown: ${
              selected.length > 0
                ? selected.map((option) => option.name).join(', ')
                : 'none'
            }`}
            className={cn(
              'pointer-events-auto flex h-7 items-center gap-1.5 rounded-full border border-border bg-card',
              'px-2.5 text-xs text-muted-foreground transition-colors hover:text-foreground',
            )}
          >
            <span className="flex items-center" aria-hidden>
              {dots.map((option, index) => (
                <span
                  key={option.id}
                  className={cn(
                    'size-2.5 rounded-full ring-1 ring-card',
                    index > 0 && '-ml-1',
                  )}
                  style={{ backgroundColor: getPathColor(option) }}
                />
              ))}
            </span>
            <span className="max-w-24 truncate">
              {selected.length === 1
                ? selected[0].name
                : `${selected.length} paths`}
            </span>
            <ChevronDown className="size-3 shrink-0" aria-hidden />
          </button>
        }
      />
      <PopoverContent align="end" className="w-56 p-1.5">
        <ul className="flex flex-col gap-0.5">
          {options.map((option) => {
            const checked = activePathKeys.includes(option.id)
            return (
              <li key={option.id}>
                <button
                  type="button"
                  aria-pressed={checked}
                  onClick={() => togglePathKey(option.id)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors',
                    'hover:bg-accent',
                    checked
                      ? 'font-medium text-foreground'
                      : 'text-muted-foreground',
                  )}
                >
                  <span
                    aria-hidden
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: getPathColor(option) }}
                  />
                  <span className="min-w-0 flex-1 truncate">{option.name}</span>
                  <Check
                    className={cn('size-3.5 shrink-0', !checked && 'invisible')}
                    aria-hidden
                  />
                </button>
              </li>
            )
          })}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
