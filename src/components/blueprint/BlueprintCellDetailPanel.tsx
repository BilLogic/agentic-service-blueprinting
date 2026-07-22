import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, X } from 'lucide-react'
import { CellDependencyTable } from '@/components/blueprint/CellDependencyTable'
import { TechPillFace } from '@/components/blueprint/TechPillFace'
import { VisualStepDetailStack } from '@/components/blueprint/VisualStepDetailStack'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { useBlueprintCellDetail } from '@/contexts/BlueprintCellDetailContext'
import {
  buildBlueprintCellSelectionForId,
  getBlueprintCellConnections,
  getBlueprintForPath,
  getLinkedTechFromConnections,
  getSelectedCellLayerRowPosition,
  scrollBlueprintCellIntoView,
} from '@/lib/blueprintCellConnections'
import { buildCellDependencyRows } from '@/lib/blueprintCellDependencies'
import {
  buildTechPillSelectionForItem,
  getBlueprintStepTechItems,
  scrollBlueprintTechPillIntoView,
} from '@/lib/blueprintStepTech'
import { shouldUsePillCellContent, shouldUseVisualContent } from '@/lib/blueprintLayout'
import { resolveCellDetailPictures } from '@/lib/blueprintTechPictures'
import { resolveBlueprintCellId } from '@/lib/resolveBlueprintCellId'
import {
  resolveTechCellDetailLabel,
  resolveTechCellDetailText,
  resolveTechCellDetailUrl,
  URL_LINK_TYPE,
} from '@/lib/blueprintTechDescriptions'
import { resolveVisualStepPictureEntries } from '@/lib/visualWalkthrough'
import { cn } from '@/lib/utils'
import type { BlueprintCell, CellLink } from '@/types/blueprint'

/** Fixed panel and illustration frame so every row/step uses the same size. */
const CELL_DETAIL_PICTURE_FRAME_CLASS =
  'relative aspect-[4/3] w-full max-w-full shrink-0 overflow-hidden rounded-lg bg-muted/20'
const CELL_DETAIL_PICTURE_CLASS =
  'absolute inset-0 h-full w-full object-contain object-center'
const CELL_DETAIL_LOGO_CLASS =
  'size-32 shrink-0 rounded-lg bg-muted/20 p-2 object-contain object-center'
const CELL_DETAIL_SMALL_LOGO_CLASS =
  'size-[6.5rem] shrink-0 rounded-lg bg-muted/20 p-2 object-contain object-center'

const SHOW_CELL_DEPENDENCIES = true

function isFigmaUrl(url: string): boolean {
  return /figma\.com/i.test(url)
}

function resolveFigmaUrl(
  techItem: string | undefined,
  cell: Pick<BlueprintCell, 'content' | 'links'> | null,
  links: CellLink[],
): string | null {
  if (cell) {
    const fromTech = resolveTechCellDetailUrl(techItem, cell)
    if (fromTech && isFigmaUrl(fromTech)) return fromTech
  }

  for (const link of links) {
    if (link.type !== URL_LINK_TYPE || !link.url?.trim()) continue
    if (isFigmaUrl(link.url) || /figma/i.test(link.label ?? '')) {
      return link.url.trim()
    }
  }

  return null
}

