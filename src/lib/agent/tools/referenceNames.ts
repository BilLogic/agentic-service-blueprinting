import { REFERENCE_NAMES_EXTRA } from '@/lib/agent/tools/referenceNamesExtra'
import { registeredReferenceNames } from '@/lib/agent/tools/referenceRegistry'

/**
 * The reference-doc vocabulary, as a LEAF module: its only imports are the
 * seam's own leaf halves, so `specs.ts` (which quotes these names in the
 * get_reference tool description) stays loadable without dragging
 * `referenceDocs.ts`'s Vite `?raw` markdown imports into a Node environment.
 * The eval harness bundles specs.ts directly, with a bundler that has no
 * `?raw` loader, so that is a build constraint and not a preference.
 *
 * `referenceDocs.ts` owns the actual documents, and `read.ts` asserts at
 * module init that its record keys match this list exactly — add a reference
 * in both places or that assertion fails the first test that touches the
 * tools.
 *
 * TWO SLOTS FOR A NON-TEMPLATE DOCUMENT, both spliced in right after the
 * canvas adapter, both empty in the standalone template.
 *
 * `REFERENCE_NAMES_EXTRA` is the seam for an app that COPIES this repo: it
 * edits that file, and THIS list stays shared verbatim between the two.
 *
 * `registeredReferenceNames()` is the seam for a deployment that MOUNTS the
 * package and can edit neither: it calls `registerReferenceDocs` before it
 * imports the app, and the names come from the keys it registered — one
 * statement of what it serves rather than a record and a list to keep in
 * agreement. A registered key the template already serves is an override of that
 * document, not a new name, so it is filtered out here.
 */
const DECLARED_REFERENCE_NAMES: readonly string[] = [
  'canvas-adapter',
  ...REFERENCE_NAMES_EXTRA,
  ...registeredReferenceNames(),
  'lane-roles',
  'lane-vocabulary',
  'elicitation-protocol',
  'cocreate-playbook',
  'data-model',
  'audit-playbook',
  'whatif-playbook',
  'check-gap-sweep',
  'check-jargon-lint',
  'check-channel-conflict',
  'check-kpi-alignment',
  'check-perceived-owner',
  'check-value-ledger',
  'check-fee-visibility',
  'check-obsolete-source',
  'slice-playbook',
  'slice-templates',
]

/**
 * De-duplicated, first occurrence winning, because a registered name may be an
 * OVERRIDE of a document this template already serves rather than an addition —
 * `canvas-adapter` is the case that exists. The override replaces the document
 * in `REFERENCE_DOCS` and must not appear twice here, or `read.ts`'s
 * record-versus-vocabulary assertion fails on a list the record cannot match.
 */
export const REFERENCE_NAMES: readonly string[] = [
  ...new Set(DECLARED_REFERENCE_NAMES),
]
