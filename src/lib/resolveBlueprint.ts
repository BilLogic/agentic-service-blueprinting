import {
  getBlueprintFallback,
  getRawBlueprintFallback,
} from '@/data/blueprintFallbacks'
import { isBlueprintStepVisualPlaceholder } from '@/lib/blueprintVisualPlaceholder'
import {
  deduplicateBlueprintLayers,
  normalizeBlueprint,
  sortBlueprintLayers,
  type RawPath,
} from '@/lib/normalizeBlueprint'
import type { BlueprintData } from '@/types/blueprint'
import type { CellLink } from '@/types/blueprint'

export type BlueprintSource = 'database' | 'fallback' | null

export function isBlueprintEmpty(data: BlueprintData): boolean {
  return data.layers.length === 0
}

/** DB value wins when non-empty; fallback only fills empty/null fields. */
function preferNonEmpty(
  dbValue: string | null | undefined,
  fallbackValue: string | null | undefined,
): string | null {
  if (dbValue?.trim()) return dbValue
  return fallbackValue ?? dbValue ?? null
}

/**
 * DB-wins link merge: fallback links may fill empty fields on a link the DB
 * already has (matched by type + label) and append links the DB is missing
 * entirely. DB links are never removed or overwritten.
 */
function fillMissingCellLinks(
  links: CellLink[],
  fallbackLinks: CellLink[],
): CellLink[] {
  const fillField = (
    existing: string | undefined,
    fallbackValue: string | undefined,
  ): string | undefined => {
    if (existing?.trim()) return existing
    if (fallbackValue?.trim()) return fallbackValue
    return existing
  }

  const merged = links.map((link) => ({ ...link }))

  for (const fallbackLink of fallbackLinks) {
    const hasPayload =
      fallbackLink.url?.trim() ||
      fallbackLink.description?.trim() ||
      fallbackLink.picture?.trim() ||
      fallbackLink.pictures?.length
    if (!hasPayload) continue

    const existingIndex = merged.findIndex(
      (entry) =>
        entry.type === fallbackLink.type && entry.label === fallbackLink.label,
    )

    if (existingIndex === -1) {
      merged.push({ ...fallbackLink })
      continue
    }

    const existing = merged[existingIndex]!
    merged[existingIndex] = {
      ...existing,
      url: fillField(existing.url, fallbackLink.url),
      description: fillField(existing.description, fallbackLink.description),
      picture: fillField(existing.picture, fallbackLink.picture),
      pictures: existing.pictures?.length
        ? existing.pictures
        : fallbackLink.pictures?.length
          ? fallbackLink.pictures
          : existing.pictures,
    }
  }

  return merged
}

/**
 * Fill DB gaps from the fallback blueprint — DB wins.
 *
 * Merge policy (applies only when the blueprint source is 'database'):
 * - Field values already present in the DB (non-empty after trim) are kept.
 * - Fallback values only fill DB fields that are null/empty (a placeholder
 *   step visual counts as empty when the fallback has a real picture).
 * - Fallback layers/cells/steps/triggers/links that are entirely missing from
 *   the DB are appended; nothing in the DB is removed or repositioned.
 */
