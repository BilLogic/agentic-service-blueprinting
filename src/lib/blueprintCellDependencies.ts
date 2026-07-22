import {
  getDirectedConnections,
  getDirectedInteractions,
  type BlueprintCellConnections,
  type FlowConnectionDirection,
  type FlowInteractionDirection,
} from '@/lib/blueprintCellConnections'

export type CellDependencyKind = 'connection' | 'interaction' | 'tech' | 'link'

export type CellDependencyRow = {
  id: string
  kind: CellDependencyKind
  label: string
  layerLabel?: string
  stepLabel?: string
  detail?: string
  direction?: FlowConnectionDirection | FlowInteractionDirection
  cellId?: string
  techItem?: string
  href?: string
}

export type CellDependencyTechEntry = {
  id: string
  cellId: string
  item: string
  layerName?: string
  stepIndex?: number
}

function formatStepLabel(stepIndex: number): string | undefined {
  if (stepIndex < 0) return undefined
  return `Step ${stepIndex + 1}`
}

function resolveTechStepIndex(
  cellId: string,
  connections: BlueprintCellConnections,
): number | undefined {
  const match =
    connections.incoming.find((entry) => entry.cellId === cellId) ??
    connections.outgoing.find((entry) => entry.cellId === cellId)
  return match?.stepIndex
}

export type CellDependencyLinkEntry = {
  id: string
  label: string
  url: string
}

const KIND_ORDER: Record<CellDependencyKind, number> = {
  connection: 0,
  interaction: 1,
  tech: 2,
  link: 3,
}

export function getCellDependencyKindLabel(kind: CellDependencyKind): string {
  switch (kind) {
    case 'connection':
      return 'Connection'
    case 'interaction':
      return 'Interaction'
    case 'tech':
      return 'Other tech'
    case 'link':
      return 'Link'
  }
}

function resolveTechDependencyDirection(
  cellId: string,
  connections: BlueprintCellConnections,
  selectedLayerRowPosition: number,
): FlowConnectionDirection | FlowInteractionDirection | undefined {
  const incoming = connections.incoming.filter(
    (entry) => entry.cellId === cellId && entry.isTech,
  )
  const outgoing = connections.outgoing.filter(
    (entry) => entry.cellId === cellId && entry.isTech,
  )
  if (incoming.length === 0 && outgoing.length === 0) return undefined

  const interactionSample =
    incoming.find((entry) => entry.kind === 'interaction') ??
    outgoing.find((entry) => entry.kind === 'interaction')

  if (interactionSample) {
    return interactionSample.layerRowPosition < selectedLayerRowPosition
      ? 'up'
      : 'down'
  }

  const hasPrev = incoming.some((entry) => entry.kind === 'connection')
  const hasNext = outgoing.some((entry) => entry.kind === 'connection')
  if (hasPrev && hasNext) return 'both'
  if (hasPrev) return 'prev'
  if (hasNext) return 'next'
  return undefined
}

export function buildCellDependencyRows(options: {
  connections: BlueprintCellConnections
  selectedLayerRowPosition: number
  isTechCellSelected: boolean
  selectedTechItem?: string | null
  otherTech: CellDependencyTechEntry[]
  links: CellDependencyLinkEntry[]
}): CellDependencyRow[] {
  const {
    connections,
    selectedLayerRowPosition,
    selectedTechItem,
    otherTech,
    links,
  } = options
  void options.isTechCellSelected

  const rows: CellDependencyRow[] = []
  const interactionTechIds = new Set<string>()

  const nonTechIncoming = connections.incoming.filter((entry) => !entry.isTech)
  const nonTechOutgoing = connections.outgoing.filter((entry) => !entry.isTech)

  for (const connection of getDirectedConnections(nonTechIncoming, nonTechOutgoing)) {
    rows.push({
      id: `connection:${connection.cellId}`,
      kind: 'connection',
      label: connection.layerName,
      layerLabel: connection.layerName,
      stepLabel: formatStepLabel(connection.stepIndex),
      direction: connection.direction,
      cellId: connection.cellId,
    })
  }

  for (const interaction of getDirectedInteractions(
    connections.incoming,
    connections.outgoing,
    selectedLayerRowPosition,
  )) {
    if (interaction.isTech) {
      for (const item of interaction.techItems) {
        if (selectedTechItem && item === selectedTechItem) continue
        interactionTechIds.add(`${interaction.cellId}:${item}`)
        rows.push({
          id: `interaction-tech:${interaction.cellId}:${item}`,
          kind: 'tech',
          label: item,
          layerLabel: interaction.layerName,
          stepLabel: formatStepLabel(interaction.stepIndex),
          detail: item,
          direction: interaction.direction,
          cellId: interaction.cellId,
          techItem: item,
        })
      }
      continue
    }

    rows.push({
      id: `interaction:${interaction.cellId}`,
      kind: 'interaction',
      label: interaction.layerName,
      layerLabel: interaction.layerName,
      stepLabel: formatStepLabel(interaction.stepIndex),
      direction: interaction.direction,
      cellId: interaction.cellId,
    })
  }

  const techIncoming = connections.incoming.filter((entry) => entry.isTech)
  const techOutgoing = connections.outgoing.filter((entry) => entry.isTech)
  for (const connection of getDirectedConnections(techIncoming, techOutgoing)) {
    for (const item of connection.techItems) {
      const id = `${connection.cellId}:${item}`
      if (interactionTechIds.has(id)) continue
      if (selectedTechItem && item === selectedTechItem) continue
      interactionTechIds.add(id)
      rows.push({
        id: `connection-tech:${connection.cellId}:${item}`,
        kind: 'tech',
        label: item,
        layerLabel: connection.layerName,
        stepLabel: formatStepLabel(connection.stepIndex),
        detail: item,
        direction: connection.direction,
        cellId: connection.cellId,
        techItem: item,
      })
    }
  }

  for (const entry of otherTech) {
    if (interactionTechIds.has(entry.id)) continue
    if (selectedTechItem && entry.item === selectedTechItem) continue

    const stepIndex =
      entry.stepIndex ?? resolveTechStepIndex(entry.cellId, connections)

    rows.push({
      id: `tech:${entry.id}`,
      kind: 'tech',
      label: entry.item,
      layerLabel: entry.layerName,
      stepLabel:
        stepIndex !== undefined ? formatStepLabel(stepIndex) : undefined,
      detail: entry.layerName ? entry.item : undefined,
      direction: resolveTechDependencyDirection(
        entry.cellId,
        connections,
        selectedLayerRowPosition,
      ),
      cellId: entry.cellId,
      techItem: entry.item,
    })
  }

  for (const link of links) {
    rows.push({
      id: `link:${link.id}`,
      kind: 'link',
      label: link.label,
      href: link.url,
    })
  }

  return rows.sort((a, b) => {
    const kindDiff = KIND_ORDER[a.kind] - KIND_ORDER[b.kind]
    if (kindDiff !== 0) return kindDiff
    return a.label.localeCompare(b.label)
  })
}
