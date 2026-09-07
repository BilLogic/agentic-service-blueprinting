import { REFERENCE_NAMES_EXTRA } from '@/lib/agent/tools/referenceNamesExtra'

/**
 * The reference-doc vocabulary, as a LEAF module: its only import is the fork
 * seam's own leaf half, so `specs.ts` (which quotes these names in the
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
 * `REFERENCE_NAMES_EXTRA` is spliced in right after the canvas adapter: it is
 * empty in the template and holds whatever documents a deployment serves
 * beyond this shared vocabulary. That is what lets THIS list be shared
 * verbatim between the two repositories while each serves a different set.
 */
export const REFERENCE_NAMES: readonly string[] = [
  'canvas-adapter',
  ...REFERENCE_NAMES_EXTRA,
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
