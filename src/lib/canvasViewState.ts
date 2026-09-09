import type { CameraTransform } from '@/lib/cameraTransition'

export type CanvasViewGeometry = {
  left: number
  top: number
  width: number
  height: number
}

export type CanvasViewSnapshot = {
  transform: CameraTransform
  destinationKey: string
  geometry: CanvasViewGeometry
}

export type CanvasViewLease = {
  key: string
  generation: number
}

const views = new Map<string, CanvasViewSnapshot>()
const generations = new Map<string, number>()

const validTransform = (value: CameraTransform) =>
  Number.isFinite(value.pan.x) &&
  Number.isFinite(value.pan.y) &&
  Number.isFinite(value.zoom) &&
  value.zoom > 0

const cloneSnapshot = (snapshot: CanvasViewSnapshot): CanvasViewSnapshot => ({
  transform: {
    pan: { ...snapshot.transform.pan },
    zoom: snapshot.transform.zoom,
  },
  destinationKey: snapshot.destinationKey,
  geometry: { ...snapshot.geometry },
})

/** A mount captures a lease so a closed tab's later cleanup cannot write. */
export function beginCanvasViewState(key: string): {
  lease: CanvasViewLease
  snapshot?: CanvasViewSnapshot
} {
  const generation = generations.get(key) ?? 0
  const snapshot = views.get(key)
  return {
    lease: { key, generation },
    ...(snapshot && validTransform(snapshot.transform)
      ? { snapshot: cloneSnapshot(snapshot) }
      : {}),
  }
}

export function writeCanvasViewState(
  lease: CanvasViewLease,
  snapshot: CanvasViewSnapshot,
) {
  if ((generations.get(lease.key) ?? 0) !== lease.generation) return
  if (!validTransform(snapshot.transform)) return
  views.set(lease.key, cloneSnapshot(snapshot))
}

export function deleteCanvasViewState(key: string) {
  views.delete(key)
  generations.set(key, (generations.get(key) ?? 0) + 1)
}

export function deleteCanvasViewStatesForTab(tabKey: string) {
  deleteCanvasViewState(`desktop:${tabKey}`)
  deleteCanvasViewState(`mobile:${tabKey}`)
}
