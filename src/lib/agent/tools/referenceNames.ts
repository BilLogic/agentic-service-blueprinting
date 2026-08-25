/**
 * The reference-doc vocabulary, as a LEAF module: no imports at all, so
 * `specs.ts` (which quotes these names in the read_reference tool
 * description) stays loadable without dragging read.ts's Vite `?raw`
 * markdown imports into a node test environment — the eval harness bundles
 * specs.ts directly.
 *
 * `read.ts` owns the actual documents and asserts at module init that its
 * record keys match this list exactly — add a reference in BOTH places and
 * in scripts/sync-canvas-skills.mjs, or that assertion fails the first
 * test that touches the tools.
 */
export const REFERENCE_NAMES: readonly string[] = [
  'canvas-adapter',
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
