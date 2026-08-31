/**
 * What this app reads and writes through — stated as domain operations, so a
 * backend that is not PostgREST can serve it.
 *
 * The contract used to be a sentence in `references/adapter-contract.md`
 * saying the frontend reads through "PostgREST-style embedded selects", and
 * that a host without them "cannot serve the app". That was our coupling
 * written down as though it were physics. What the app actually needs is a
 * blueprint, its slices and its findings — none of which mention PostgREST,
 * a nested select, or a foreign-key hint.
 *
 * So the seam is named here, one repository per aggregate, and each operation
 * says out loud what a caller may assume of it. Two properties matter more
 * than the shapes:
 *
 *  1. **Every operation declares a guarantee.** `atomic` means all-or-nothing.
 *     `converging` means running it twice with the same input lands in the
 *     same place. `read` means it changes nothing. An implementer does not
 *     have to guess which writes are allowed to half-land.
 *
 *  2. **Round trips are in the contract, not discovered.** Each read says how
 *     many round trips a reasonable implementation should take. A backend
 *     without joins can still conform, but it conforms visibly rather than by
 *     turning one screen into ninety requests that nobody notices until an
 *     adopter's bill arrives.
 *
 * See `conformance.ts` for the suite an implementation has to pass, and
 * `levels.ts` for what Transactional and Idempotent mean.
 */
import type { BlueprintData } from '@/types/blueprint'

/** What a caller may assume about an operation. Declared per operation. */
export type Guarantee =
  /** Changes nothing. Safe to repeat, safe to cache. */
  | 'read'
  /** All of it lands or none of it does. */
  | 'atomic'
  /** Repeating it with the same input converges on the same state. */
  | 'converging'

/** A phase of the service, as the nav renders it. */
export type PhaseSummary = {
  id: string
  name: string
  summary: string | null
  position: number
  /** Set when this phase loops back to an earlier one. */
  loopsToPhaseId: string | null
  scenarios: ScenarioSummary[]
}

export type ScenarioSummary = {
  id: string
  name: string
  summary: string | null
  position: number
}

/** A path within a scenario, as the path picker lists it. */
export type PathSummary = {
  id: string
  scenarioId: string
  name: string
  summary: string | null
  note: string | null
  pathType: string
}

/** One frame of a slice: the cells it points at, and the words around them. */
export type SliceFrame = {
  position: number
  title: string
  body: string | null
  cellIds: string[]
}

export type SliceSummary = {
  id: string
  scenarioId: string | null
  title: string
  sliceType: string
  origin: string
}

export type SliceDetail = SliceSummary & { frames: SliceFrame[] }

export type SliceDraft = {
  scenarioId: string | null
  title: string
  sliceType: string
  origin: string
  frames: SliceFrame[]
}

export type FindingStatus = 'open' | 'resolved' | 'dismissed'

export type Finding = {
  id: string
  /** Stable identity of the problem, not of the row. Two rows with one
   *  fingerprint open at once is the defect this field exists to prevent. */
  fingerprint: string
  source: string
  severity: string
  status: FindingStatus
  summary: string
  cellIds: string[]
}

export type FindingDraft = Omit<Finding, 'id' | 'status'>

/**
 * The blueprint itself. Read-only: authoring goes through the operations on
 * the other repositories, and structural authoring through the skills.
 */
export interface BlueprintRepository {
  /** @guarantee read @roundTrips 1 — phases with their scenarios nested. */
  listPhases(): Promise<PhaseSummary[]>
  /** @guarantee read @roundTrips 1 */
  listPaths(scenarioId: string): Promise<PathSummary[]>
  /**
   * One path's whole grid: lanes, steps, cells, edges.
   *
   * @guarantee read
   * @roundTrips 1 — a backend without joins may take more, and should say so
   * in its capabilities rather than let a caller find out.
   * @returns null when the path does not exist. Absence is not an error.
   */
  getBlueprint(pathId: string): Promise<BlueprintData | null>
}