export function BlueprintCellDetailPanel() {
  const {
    selection: currentSelection,
    clearSelection,
    isOpen,
    blueprints,
    selectCell,
  } =
    useBlueprintCellDetail()
  const [closingSelection, setClosingSelection] = useState(currentSelection)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const selection = currentSelection ?? closingSelection

  useEffect(() => {
    if (currentSelection) {
      setClosingSelection(currentSelection)
      const frame = window.requestAnimationFrame(() => setDrawerOpen(true))
      return () => window.cancelAnimationFrame(frame)
    }

    setDrawerOpen(false)
  }, [currentSelection])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        clearSelection()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [clearSelection, isOpen])

  const pathEntry = selection?.paths[0]
  const resolvedCellId = pathEntry?.cellId
    ? resolveBlueprintCellId(pathEntry.cellId)
    : null

  const connections = useMemo(() => {
    const cellId = pathEntry?.cellId
    const pathId = pathEntry?.pathId
    if (!cellId || !pathId) {
      return { incoming: [], outgoing: [] }
    }

    const blueprint = getBlueprintForPath(blueprints, pathId)
    if (!blueprint) {
      return { incoming: [], outgoing: [] }
    }

    return getBlueprintCellConnections(blueprint, cellId)
  }, [blueprints, pathEntry?.cellId, pathEntry?.pathId])

  const stepTechItems = useMemo(() => {
    const pathId = pathEntry?.pathId
    const cellId = pathEntry?.cellId
    const techItem = selection?.techItem
    const stepId = selection?.stepId
    if (!pathId || !cellId || !techItem || !stepId) {
      return []
    }

    const blueprint = getBlueprintForPath(blueprints, pathId)
    if (!blueprint) return []

    return getBlueprintStepTechItems(blueprint, stepId, {
      cellId: resolvedCellId ?? cellId,
      item: techItem,
    })
  }, [
    blueprints,
    pathEntry?.cellId,
    pathEntry?.pathId,
    resolvedCellId,
    selection?.stepId,
    selection?.techItem,
  ])

  const selectedCell = useMemo((): Pick<
    BlueprintCell,
    'content' | 'description' | 'links' | 'picture'
  > | null => {
    const pathId = pathEntry?.pathId
    if (!resolvedCellId || !pathId) {
      if (!pathEntry) return null
      return {
        content: pathEntry.content,
        description: pathEntry.description ?? null,
        picture: pathEntry.picture ?? null,
        links: pathEntry.links ?? [],
      }
    }

    const blueprint = getBlueprintForPath(blueprints, pathId)
    const cell =
      blueprint?.cells.find((entry) => entry.id === resolvedCellId) ?? null
    if (cell) return cell

    return {
      content: pathEntry?.content ?? '',
      description: pathEntry?.description ?? null,
      picture: pathEntry?.picture ?? null,
      links: pathEntry?.links ?? [],
    }
  }, [blueprints, pathEntry, resolvedCellId])

  const cellLinks = useMemo(
    (): CellLink[] => selectedCell?.links ?? pathEntry?.links ?? [],
    [pathEntry?.links, selectedCell?.links],
  )

  const linkedTechItems = useMemo(
    () => getLinkedTechFromConnections(connections),
    [connections],
  )

  const selectedLayerRowPosition = useMemo(() => {
    const cellId = pathEntry?.cellId
    const pathId = pathEntry?.pathId
    if (!cellId || !pathId) return -1

    const blueprint = getBlueprintForPath(blueprints, pathId)
    if (!blueprint || !resolvedCellId) return -1

    return getSelectedCellLayerRowPosition(blueprint, resolvedCellId)
  }, [blueprints, pathEntry?.cellId, pathEntry?.pathId, resolvedCellId])

  const selectedLayer = useMemo((): { name: string; role?: string | null } | null => {
    const layerName = selection?.layerName
    if (!layerName) return null

    const pathId = pathEntry?.pathId
    const blueprint = pathId ? getBlueprintForPath(blueprints, pathId) : null
    return (
      blueprint?.layers.find((layer) => layer.name === layerName) ?? {
        name: layerName,
      }
    )
  }, [blueprints, pathEntry?.pathId, selection?.layerName])

  const otherTechEntries = useMemo(() => {
    const layerNameByCellId = new Map<string, string>()
    const stepIndexByCellId = new Map<string, number>()
    for (const entry of [...connections.incoming, ...connections.outgoing]) {
      layerNameByCellId.set(entry.cellId, entry.layerName)
      stepIndexByCellId.set(entry.cellId, entry.stepIndex)
    }

    const seen = new Set<string>()
    const entries: Array<{
      id: string
      cellId: string
      item: string
      layerName?: string
      stepIndex?: number
    }> = []

    const add = (entry: {
      id: string
      cellId: string
      item: string
      layerName?: string
      stepIndex?: number
    }) => {
      if (seen.has(entry.id)) return
      seen.add(entry.id)
      entries.push(entry)
    }

    for (const entry of linkedTechItems) {
      add({
        id: entry.id,
        cellId: entry.cellId,
        item: entry.item,
        layerName: layerNameByCellId.get(entry.cellId),
        stepIndex: stepIndexByCellId.get(entry.cellId),
      })
    }
    for (const entry of stepTechItems) {
      add({
        id: entry.id,
        cellId: entry.cellId,
        item: entry.item,
        layerName: entry.layerName,
        stepIndex: entry.stepIndex,
      })
    }

    return entries
  }, [connections.incoming, connections.outgoing, linkedTechItems, stepTechItems])

  const figmaUrl = useMemo(() => {
    if (!selection) return null
    return resolveFigmaUrl(selection.techItem, selectedCell, cellLinks)
  }, [cellLinks, selectedCell, selection])

  const dependencyRows = useMemo(() => {
    if (!selection) return []

    const relevantLinks = cellLinks.flatMap((link, index) => {
      if (link.type !== URL_LINK_TYPE || !link.url?.trim()) return []
      const url = link.url.trim()
      const label = link.label?.trim() || 'Link'
      if (isFigmaUrl(url) || /figma/i.test(label)) return []
      return [
        {
          id: `link-${index}`,
          label,
          url,
        },
      ]
    })

    return buildCellDependencyRows({
      connections,
      selectedLayerRowPosition,
      isTechCellSelected:
        Boolean(selection.techItem) ||
        Boolean(selectedLayer && shouldUsePillCellContent(selectedLayer)),
      selectedTechItem: selection.techItem,
      otherTech: otherTechEntries,
      links: relevantLinks,
    })
  }, [
    cellLinks,
    connections,
    otherTechEntries,
    selectedCell,
    selectedLayer,
    selectedLayerRowPosition,
    selection,
  ])

  const visualStepEntries = useMemo(() => {
    const stepId = selection?.stepId
    const pathId = pathEntry?.pathId
    if (!stepId || !pathId) return []

    const blueprint = getBlueprintForPath(blueprints, pathId)
    if (!blueprint) return []

    return resolveVisualStepPictureEntries(blueprint, stepId)
  }, [blueprints, pathEntry?.pathId, selection?.stepId])

  if (!selection) return null

  const isVisualLayer = Boolean(
    selectedLayer && shouldUseVisualContent(selectedLayer),
  )
  const cellContent =
    selection.paths[0]?.content.trim() ||
    selection.techItem ||
    ''
  const detailBodyText = selectedCell
    ? resolveTechCellDetailText(selection.techItem, selectedCell)
    : cellContent
  const isTechLayer = Boolean(
    selectedLayer && shouldUsePillCellContent(selectedLayer),
  )
  const techDetailLabel =
    isTechLayer && selectedCell
      ? resolveTechCellDetailLabel(selection.techItem, selectedCell)
      : null
  const detailDescriptionText =
    techDetailLabel && detailBodyText.trim() === techDetailLabel
      ? ''
      : detailBodyText
  const detailPictures = resolveCellDetailPictures({
    techItem: selection.techItem,
    cellContent: selection.paths[0]?.content,
    cellPicture: selection.paths[0]?.picture,
    cellLinks,
  })
  const showPicture = Boolean(detailPictures?.length && !isVisualLayer)
  const showTechPill = Boolean(isTechLayer && techDetailLabel)
  const showTechPillAboveTitle =
    showTechPill &&
    (selection.layerName === 'Front Stage Tech' ||
      selection.layerName === 'Back Stage Tech')

  const handleConnectionSelect = (cellId: string) => {
    const pathId = pathEntry?.pathId
    if (!pathId) return

    const blueprint = getBlueprintForPath(blueprints, pathId)
    if (!blueprint) return

    const nextSelection = buildBlueprintCellSelectionForId(
      blueprint,
      resolveBlueprintCellId(cellId),
      selection.scenarioName,
      selection.phaseName,
    )
    if (!nextSelection) return

    selectCell(nextSelection)
    requestAnimationFrame(() => {
      scrollBlueprintCellIntoView(cellId)
    })
  }

  const handleTechSelect = (cellId: string, techItem: string) => {
    const pathId = pathEntry?.pathId
    if (!pathId) return

    const blueprint = getBlueprintForPath(blueprints, pathId)
    if (!blueprint) return

    const nextSelection = buildTechPillSelectionForItem(
      blueprint,
      resolveBlueprintCellId(cellId),
      techItem,
      selection.scenarioName,
      selection.phaseName,
    )
    if (!nextSelection) return

    selectCell(nextSelection)
    requestAnimationFrame(() => {
      scrollBlueprintTechPillIntoView(cellId, techItem)
    })
  }

  const pathName = pathEntry?.pathName.trim() ?? ''
  const scenarioName = selection.scenarioName.trim()
  const phaseName = selection.phaseName?.trim() ?? ''
  const hasPath = Boolean(pathName && pathEntry)
  const hasScenario = Boolean(scenarioName)
  const stepCrumbLabel = `Step ${selection.stepIndex + 1}`

  const cellBreadcrumb = (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap gap-0.5 text-[11px] leading-tight text-muted-foreground">
        {phaseName ? (
          <>
            <BreadcrumbItem className="min-w-0">
              <span className="block max-w-[5.5rem] truncate font-normal">
                {phaseName}
              </span>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="[&>svg]:size-3" />
          </>
        ) : null}
        {hasScenario ? (
          <>
            <BreadcrumbItem className="shrink-0">
              <span title={scenarioName} className="cursor-default">
                <BreadcrumbEllipsis className="size-4 text-muted-foreground [&>svg]:size-3.5" />
                <span className="sr-only">{scenarioName}</span>
              </span>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="shrink-0 [&>svg]:size-3" />
          </>
        ) : null}
        {hasPath ? (
          <>
            <BreadcrumbItem className="min-w-0">
              <span className="block max-w-[5.5rem] truncate font-normal">
                {pathName}
              </span>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="shrink-0 [&>svg]:size-3" />
          </>
        ) : null}
        <BreadcrumbItem className="min-w-0">
          <BreadcrumbPage className="truncate font-medium tracking-tight text-foreground">
            {stepCrumbLabel}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )

  const layerTitle = (
    <p className="min-w-0 flex-1 text-sm font-bold leading-snug tracking-tight text-foreground">
      {selection.layerName}
    </p>
  )

  const figmaButton =
    figmaUrl != null ? (
      <a
        href={figmaUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          buttonVariants({ variant: 'outline', size: 'xs' }),
          'h-5 shrink-0 gap-1 px-1.5 text-[10px]',
        )}
        aria-label="View in Figma"
      >
        Figma
        <ExternalLink className="size-2.5 opacity-70" aria-hidden />
      </a>
    ) : null

  const titleRow = (
    <div className="flex min-w-0 items-center gap-2">
      {layerTitle}
      {figmaButton}
    </div>
  )

  const selectedTechPill = showTechPill ? (
    <TechPillFace
      item={techDetailLabel!}
      compact
      className="w-fit shrink-0 !px-2 !py-0.5 !text-[10px] leading-none"
    />
  ) : null

  const pictureBlock = showPicture ? (
    <div className="flex w-full flex-col items-center gap-3">
      {(() => {
        const pictures = detailPictures!
        const useSmallerTechLogo = [
          'social media',
          'on-campus booth',
          'handshake',
          'handshake employer profile',
        ].includes(techDetailLabel?.trim().toLowerCase() ?? '')
        const isTechLogo = (src: string) =>
          useSmallerTechLogo ||
          src.includes('-logo.') ||
          src.includes('/logo/')
        const logos = pictures.filter(isTechLogo)
        const screenshots = pictures.filter((src) => !isTechLogo(src))

        return (
          <>
            {logos.length > 0 ? (
              <div className="flex w-full flex-wrap items-center justify-center gap-3">
                {logos.map((src) => (
                  <img
                    key={src}
                    src={src}
                    alt=""
                    className={cn(
                      useSmallerTechLogo
                        ? CELL_DETAIL_SMALL_LOGO_CLASS
                        : CELL_DETAIL_LOGO_CLASS,
                      src.includes('figma-logo.') && 'bg-transparent',
                    )}
                  />
                ))}
              </div>
            ) : null}
            {screenshots.map((src) => (
              <div key={src} className={CELL_DETAIL_PICTURE_FRAME_CLASS}>
                <img
                  src={src}
                  alt=""
                  className={CELL_DETAIL_PICTURE_CLASS}
                />
              </div>
            ))}
          </>
        )
      })()}
    </div>
  ) : null

  return (
    <Drawer
      open={drawerOpen}
      onOpenChange={(open) => {
        setDrawerOpen(open)
        if (!open) clearSelection()
      }}
      onOpenChangeComplete={(open) => {
        if (!open) setClosingSelection(null)
      }}
      modal={false}
      disablePointerDismissal
      swipeDirection="right"
    >
      <DrawerContent
        data-cell-detail-panel=""
        className="!top-[67px] !right-4 !bottom-[61px] !left-auto !m-0 !h-auto !max-h-none w-[20rem] rounded-2xl border border-border/80 bg-card shadow-sm after:hidden [--drawer-inset:1rem] md:!right-8 md:[--drawer-inset:2rem]"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <DrawerHeader className="flex-row items-center justify-between gap-2 pb-5 text-left">
          <div className="min-w-0 flex-1">
            <DrawerTitle className="sr-only">Cell details</DrawerTitle>
            <DrawerDescription className="sr-only">
              Details for the selected blueprint cell
            </DrawerDescription>
            {cellBreadcrumb}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0 text-muted-foreground hover:text-foreground"
            aria-label="Close cell details"
            onClick={clearSelection}
          >
            <X />
          </Button>
        </DrawerHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pb-4 blueprint-scroll">
          {pictureBlock}
          {isVisualLayer ? (
            <>
              {titleRow}
              <VisualStepDetailStack entries={visualStepEntries} />
            </>
          ) : (
            <>
              <div className="flex min-w-0 flex-col gap-2">
                {showTechPillAboveTitle ? selectedTechPill : null}
                {titleRow}
                {showTechPill && !showTechPillAboveTitle
                  ? selectedTechPill
                  : null}
              </div>
              {detailDescriptionText.trim() ? (
                <p className="-mt-3 text-sm whitespace-pre-wrap text-foreground/75">
                  {detailDescriptionText.trim()}
                </p>
              ) : !showTechPill ? (
                <p className="-mt-3 text-sm text-muted-foreground">No content</p>
              ) : null}
              {SHOW_CELL_DEPENDENCIES && dependencyRows.length > 0 ? (
                <div className="mt-2">
                  <CellDependencyTable
                    rows={dependencyRows}
                    onCellSelect={handleConnectionSelect}
                    onTechSelect={handleTechSelect}
                  />
                </div>
              ) : null}
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
