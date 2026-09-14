import type { ToolDefinition } from '@/lib/agent/tools/definition'
import { TEMPLATE_REFERENCE_DOCS } from '@/lib/agent/tools/referenceDocs'
import { REFERENCE_NAMES } from '@/lib/agent/tools/referenceNames'

/**
 * The rulebook as the agent is served it: the template's own documents with
 * the deployment's laid over them, read when a document is served and not
 * before. A deployment supplies its documents through
 * `DeploymentConfig.agent.references`, which the config provider hands here
 * at boot the way it hands the roster its allowlist — no import-order rule,
 * no registry that freezes on first read.
 *
 * A key the template already serves REPLACES that document and adds no
 * name; a key it does not is an additional reference, named right after the
 * canvas adapter so a model reads the deployment's own account early.
 */

let deployment: Record<string, string> = {}

export function configureAgentReferences(next: Record<string, string> | undefined): void {
  deployment = next ? { ...next } : {}
}

/**
 * The one document that is rendered rather than served as written, and the
 * one a model is not told to fetch: it is in every system prompt already.
 */
const ADAPTER = 'canvas-adapter'

/** The names `get_reference` accepts, in the order a model is told them. */
export function referenceNames(): string[] {
  const own = Object.keys(deployment).filter((name) => !REFERENCE_NAMES.includes(name))
  const rest = REFERENCE_NAMES.filter((name) => name !== ADAPTER)
  return [ADAPTER, ...own, ...rest]
}

/** The names a model is told to read with `get_reference`. */
export function fetchableReferenceNames(): string[] {
  return referenceNames().filter((name) => name !== ADAPTER)
}

/**
 * The placeholders in the canvas adapter's two surface rows, filled from the
 * roster the reader holds. The document keeps its prose as a static file;
 * the lists are the session's, so a deployment that narrows its roster
 * narrows what its agent is told it can call, and no check has to hold a
 * hand-written list to the tools.
 */
export const READ_TOOLS_PLACEHOLDER = '{{read_tools}}'
export const WRITE_TOOLS_PLACEHOLDER = '{{write_tools}}'

export function renderCanvasAdapter(
  doc: string,
  roster: readonly Pick<ToolDefinition, 'name' | 'surface'>[],
): string {
  // A surface with nothing on it says so in words: a viewer's adapter reads
  // "call write tools: none in this session", not a blank before the dash.
  const onSurface = (surface: ToolDefinition['surface']) => {
    const names = roster.filter((tool) => tool.surface === surface).map((tool) => `\`${tool.name}\``)
    return names.length > 0 ? names.join(', ') : 'none in this session'
  }
  return doc
    .replaceAll(READ_TOOLS_PLACEHOLDER, onSurface('read'))
    .replaceAll(WRITE_TOOLS_PLACEHOLDER, onSurface('write'))
}

/**
 * One document by bare name, or the available list for a name that is none.
 * The canvas adapter is rendered against the roster it is read with; every
 * other document is served as written.
 */
export function readReference(
  name: string,
  roster: readonly Pick<ToolDefinition, 'name' | 'surface'>[],
): string {
  // Own keys only: a name a model sends is not a lookup into Object's
  // prototype, and the deployment's document wins where both have one.
  const doc = Object.hasOwn(deployment, name)
    ? deployment[name]
    : Object.hasOwn(TEMPLATE_REFERENCE_DOCS, name)
      ? TEMPLATE_REFERENCE_DOCS[name]
      : undefined
  if (doc === undefined) return `Unknown reference "${name}". Available: ${referenceNames().join(', ')}`
  return name === ADAPTER ? renderCanvasAdapter(doc, roster) : doc
}

export function listReferences(): string {
  return referenceNames()
    .map((name) => `- ${name}`)
    .join('\n')
}

/**
 * The template's record and its published name list are two files: the
 * names are a leaf the identifier manifest reads as text and the harness
 * bundles without a Vite loader. They are held equal here, at module init,
 * before any test that touches the tools can get further.
 */
{
  const here = Object.keys(TEMPLATE_REFERENCE_DOCS).sort().join(',')
  const published = [...REFERENCE_NAMES].sort().join(',')
  if (here !== published)
    throw new Error(
      'TEMPLATE_REFERENCE_DOCS (referenceDocs.ts) and REFERENCE_NAMES (referenceNames.ts) drifted — add the reference to both.',
    )
}