export interface SliceRepository {
  /** @guarantee read @roundTrips 1 */
  listSlices(scenarioId?: string): Promise<SliceSummary[]>
  /** @guarantee read @roundTrips 1 @returns null when absent */
  getSlice(sliceId: string): Promise<SliceDetail | null>
  /**
   * The slice and all its frames, or neither.
   *
   * @guarantee atomic — a slice with no frames is a slice nobody can read and
   * nobody knows to delete. On an Idempotent backend see `repairSlices`.
   */
  createSlice(draft: SliceDraft): Promise<SliceDetail>
  /**
   * Swap a slice's frames wholesale.
   *
   * @guarantee atomic — the old frames are gone only once the new ones land.
   */
  replaceSliceFrames(sliceId: string, frames: SliceFrame[]): Promise<SliceDetail>
  /**
   * @guarantee converging — deleting a slice that is already gone is success,
   * not an error. Callers retry, and a retry must not be a failure.
   */
  deleteSlice(sliceId: string): Promise<void>
  /**
   * Finish or undo whatever a torn write left behind.
   *
   * Required only of backends conforming at the Idempotent level; a
   * Transactional backend implements it as a no-op returning zero, because it
   * cannot tear. This is the operation that makes "any backend" honest: a
   * store with no transactions can still be correct, as long as somebody can
   * name the state it gets stuck in and drive it forward.
   *
   * @guarantee converging
   * @returns how many slices it repaired or removed.
   */
  repairSlices(): Promise<number>
}

export interface FindingRepository {
  /** @guarantee read @roundTrips 1 */
  listFindings(status?: FindingStatus): Promise<Finding[]>
  /**
   * Record a batch of findings, skipping any whose fingerprint is already
   * open.
   *
   * @guarantee converging — the audit re-runs constantly and must not breed
   * duplicates. Deduplication is by fingerprint, not by row id.
   * @returns the findings that were actually new.
   */
  recordFindings(drafts: FindingDraft[]): Promise<Finding[]>
  /** @guarantee converging — setting a status it already has is success. */
  setFindingStatus(findingId: string, status: FindingStatus): Promise<void>
}

/**
 * Identity, deliberately separate from data.
 *
 * It answers one question — *what may this session do?* — rather than exposing
 * a token, a claim name, or a JWT. An adopter may run Supabase auth, their own
 * OIDC, or a single-user desktop build where the answer is a constant, without
 * either side of the seam learning about the other.
 *
 * This is a UI-level answer. The backend still enforces it: a client that lies
 * here changes what buttons render, and nothing else.
 */
export interface IdentityPort {
  /** Who is asking, in the only terms this app acts on. */
  currentTier(): Promise<Tier>
}

export type Tier =
  /** Not signed in. Reads what is public; writes nothing. */
  | 'anon'
  /** Signed in. Writes the analysis tier: slices, findings, evidence. */
  | 'authoring'
  /** Trusted automation. Writes structure as well. */
  | 'service'

/** True when this tier may write the analysis tier at all. */
export function tierCanWrite(tier: Tier): boolean {
  return tier !== 'anon'
}

/**
 * Everything a backend has to supply, plus what it admits about itself.
 *
 * `capabilities` is not decoration. A read-only backend that says so gets a
 * read-only app; one that stays quiet gets write buttons that fail at the
 * point of use.
 */
export type BackendCapabilities = {
  /** Which conformance level the writes meet. `null` = serves reads only. */
  writes: ConformanceLevel | null
  /** Round trips for `getBlueprint`, if more than one. Documented, not hidden. */
  blueprintRoundTrips?: number
}

export type ConformanceLevel = 'transactional' | 'idempotent'

export type Backend = {
  name: string
  capabilities: BackendCapabilities
  /**
   * What shape this target carries — asked, not assumed.
   *
   * @guarantee read
   * @roundTrips 1
   * @see schemaVersion.ts for the supported list and the mismatch error.
   */
  schemaVersion(): Promise<string>
  blueprints: BlueprintRepository
  slices: SliceRepository
  findings: FindingRepository
  identity: IdentityPort
}
