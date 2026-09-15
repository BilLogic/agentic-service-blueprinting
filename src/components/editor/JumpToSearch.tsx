import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { useCanvasZoomChrome } from '@/contexts/CanvasZoomChromeContext'
import { useEditor } from '@/contexts/EditorContext'
import { useCanvasBlueprints } from '@/hooks/useCanvasBlueprints'
import { requestScenarioCellFocus } from '@/lib/canvasFocusCells'
import { cn } from '@/lib/utils'
import {
  getMainSlides,
  getSlideDisplayLabel,
  getSubslides,
  isSubslide,
} from '@/types/nav'

/**
 * Top-nav Jump to… field. Desktop widths show the labelled field with a ⌘K
 * hint; below `md` it collapses to an icon. ⌘K and Ctrl+K open the same
 * command dialog.
 */
export function JumpToSearch() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    /**
     * Opens the palette. Ignores the chord while the reader is composing
     * (IME) so a dead key does not steal the dialog.
     *
     * @param event - Window keydown.
     */
    function onKeyDown(event: KeyboardEvent) {
      if (event.isComposing) return
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k') {
        return
      }
      event.preventDefault()
      setOpen((current) => !current)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <>
      <button
        type="button"
        data-jump-to=""
        aria-label="Jump to…"
        onClick={() => setOpen(true)}
        className={cn(
          'hidden h-7 min-w-40 items-center gap-2 rounded-md border border-border bg-field px-2 text-sm text-muted-foreground',
          'hover:text-foreground md:flex',
        )}
      >
        <Search className="size-3.5 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-left">Jump to…</span>
        <kbd className="rounded-md border border-border px-1 font-sans text-xs text-tertiary-foreground">
          ⌘K
        </kbd>
      </button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label="Jump to…"
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:text-foreground md:hidden"
      >
        <Search className="size-3.5" aria-hidden />
      </Button>
      {open ? <JumpToDialog open={open} onOpenChange={setOpen} /> : null}
    </>
  )
}

/**
 * Command dialog for Jump to… — scenarios, cells, and a short action list.
 *
 * @param open - Whether the dialog is showing.
 * @param onOpenChange - Dialog open-state writer.
 */
function JumpToDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { slides, openScenario, goLanding } = useEditor()
  const scenarioIds = useMemo(
    () =>
      open
        ? slides.filter((slide) => isSubslide(slide)).map((slide) => slide.id)
        : [],
    [open, slides],
  )
  const { blueprintsByScenario } = useCanvasBlueprints(scenarioIds)
  const zoom = useCanvasZoomChrome()
  const { resolvedTheme, setTheme } = useTheme()

  const scenarios = useMemo(() => {
    return getMainSlides(slides).flatMap((phase) =>
      getSubslides(phase.id, slides).map((scenario) => ({
        id: scenario.id,
        label: getSlideDisplayLabel(scenario, slides),
        trail: getSlideDisplayLabel(phase, slides),
      })),
    )
  }, [slides])

  const cells = useMemo(() => {
    const seen = new Set<string>()
    const rows: Array<{
      id: string
      scenarioId: string
      label: string
      trail: string
    }> = []
    for (const [scenarioId, blueprint] of blueprintsByScenario) {
      const scenario = slides.find((slide) => slide.id === scenarioId)
      if (!scenario) continue
      const phase = scenario.parentId
        ? slides.find((slide) => slide.id === scenario.parentId)
        : undefined
      for (const cell of blueprint.cells) {
        if (seen.has(cell.id)) continue
        seen.add(cell.id)
        const lane = blueprint.lanes.find((entry) => entry.id === cell.lane_id)
        const label = cell.content.split('\n')[0]?.trim() || 'Untitled cell'
        rows.push({
          id: cell.id,
          scenarioId,
          label,
          trail: [phase ? getSlideDisplayLabel(phase, slides) : null, getSlideDisplayLabel(scenario, slides), lane?.name]
            .filter(Boolean)
            .join(' · '),
        })
      }
    }
    return rows
  }, [blueprintsByScenario, slides])

  /**
   * Close the palette after an action.
   *
   * @param run - The action to run.
   */
  function runAndClose(run: () => void) {
    run()
    onOpenChange(false)
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Jump to…"
      description="Search scenarios, cells, and actions"
    >
      <Command>
        <CommandInput placeholder="Jump to…" />
        <CommandList>
          <CommandEmpty>No matches.</CommandEmpty>
          <CommandGroup heading="Scenarios">
            {scenarios.map((scenario) => (
              <CommandItem
                key={scenario.id}
                value={`${scenario.label} ${scenario.trail}`}
                onSelect={() =>
                  runAndClose(() => openScenario(scenario.id))
                }
                className="h-8 overflow-hidden py-0"
              >
                <JumpToRow label={scenario.label} trail={scenario.trail} />
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Cells">
            {cells.map((cell) => (
              <CommandItem
                key={cell.id}
                value={`${cell.label} ${cell.trail}`}
                onSelect={() =>
                  runAndClose(() => {
                    openScenario(cell.scenarioId)
                    requestScenarioCellFocus(cell.scenarioId, cell.id, {
                      openDetail: true,
                    })
                  })
                }
                className="h-8 overflow-hidden py-0"
              >
                <JumpToRow label={cell.label} trail={cell.trail} />
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Actions">
            <CommandItem
              value="Fit scenario to view"
              onSelect={() =>
                runAndClose(() => {
                  zoom?.chrome?.fitToView?.({ animate: true })
                })
              }
              className="h-8 overflow-hidden py-0"
            >
              <JumpToRow label="Fit scenario to view" trail="Canvas" />
            </CommandItem>
            <CommandItem
              value="Switch theme"
              onSelect={() =>
                runAndClose(() => {
                  setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
                })
              }
              className="h-8 overflow-hidden py-0"
            >
              <JumpToRow label="Switch theme" trail="Appearance" />
            </CommandItem>
            <CommandItem
              value="Open cover"
              onSelect={() => runAndClose(() => goLanding())}
              className="h-8 overflow-hidden py-0"
            >
              <JumpToRow label="Open cover" trail="Workspace" />
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  )
}

/**
 * One palette row: truncating label, never-truncating trail.
 *
 * @param label - Primary name.
 * @param trail - Location crumbs on the right.
 */
function JumpToRow({ label, trail }: { label: string; trail: string }) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2">
      <span className="min-w-0 flex-1 truncate" title={label}>
        {label}
      </span>
      <span className="shrink-0 text-xs text-muted-foreground">{trail}</span>
    </span>
  )
}
