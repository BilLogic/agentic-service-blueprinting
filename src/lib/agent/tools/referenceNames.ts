/**
 * The template's reference-doc vocabulary, as a LEAF module: it imports
 * nothing, so the identifier manifest reads it as text and the eval harness
 * bundles it without a Vite loader.
 *
 * `referenceDocs.ts` owns the actual documents, and `references.ts` asserts
 * at module init that its record keys match this list exactly — add a
 * reference in both places or that assertion fails the first test that
 * touches the tools. A deployment's own documents are not here: they arrive
 * through `agent.references` on its config, and `references.ts` names them
 * after the canvas adapter when it lists the vocabulary.
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
