import canvasAdapter from '@/lib/agent/skill/references/canvas-adapter.md?raw'
import dataModel from '@/lib/agent/skill/references/data-model.md?raw'
import elicitationProtocol from '@/lib/agent/skill/references/elicitation-protocol.md?raw'
import cocreatePlaybook from '@/lib/agent/skill/references/cocreate-playbook.md?raw'
import laneVocabulary from '@/lib/agent/skill/references/lane-vocabulary.md?raw'
import laneRoles from '@/lib/agent/skill/references/lane-roles.md?raw'
import auditPlaybook from '@/lib/agent/skill/references/audit-playbook.md?raw'
import whatifPlaybook from '@/lib/agent/skill/references/whatif-playbook.md?raw'
import checkGapSweep from '@/lib/agent/skill/references/check-gap-sweep.md?raw'
import checkJargonLint from '@/lib/agent/skill/references/check-jargon-lint.md?raw'
import checkChannelConflict from '@/lib/agent/skill/references/check-channel-conflict.md?raw'
import checkKpiAlignment from '@/lib/agent/skill/references/check-kpi-alignment.md?raw'
import checkPerceivedOwner from '@/lib/agent/skill/references/check-perceived-owner.md?raw'
import checkValueLedger from '@/lib/agent/skill/references/check-value-ledger.md?raw'
import checkFeeVisibility from '@/lib/agent/skill/references/check-fee-visibility.md?raw'
import checkObsoleteSource from '@/lib/agent/skill/references/check-obsolete-source.md?raw'
import slicePlaybook from '@/lib/agent/skill/references/slice-playbook.md?raw'
import sliceTemplates from '@/lib/agent/skill/references/slice-templates.md?raw'

import { registeredReferenceDocs } from '@/lib/agent/tools/referenceRegistry'

/**
 * WHERE the rulebook's documents come from — a FORK SEAM for an app that
 * COPIES this template, and the place a deployment's own documents are folded in.
 *
 * `read.ts` serves these under bare names, and is meant to be identical in
 * both. It cannot be while it also names the paths: this repo is the
 * rulebook's home and VENDORS its own copies (`scripts/sync-canvas-skills.mjs`
 * mirrors the shared `references` tree and each skill's own into
 * `src/lib/agent/skill/references`, flat, because `read_reference` serves
 * files by bare name), while an app that installs this repo as a package
 * imports the same documents by package path. Those two specifier families
 * can never be the same string. So the specifiers live here, alone, and every
 * module above this one imports a record with the same shape from the same
 * path either way.
 *
 * An adopting app may also serve documents this template has none of, and may
 * override one of these with a copy of its own — its registry differs, so a
 * rulebook that enumerates tool names cannot always be shared. An app that
 * copies this repo puts both in this file and in `referenceNamesExtra.ts`,
 * which is what lets the shared name list stay shared. A DEPLOYMENT that
 * mounts the package cannot edit either, and does not need to: it hands its
 * documents to `registerReferenceDocs` before it imports the app, and they are
 * merged over the template's below. A generated agent account is that case — the
 * generator lives here, the document is the deployment's, and this loader
 * imports no deployment file by path. Read `referenceRegistry.ts` for the
 * ordering rule and why that call is not a `DeploymentConfig` field.
 *
 * Adding a reference means four edits: the source file plus its row in
 * `scripts/sync-canvas-skills.mjs`, the import and the row here, the name in
 * `referenceNames.ts`, and the published path in
 * `scripts/check-reference-paths.mjs` (ADR 0004 — those paths are an
 * interface consumers import by name). `read.ts` throws at module init if the
 * record and the name list disagree.
 */
const TEMPLATE_REFERENCE_DOCS: Record<string, string> = {
  'canvas-adapter': canvasAdapter,
  'lane-roles': laneRoles,
  'lane-vocabulary': laneVocabulary,
  'elicitation-protocol': elicitationProtocol,
  'cocreate-playbook': cocreatePlaybook,
  'data-model': dataModel,
  'audit-playbook': auditPlaybook,
  'whatif-playbook': whatifPlaybook,
  'check-gap-sweep': checkGapSweep,
  'check-jargon-lint': checkJargonLint,
  'check-channel-conflict': checkChannelConflict,
  'check-kpi-alignment': checkKpiAlignment,
  'check-perceived-owner': checkPerceivedOwner,
  'check-value-ledger': checkValueLedger,
  'check-fee-visibility': checkFeeVisibility,
  'check-obsolete-source': checkObsoleteSource,
  'slice-playbook': slicePlaybook,
  'slice-templates': sliceTemplates,
}

/**
 * What `read.ts` serves: this template's own documents, with a deployment's
 * registered ones merged over them. Standalone the registry is empty and this
 * IS `TEMPLATE_REFERENCE_DOCS`. Built once, while this module evaluates, which
 * is the whole reason registration has to precede the app's import.
 */
export const REFERENCE_DOCS: Record<string, string> = {
  ...TEMPLATE_REFERENCE_DOCS,
  ...registeredReferenceDocs(),
}
