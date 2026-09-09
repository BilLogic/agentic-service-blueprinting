import {
  ResourcesList,
  type ResourceListDraft,
} from '@/components/blueprint/ResourcesList'
import { useSupabase } from '@/contexts/SupabaseProvider'
import { invalidateQueries } from '@/hooks/useSupabaseQuery'
import {
  setFeaturedResource,
  updatePlacementResources,
} from '@/lib/placementResourceMutations'
import type { CellResource } from '@/types/blueprint'

/**
 * The placement's own list, and the two writes that make it the placement's.
 *
 * The list itself is `ResourcesList` — the same one the cell's Resources tab
 * edits. What is a placement's here and nowhere else is exactly three things:
 * the rows it is handed, the pair of writes, and the sentence under the
 * heading. Everything the reader touches — the rows, the featured block, the
 * row menu, the drag handle, the paste field, the upload — is the shared
 * list, because a second copy of it is the defect this shape removes.
 */
export function PlacementResourcesList({
  placement,
  resources,
  onWritten,
}: {
  placement: { id: string; cellId: string | null; name: string }
  /** The cell's resources — this list keeps the placement's. */
  resources: readonly CellResource[]
  /** After any write landed: the caller refetches what it shows. */
  onWritten?: () => void
}) {
  const { client } = useSupabase()

  const save = async (rows: ResourceListDraft[]) => {
    if (!client) return
    await updatePlacementResources(client, placement, resources, rows)
  }

  const feature = async (resourceId: string, featured: boolean) => {
    if (!client) return
    await setFeaturedResource(
      client,
      { id: resourceId, placementId: placement.id, cellId: placement.cellId },
      featured,
    )
  }

  return (
    <div data-placement-resources="">
      <ResourcesList
        cellId={placement.cellId}
        resources={resources.filter((resource) => resource.placementId === placement.id)}
        hint={
          <>
            What “{placement.name}” points at here. The preview and the buttons
            come from the featured ones.
          </>
        }
        onSave={save}
        onFeature={feature}
        onWritten={() => {
          invalidateQueries('service-phases')
          invalidateQueries('canvas-blueprints')
          if (placement.cellId) invalidateQueries(`cell-content:${placement.cellId}`)
          onWritten?.()
        }}
      />
    </div>
  )
}