function mergeMissingBlueprintContent(
  data: BlueprintData,
  scenarioId: string | undefined,
  pathId: string | undefined,
): BlueprintData {
  const fallback = getBlueprintFallback(scenarioId, pathId ?? data.path.id)
  if (!fallback) return data

  const layerIds = new Set(data.layers.map((layer) => layer.id))
  const layerIdByName = new Map(
    data.layers.map((layer) => [layer.name, layer.id]),
  )
  const fallbackLayerIdRemap = new Map<string, string>()
  const layers = [...data.layers]
  for (const layer of fallback.layers) {
    if (layerIds.has(layer.id)) continue

    const existingLayerId = layerIdByName.get(layer.name)
    if (existingLayerId) {
      fallbackLayerIdRemap.set(layer.id, existingLayerId)
      continue
    }

    layers.push(layer)
    layerIds.add(layer.id)
    layerIdByName.set(layer.name, layer.id)
  }
  layers.sort((a, b) => a.row_position - b.row_position)

  const fallbackCellById = new Map(
    fallback.cells.map((cell) => [cell.id, cell]),
  )

  const cellIds = new Set(data.cells.map((cell) => cell.id))
  let cellsChanged = false
  const cells = data.cells.map((cell) => {
    const fallbackCell = fallbackCellById.get(cell.id)
    if (!fallbackCell) return cell

    let changed = false
    let next = cell

    if (fallbackCell.picture?.trim()) {
      const cellPicture = cell.picture?.trim()
      if (
        !cellPicture ||
        (isBlueprintStepVisualPlaceholder(cellPicture) &&
          !isBlueprintStepVisualPlaceholder(fallbackCell.picture))
      ) {
        next = { ...next, picture: fallbackCell.picture }
        changed = true
      }
    }

    if (fallbackCell.description?.trim() && !cell.description?.trim()) {
      next = { ...next, description: fallbackCell.description }
      changed = true
    }

    if (fallbackCell.content.trim() && !cell.content.trim()) {
      next = { ...next, content: fallbackCell.content }
      changed = true
    }

    const mergedLinks = fillMissingCellLinks(cell.links, fallbackCell.links)
    if (JSON.stringify(mergedLinks) !== JSON.stringify(cell.links)) {
      next = { ...next, links: mergedLinks }
      changed = true
    }

    if (changed) cellsChanged = true
    return changed ? next : cell
  })
  for (const cell of fallback.cells) {
    if (cellIds.has(cell.id)) continue

    const layerId =
      fallbackLayerIdRemap.get(cell.layer_id) ?? cell.layer_id
    cells.push({ ...cell, layer_id: layerId })
    cellIds.add(cell.id)
  }

  const stepIds = new Set(data.steps.map((step) => step.id))
  const steps = [...data.steps]
  for (const step of fallback.steps) {
    if (!stepIds.has(step.id)) {
      steps.push(step)
    }
  }
  steps.sort((a, b) => a.column_position - b.column_position)

  const triggerKeys = new Set(
    data.triggers.map(
      (trigger) => `${trigger.source_cell_id}:${trigger.target_cell_id}`,
    ),
  )
  const triggers = [...data.triggers]
  for (const trigger of fallback.triggers) {
    const key = `${trigger.source_cell_id}:${trigger.target_cell_id}`
    if (!triggerKeys.has(key)) {
      triggers.push(trigger)
      triggerKeys.add(key)
    }
  }

  const changed =
    cellsChanged ||
    layers.length !== data.layers.length ||
    cells.length !== data.cells.length ||
    steps.length !== data.steps.length ||
    triggers.length !== data.triggers.length

  const merged = changed
    ? { ...data, layers, cells, steps, triggers }
    : data

  return deduplicateBlueprintLayers(merged)
}

export function resolveBlueprintForScenario(
  scenarioId: string | undefined,
  rawPath: RawPath | null | undefined,
): { blueprint: BlueprintData | null; source: BlueprintSource } {
  const pathId = rawPath?.id

  if (rawPath) {
    const fromDb = normalizeBlueprint(rawPath)
    if (!isBlueprintEmpty(fromDb)) {
      const merged = mergeMissingBlueprintContent(fromDb, scenarioId, pathId)
      const rawFallback = getRawBlueprintFallback(
        scenarioId,
        pathId,
        merged.path.path_type,
      )
      // DB-wins path metadata: fallback only fills empty name/description/note.
      const blueprint = rawFallback
        ? {
            ...merged,
            path: {
              ...merged.path,
              name: merged.path.name.trim()
                ? merged.path.name
                : rawFallback.path.name,
              description: preferNonEmpty(
                merged.path.description,
                rawFallback.path.description,
              ),
              note: preferNonEmpty(merged.path.note, rawFallback.path.note),
            },
          }
        : merged

      return {
        blueprint: sortBlueprintLayers(blueprint),
        source: 'database',
      }
    }
  }

  const fallback = getBlueprintFallback(scenarioId, pathId)
  if (fallback) {
    return {
      blueprint: sortBlueprintLayers(deduplicateBlueprintLayers(fallback)),
      source: 'fallback',
    }
  }

  return { blueprint: null, source: null }
}
