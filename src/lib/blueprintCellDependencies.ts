import {
  getDirectedConnections,
  getDirectedInteractions,
  type BlueprintCellConnections,
  type FlowConnectionDirection,
  type FlowInteractionDirection,
} from '@/lib/blueprintCellConnections'
import { abbreviateConnectionLayerName } from '@/lib/blueprintLayout'

export type CellDependencyKind = 'connection' | 'interaction' | 'tech' | 'link'

export type CellDependencyRow = {
  id: string
  kind: CellDependencyKind
  label: string
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
    isTechCellSelected,
    selectedTechItem,
    otherTech,
    links,
  } = options

  const rows: CellDependencyRow[] = []
  const interactionTechIds = new Set<string>()

  const nonTechIncoming = connections.incoming.filter((entry) => !entry.isTech)
  const nonTechOutgoing = connections.outgoing.filter((entry) => !entry.isTech)

  for (const connection of getDirectedConnections(nonTechIncoming, nonTechOutgoing)) {
    rows.push({
      id: `connection:${connection.cellId}`,
      kind: 'connection',
      label: abbreviateConnectionLayerName(connection.layerName),
      detail: connection.stepName,
      direction: connection.direction,
      cellId: connection.cellId,
    })
  }

  for (const interaction of getDirectedInteractions(
    connections.incoming,
    connections.outgoing,
    selectedLayerRowPosition,
  )) {
    if (isTechCellSelected && interaction.isTech) continue

    if (!isTechCellSelected && interaction.isTech) {
      for (const item of interaction.techItems) {
        interactionTechIds.add(`${interaction.cellId}:${item}`)
        rows.push({
          id: `interaction-tech:${interaction.cellId}:${item}`,
          kind: 'interaction',
          label: item,
          detail: abbreviateConnectionLayerName(interaction.layerName),
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
      label: abbreviateConnectionLayerName(interaction.layerName),
      detail: interaction.contentPreview || interaction.stepName,
      direction: interaction.direction,
      cellId: interaction.cellId,
    })
  }

  for (const entry of otherTech) {
    if (interactionTechIds.has(entry.id)) continue
    if (selectedTechItem && entry.item === selectedTechItem) continue

    rows.push({
      id: `tech:${entry.id}`,
      kind: 'tech',
      label: entry.item,
      detail: entry.layerName
        ? abbreviateConnectionLayerName(entry.layerName)
        : undefined,
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
