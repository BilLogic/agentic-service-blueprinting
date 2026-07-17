import { PathDescriptionTooltip } from '@/components/blueprint/PathDescriptionTooltip'
import { PathTypeColorKey } from '@/components/blueprint/PathTypeColorKey'
import { filterToolbarButtonClass } from '@/lib/filterToolbarButton'
import { cn } from '@/lib/utils'
import type { PathType } from '@/types/database'

export type PathOption = {
  id: string
  name: string
  description: string | null
  path_type: PathType
}

const MAX_PATHS_PER_COLUMN = 2

const PRIMARY_COLUMN_PATH_TYPES = new Set<PathType>(['happy', 'alternative'])
const SECONDARY_COLUMN_PATH_TYPES = new Set<PathType>(['unhappy', 'exception'])

export function formatPathPickerLabel(name: string): string {
  return name
}

function chunkPaths<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

/** Happy/alternate paths stack in the left column(s); sad/exception paths go to the right. */
export function groupPathsIntoColumns(paths: PathOption[]): PathOption[][] {
  const primary = paths.filter((path) => PRIMARY_COLUMN_PATH_TYPES.has(path.path_type))
  const secondary = paths.filter((path) =>
    SECONDARY_COLUMN_PATH_TYPES.has(path.path_type),
  )
  const other = paths.filter(
    (path) =>
      !PRIMARY_COLUMN_PATH_TYPES.has(path.path_type) &&
      !SECONDARY_COLUMN_PATH_TYPES.has(path.path_type),
  )

  return [
    ...chunkPaths(primary, MAX_PATHS_PER_COLUMN),
    ...chunkPaths(secondary, MAX_PATHS_PER_COLUMN),
    ...chunkPaths(other, MAX_PATHS_PER_COLUMN),
  ].filter((column) => column.length > 0)
}

type PathMultiSelectProps = {
  paths: PathOption[]
  selectedPathIds: string[]
  onToggle: (pathId: string) => void
  className?: string
  layout?: 'horizontal' | 'vertical' | 'bar' | 'notion' | 'toolbar'
  label?: string
  hideLabel?: boolean
}

function PathNotionPill({
  path,
  checked,
  onToggle,
}: {
  path: PathOption
  checked: boolean
  onToggle: (pathId: string) => void
}) {
  const pathLabel = formatPathPickerLabel(path.name)

  return (
    <button
      type="button"
      onClick={() => onToggle(path.id)}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-sm transition-colors',
        checked
          ? 'bg-accent font-medium text-foreground'
          : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
      )}
      aria-pressed={checked}
      aria-label={pathLabel}
    >
      <PathTypeColorKey type={path.path_type} name={path.name} />
      <PathDescriptionTooltip
        description={path.description}
        pathName={path.name}
        side="top"
      >
        <span>{pathLabel}</span>
      </PathDescriptionTooltip>
    </button>
  )
}

export function PathToolbarButton({
  path,
  checked,
  onToggle,
}: {
  path: PathOption
  checked: boolean
  onToggle: (pathId: string) => void
}) {
  const pathLabel = formatPathPickerLabel(path.name)

  return (
    <button
      type="button"
      onClick={() => onToggle(path.id)}
      className={filterToolbarButtonClass(checked)}
      aria-pressed={checked}
      aria-label={pathLabel}
    >
      <PathTypeColorKey type={path.path_type} name={path.name} />
      <PathDescriptionTooltip
        description={path.description}
        pathName={path.name}
        side="top"
      >
        <span>{pathLabel}</span>
      </PathDescriptionTooltip>
    </button>
  )
}

function PathCheckbox({
  path,
  checked,
  onToggle,
  compact,
  dense,
}: {
  path: PathOption
  checked: boolean
  onToggle: (pathId: string) => void
  compact: boolean
  dense?: boolean
}) {
  const pathLabel = formatPathPickerLabel(path.name)
  const inputId = `path-filter-${path.id}`

  const stopEvent = (e: React.SyntheticEvent) => {
    e.stopPropagation()
  }

  return (
    <label
      htmlFor={inputId}
      className={cn(
        'inline-flex cursor-pointer items-center rounded-md transition-colors',
        dense ? 'gap-1 px-0 py-0 text-xs' : 'gap-2 text-sm',
        compact && !dense ? 'px-1 py-0.5' : !dense ? 'px-1 py-1' : undefined,
        checked && 'font-medium text-foreground',
        !checked && 'text-foreground/90',
      )}
      onPointerDown={stopEvent}
      onClick={stopEvent}
    >
      <input
        id={inputId}
        type="checkbox"
        className={cn(
          'shrink-0 rounded border-input accent-primary',
          dense ? 'size-3' : 'size-4',
        )}
        checked={checked}
        onChange={() => onToggle(path.id)}
        onPointerDown={stopEvent}
        onClick={stopEvent}
        aria-label={pathLabel}
      />
      <PathTypeColorKey type={path.path_type} name={path.name} />
      <PathDescriptionTooltip
        description={path.description}
        pathName={path.name}
        side="top"
      >
        <span className="min-w-0 cursor-default text-left">{pathLabel}</span>
      </PathDescriptionTooltip>
    </label>
  )
}

export function PathMultiSelect({
  paths,
  selectedPathIds,
  onToggle,
  className,
  layout = 'horizontal',
  label = 'Paths to view',
  hideLabel = false,
}: PathMultiSelectProps) {
  const isVertical = layout === 'vertical'
  const isBar = layout === 'bar'
  const isNotion = layout === 'notion'
  const isToolbar = layout === 'toolbar'
  const columns =
    isBar || isNotion || isToolbar ? [paths] : groupPathsIntoColumns(paths)

  return (
    <div
      className={cn('shrink-0', className)}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {!hideLabel && (
        <p
          className={cn(
            'text-sm font-medium text-foreground',
            isVertical && 'mb-2',
            (isBar || isNotion || isToolbar) && 'sr-only',
          )}
        >
          {label}
        </p>
      )}
      <div
        className={cn(
          'flex flex-row items-start gap-x-4',
          isVertical && 'gap-y-2',
          layout === 'horizontal' &&
            'mt-1 gap-y-2 rounded-lg border border-border bg-background px-3 py-2.5',
          isBar && 'items-center gap-x-3 gap-y-0',
          isNotion && 'flex-wrap gap-1.5',
          isToolbar && 'flex-wrap items-center gap-2',
        )}
      >
        {columns.map((column, columnIndex) => (
          <div
            key={column.map((path) => path.id).join('-')}
            className={cn(
              'flex min-w-0 flex-col gap-2',
              (isBar || isNotion || isToolbar) &&
                'flex-row flex-wrap items-center gap-2',
            )}
            aria-label={
              columnIndex === 0 ? undefined : `Path column ${columnIndex + 1}`
            }
          >
            {column.map((path) =>
              isToolbar ? (
                <PathToolbarButton
                  key={path.id}
                  path={path}
                  checked={selectedPathIds.includes(path.id)}
                  onToggle={onToggle}
                />
              ) : isNotion ? (
                <PathNotionPill
                  key={path.id}
                  path={path}
                  checked={selectedPathIds.includes(path.id)}
                  onToggle={onToggle}
                />
              ) : (
                <PathCheckbox
                  key={path.id}
                  path={path}
                  checked={selectedPathIds.includes(path.id)}
                  onToggle={onToggle}
                  compact={!isVertical}
                  dense={isBar}
                />
              ),
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
