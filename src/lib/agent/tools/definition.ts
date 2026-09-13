import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import type { Database } from '@/types/database'
import type { ToolSpec } from '@/lib/agent/providers/provider'
import type { AgentSearchIndex } from '@/deploymentConfig'
import type { ServiceScope } from '@/lib/agent/tools/serviceScope'

/**
 * A Tool is one module: what it is called, which surface it belongs to, the
 * arguments it takes, where it may run, and what it does. Everything a
 * session derives from a tool — the schema the model receives, the roster it
 * is offered on, the dispatch that runs it — reads this one definition, so
 * a tool is added by writing one and nowhere else.
 *
 * The arguments are a zod schema, and that is the whole reason this shape
 * exists. Before it, the schema a model was shown and the keys a handler
 * read were two string lists in two files that no compiler compared, held
 * together by a script that read both by regex. Here `run` receives the
 * inferred type, a key the schema does not declare is a type error in the
 * handler, and a call that does not fit the schema is refused at the seam
 * with a message that names the argument — instead of an `undefined` that
 * travels on into a write.
 */

type Client = SupabaseClient<Database>

/** Read, interface, write — the three surfaces the canvas adapter states. */
export type ToolSurface = 'read' | 'interface' | 'write'

/**
 * Where a tool may run. `sample`: the no-database trial, where `ctx.client`
 * is null and a read answers from the bundled sample. `mobile`: the mobile
 * shell, which is view-only for every tier.
 *
 * Stated here AND, until the roster derives from definitions, in the name
 * sets the spec table still keeps — as `surface` is. A test holds each
 * definition equal to the sets, so neither statement can drift while both
 * exist; the sets go when the roster reads the definitions.
 */
export type ToolAvailability = {
  sample: boolean
  mobile: boolean
}

/**
 * The canvas, as a tool reaches it. The shells provide this; a tool never
 * imports a bridge, a registry or a store of its own, so a test builds one
 * by hand and a navigation tool runs without a document.
 */
export type ToolUi = {
  openPhase: (phaseId: string) => Promise<string>
  openScenario: (scenarioId: string) => Promise<string>
  focusCell: (cellId: string) => Promise<string>
  openCellPanel: (cellId: string) => Promise<string>
  setSidebar: (collapsed: boolean) => string
  annotateCells: (cellIds: string[], note?: string) => string
  /** The live UI state the shells report, as text; empty when nothing is. */
  uiState: () => string
}

/** The agent session a tool call belongs to, for the ledger's attribution. */
export type ToolSession = {
  id: string
}

/**
 * Everything a tool touches, handed in. A tool that needs the database and
 * gets `null` was offered on a roster it should not have been on — the
 * roster is where availability is enforced, not here.
 */
export type ToolContext = {
  client: Client | null
  /** The service(s) this call covers. */
  scope: ServiceScope
  session: ToolSession
  ui: ToolUi
  /** Ranked search: the index this person's key can embed against, or null. */
  meaning?: { index: AgentSearchIndex; apiKey: string } | null
  /** The run's abort signal, so Stop reaches a call waiting on a network. */
  signal?: AbortSignal
}

export type ToolDefinition<Args extends z.ZodObject = z.ZodObject> = {
  name: string
  description: string
  surface: ToolSurface
  args: Args
  availability: ToolAvailability
  run: (args: z.infer<Args>, ctx: ToolContext) => Promise<string>
}

/** Identity with inference: the one place a definition's shape is checked. */
export function defineTool<Args extends z.ZodObject>(
  definition: ToolDefinition<Args>,
): ToolDefinition<Args> {
  return definition
}

/**
 * The argument shapes the tools share, so the rule each one encodes is
 * written once. `text` is what the dispatcher's `need()` enforced by hand: a
 * required string, and an empty one refused rather than looked up — the
 * schema says so, as `minLength`. `optionalText` is its `s()`: a blank reads
 * as absent. That one stays out of the schema, because it is a courtesy to
 * the caller and not a rule for the model to learn.
 */
export const arg = {
  text: (description: string) => z.string().min(1).describe(description),
  optionalText: (description: string) =>
    z
      .string()
      .describe(description)
      .optional()
      .transform((value) => (value && value.trim() !== '' ? value : undefined)),
  strings: (description: string) => z.array(z.string()).describe(description),
  number: (description: string) => z.number().describe(description),
}

/**
 * The spec the model receives, derived from the definition. Plain JSON
 * Schema of the INPUT side — what a caller sends, before any transform — with
 * no `$schema` and no `additionalProperties` at the root: the provider
 * adapters expect the object shape and nothing else, and one of them strips
 * both anyway.
 */
export function toolSpec(definition: ToolDefinition): ToolSpec {
  const {
    $schema: _schema,
    additionalProperties: _additional,
    ...parameters
  } = z.toJSONSchema(definition.args, { io: 'input' }) as Record<string, unknown>
  return {
    name: definition.name,
    description: definition.description,
    parameters,
  }
}

/**
 * Run one tool call: validate at the seam, then hand the typed arguments to
 * `run`. A call that does not fit is refused with the issues spelled out
 * per argument, which the loop reports to the model as a tool error.
 */
export async function runTool(
  definition: ToolDefinition,
  rawArgs: Record<string, unknown>,
  ctx: ToolContext,
): Promise<string> {
  const parsed = definition.args.safeParse(rawArgs)
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || '(arguments)'}: ${issue.message}`)
      .join('; ')
    throw new Error(`${definition.name}: invalid arguments — ${issues}.`)
  }
  return definition.run(parsed.data, ctx)
}
