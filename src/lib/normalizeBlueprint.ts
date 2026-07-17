import type {
  BlueprintCell,
  BlueprintCellTrigger,
  BlueprintData,
  BlueprintLayer,
  BlueprintStep,
} from '@/types/blueprint'
import type { PathType, Json } from '@/types/database'
import { normalizeCellLinks } from '@/lib/cellMetadata'

type RawOutgoingTrigger = {
  id: string
  target_cell_id: string
}

export type RawCell = {
  id: string
  layer_id: string
  step_id: string
  content: string
  picture?: string | null
  description?: string | null
  links?: Json | null
  outgoing?: RawOutgoingTrigger[] | null
}

type RawPathStep = {
  column_position: number
  steps: { id: string; name: string } | null
}

export type RawLayer = {
  id: string
  name: string
  row_position: number
  /** Semantic role column as selected from the DB. */
  layer_role?: string | null
  /** Normalized shape (fallback data passes BlueprintLayer directly). */
  role?: string | null
}

export type RawPath = {
  id: string
  name: string
  description?: string | null
  note?: string | null
  path_type: PathType
  layers?: RawLayer[] | null
  /** @deprecated Legacy shape; use path_steps */
  steps?: BlueprintStep[] | null
  path_steps?: RawPathStep[] | null
  cells?: RawCell[] | null
  cell_triggers?: BlueprintCellTrigger[] | null
}

/** Flatten path_steps junction rows into blueprint steps sorted by column. */
export function flattenPathSteps(raw: RawPathStep[]): BlueprintStep[] {
  return [...raw]
    .sort((a, b) => a.column_position - b.column_position)
    .flatMap((row) => {
      if (!row.steps) return []
      return [
        {
          id: row.steps.id,
          name: row.steps.name,
          column_position: row.column_position,
        },
      ]
    })
}

function resolveSteps(raw: RawPath): BlueprintStep[] {
  if (raw.path_steps && raw.path_steps.length > 0) {
    return flattenPathSteps(raw.path_steps)
  }
  return [...(raw.steps ?? [])].sort(
    (a, b) => a.column_position - b.column_position,
  )
}

function flattenTriggersFromCells(cells: RawCell[]): BlueprintCellTrigger[] {
  const triggers: BlueprintCellTrigger[] = []
  for (const cell of cells) {
    for (const outgoing of cell.outgoing ?? []) {
      triggers.push({
        id: outgoing.id,
        source_cell_id: cell.id,
        target_cell_id: outgoing.target_cell_id,
      })
    }
  }
  return triggers
}

/** Collapse duplicate swim lanes that share a name (e.g. legacy + fallback layer IDs). */
export function deduplicateBlueprintLayers(data: BlueprintData): BlueprintData {
  const layersByName = new Map<string, BlueprintLayer[]>()
  for (const layer of data.layers) {
    const group = layersByName.get(layer.name) ?? []
    group.push(layer)
    layersByName.set(layer.name, group)
  }

  const duplicateGroups = [...layersByName.values()].filter(
    (group) => group.length > 1,
  )
  if (duplicateGroups.length === 0) {
    return data
  }

  const cellCountByLayerId = new Map<string, number>()
  for (const cell of data.cells) {
    cellCountByLayerId.set(
      cell.layer_id,
      (cellCountByLayerId.get(cell.layer_id) ?? 0) + 1,
    )
  }

  const layerIdRemap = new Map<string, string>()
  const keptLayers: BlueprintLayer[] = []

  for (const group of layersByName.values()) {
    if (group.length === 1) {
      keptLayers.push(group[0])
      continue
    }

    const canonical = [...group].sort((a, b) => {
      const cellDiff =
        (cellCountByLayerId.get(b.id) ?? 0) -
        (cellCountByLayerId.get(a.id) ?? 0)
      if (cellDiff !== 0) return cellDiff
      return a.row_position - b.row_position
    })[0]

    keptLayers.push({
      ...canonical,
      row_position: Math.min(...group.map((layer) => layer.row_position)),
    })

    for (const layer of group) {
      if (layer.id !== canonical.id) {
        layerIdRemap.set(layer.id, canonical.id)
      }
    }
  }

  const cellByLayerStep = new Map<string, BlueprintCell>()
  for (const cell of data.cells) {
    const layerId = layerIdRemap.get(cell.layer_id) ?? cell.layer_id
    const key = `${layerId}:${cell.step_id}`
    const existing = cellByLayerStep.get(key)
    const nextCell = { ...cell, layer_id: layerId }

    if (!existing) {
      cellByLayerStep.set(key, nextCell)
      continue
    }

    if (!existing.content.trim() && nextCell.content.trim()) {
      cellByLayerStep.set(key, nextCell)
    }
  }

  const cells = [...cellByLayerStep.values()]
  const cellIds = new Set(cells.map((cell) => cell.id))
  const triggers = data.triggers.filter(
    (trigger) =>
      cellIds.has(trigger.source_cell_id) &&
      cellIds.has(trigger.target_cell_id),
  )

  keptLayers.sort((a, b) => a.row_position - b.row_position)

  return { ...data, layers: keptLayers, cells, triggers }
}

export function sortBlueprintLayers(data: BlueprintData): BlueprintData {
  const layers = [...data.layers].sort(
    (a, b) => a.row_position - b.row_position,
  )
  const unchanged = layers.every(
    (layer, index) => layer.id === data.layers[index]?.id,
  )
  return unchanged ? data : { ...data, layers }
}

export function normalizeBlueprint(raw: RawPath): BlueprintData {
  const layers: BlueprintLayer[] = [...(raw.layers ?? [])]
    .sort((a, b) => a.row_position - b.row_position)
    .map((layer) => ({
      id: layer.id,
      name: layer.name,
      role: layer.layer_role ?? layer.role ?? null,
      row_position: layer.row_position,
    }))
  const steps = resolveSteps(raw)
  const rawCells = raw.cells ?? []
  const cells: BlueprintCell[] = rawCells.map((cell) => ({
    id: cell.id,
    layer_id: cell.layer_id,
    step_id: cell.step_id,
    content: cell.content,
    picture: cell.picture ?? null,
    description: cell.description ?? null,
    links: normalizeCellLinks(cell.links),
  }))
  const triggers =
    raw.cell_triggers && raw.cell_triggers.length > 0
      ? raw.cell_triggers
      : flattenTriggersFromCells(rawCells)

  return sortBlueprintLayers({
    path: {
      id: raw.id,
      name: raw.name,
      description: raw.description ?? null,
      note: raw.note ?? null,
      path_type: raw.path_type,
    },
    layers,
    steps,
    cells,
    triggers,
  })
}

export function buildCellLookup(cells: BlueprintCell[]): Map<string, BlueprintCell> {
  const map = new Map<string, BlueprintCell>()
  for (const cell of cells) {
    map.set(`${cell.layer_id}:${cell.step_id}`, cell)
  }
  return map
}

export function getCellAt(
  lookup: Map<string, BlueprintCell>,
  layerId: string,
  stepId: string,
): BlueprintCell | undefined {
  return lookup.get(`${layerId}:${stepId}`)
}
