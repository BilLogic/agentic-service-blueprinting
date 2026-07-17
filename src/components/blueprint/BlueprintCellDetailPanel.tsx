import { useEffect, useMemo } from 'react'
import { X } from 'lucide-react'
import { CellDependencyTable } from '@/components/blueprint/CellDependencyTable'
import { VisualStepDetailStack } from '@/components/blueprint/VisualStepDetailStack'
import { PathLabelBadge } from '@/components/blueprint/PathLabelBadge'
import { Button } from '@/components/ui/button'
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
const CELL_DETAIL_PANEL_WIDTH_CLASS = 'w-[20rem]'
const CELL_DETAIL_PICTURE_FRAME_CLASS =
  'relative aspect-[4/3] w-[19rem] max-w-full shrink-0'
const CELL_DETAIL_PICTURE_CLASS =
  'absolute inset-0 h-full w-full object-contain object-center'

/** Temporarily hide dependency table in the cell detail side panel. */
const SHOW_CELL_DEPENDENCY_TABLE = false

const DETAIL_META_CLASS =
  'text-[10px] font-medium leading-none text-muted-foreground/65'

export function BlueprintCellDetailPanel() {
  const { selection, clearSelection, isOpen, blueprints, selectCell } =
    useBlueprintCellDetail()

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
  }, [blueprints, pathEntry?.pathId, resolvedCellId])

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
    for (const entry of [...connections.incoming, ...connections.outgoing]) {
      layerNameByCellId.set(entry.cellId, entry.layerName)
    }

    const seen = new Set<string>()
    const entries: Array<{
      id: string
      cellId: string
      item: string
      layerName?: string
    }> = []

    const add = (entry: {
      id: string
      cellId: string
      item: string
      layerName?: string
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
      })
    }
    for (const entry of stepTechItems) {
      add({
        id: entry.id,
        cellId: entry.cellId,
        item: entry.item,
        layerName: entry.layerName,
      })
    }

    return entries
  }, [connections.incoming, connections.outgoing, linkedTechItems, stepTechItems])

  const dependencyRows = useMemo(() => {
    if (!selection) return []

    const figmaUrl = selectedCell
      ? resolveTechCellDetailUrl(selection.techItem, selectedCell)
      : null

    const links = [
      ...(figmaUrl
        ? [{ id: 'figma', label: 'View in Figma', url: figmaUrl }]
        : []),
      ...cellLinks.flatMap((link, index) => {
        if (link.type !== URL_LINK_TYPE || !link.url?.trim()) return []
        return [
          {
            id: `resource-${index}`,
            label: link.label,
            url: link.url.trim(),
          },
        ]
      }),
    ]

    return buildCellDependencyRows({
      connections,
      selectedLayerRowPosition,
      isTechCellSelected:
        Boolean(selection.techItem) ||
        Boolean(selectedLayer && shouldUsePillCellContent(selectedLayer)),
      selectedTechItem: selection.techItem,
      otherTech: otherTechEntries,
      links,
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

  if (!isOpen || !selection) return null

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
  const techDetailLabel =
    selectedLayer && shouldUsePillCellContent(selectedLayer) && selectedCell
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

  const handleConnectionSelect = (cellId: string) => {
    const pathId = pathEntry?.pathId
    if (!pathId) return

    const blueprint = getBlueprintForPath(blueprints, pathId)
    if (!blueprint) return

    const nextSelection = buildBlueprintCellSelectionForId(
      blueprint,
      resolveBlueprintCellId(cellId),
      selection.scenarioName,
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
    )
    if (!nextSelection) return

    selectCell(nextSelection)
    requestAnimationFrame(() => {
      scrollBlueprintTechPillIntoView(cellId, techItem)
    })
  }

  const pathBadge = pathEntry ? (
    <PathLabelBadge
      name={pathEntry.pathName}
      description={pathEntry.pathDescription}
      pathType={pathEntry.pathType}
      compact
      className="w-fit max-w-full px-1.5 py-0.5 text-[10px] font-medium leading-none"
      side="left"
    />
  ) : null

  const layerTitle = (
    <div className="flex flex-col gap-0.5">
      {selection.scenarioName.trim() ? (
        <p className={DETAIL_META_CLASS}>{selection.scenarioName}</p>
      ) : null}
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Step {selection.stepIndex + 1}
      </p>
      <p className="text-sm font-bold leading-snug tracking-tight text-foreground">
        {selection.layerName}
      </p>
    </div>
  )

  const layerHeader = layerTitle

  const pictureBlock = showPicture ? (
    <div className="flex w-full flex-col items-center gap-3">
      {(() => {
        const pictures = detailPictures!
        const isTechLogo = (src: string) =>
          src.includes('-logo.') || src.includes('/logo/')
        const logos = pictures.filter(isTechLogo)
        const screenshots = pictures.filter((src) => !isTechLogo(src))

        if (logos.length > 0 && screenshots.length > 0) {
          return (
            <>
              <div className="flex items-center justify-center gap-4">
                {logos.map((src) => (
                  <img
                    key={src}
                    src={src}
                    alt=""
                    className="h-16 w-16 shrink-0 object-contain"
                  />
                ))}
              </div>
              {screenshots.map((src) => (
                <div
                  key={src}
                  className={cn(CELL_DETAIL_PICTURE_FRAME_CLASS)}
                >
                  <img
                    src={src}
                    alt=""
                    className={CELL_DETAIL_PICTURE_CLASS}
                  />
                </div>
              ))}
            </>
          )
        }

        return (
          <div
            className={cn(
              CELL_DETAIL_PICTURE_FRAME_CLASS,
              pictures.length > 1 &&
                'flex items-center justify-center gap-4',
            )}
          >
            {pictures.length > 1 ? (
              pictures.map((src) => (
                <img
                  key={src}
                  src={src}
                  alt=""
                  className="h-16 w-16 shrink-0 object-contain"
                />
              ))
            ) : (
              <img
                src={pictures[0]}
                alt=""
                className={CELL_DETAIL_PICTURE_CLASS}
              />
            )}
          </div>
        )
      })()}
    </div>
  ) : null

  return (
    <div
      data-cell-detail-panel=""
      className={cn(
        'pointer-events-none absolute z-30',
        'top-18 right-4 bottom-14 md:right-8',
        CELL_DETAIL_PANEL_WIDTH_CLASS,
      )}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <aside
        role="dialog"
        aria-modal="false"
        aria-label="Cell details"
        className="pointer-events-auto relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm"
      >
        <div className="flex shrink-0 items-center justify-between gap-2 px-4 pb-2 pt-3">
          <div className="min-w-0 flex-1">{pathBadge}</div>
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
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-4">
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto blueprint-scroll">
            {isVisualLayer ? (
              <>
                {layerTitle}
                <VisualStepDetailStack entries={visualStepEntries} />
              </>
            ) : (
              <>
                {layerHeader}
                {pictureBlock}
                {techDetailLabel ? (
                  <p className="text-sm font-bold leading-snug text-foreground">
                    {techDetailLabel}
                  </p>
                ) : null}
                {detailDescriptionText.trim() || !techDetailLabel ? (
                  <p className="text-sm whitespace-pre-wrap text-foreground">
                    {detailDescriptionText.trim() || (
                      <span className="text-muted-foreground">No content</span>
                    )}
                  </p>
                ) : null}
                {SHOW_CELL_DEPENDENCY_TABLE ? (
                  <CellDependencyTable
                    rows={dependencyRows}
                    onCellSelect={handleConnectionSelect}
                    onTechSelect={handleTechSelect}
                  />
                ) : null}
              </>
            )}
          </div>
        </div>
      </aside>
    </div>
  )
}
