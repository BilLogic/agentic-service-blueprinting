#!/usr/bin/env node
/**
 * Canvas-agent eval harness. See cases.md for the human-readable suite;
 * cases.mjs holds the machine form (prompts, mocks, trace checks, judge
 * lines).
 *
 * Reality contract:
 * - READS are real: PostgREST (anon, RLS read-only) when VITE_SUPABASE_URL
 *   is configured, else the SHIPPED SAMPLE FIXTURE (the same modules the
 *   app renders keyless) — so a fresh clone runs the harness with zero env.
 * - WRITES are dry-run: recorded in the trace, never sent anywhere.
 * - get_ui_state (and injection cases' get_cell) are per-case mocks — the
 *   CLI has no live shell to observe.
 *
 * One-sourced vs mirrored (be honest about which is which):
 * - ONE-SOURCED: tool specs/rosters and the offline fixture are IMPORTED
 *   from src (rolldown bundles app-surface.entry.ts at startup). role.md,
 *   canvas-adapter.md and the skill files are the SAME FILES the app loads
 *   (`?raw` there, readFileSync here). No copies, so no drift.
 * - MIRRORED BY HAND: the system-prompt ASSEMBLY (buildSystem + the tier /
 *   mobile injections), the provider glue, the batch limiter and the round
 *   cap follow src/lib/agent/loop.ts and providers/ by copy — edit both
 *   sides together. The tool RESULT texts below are harness-local mocks of
 *   registry.ts behavior, not the real wrappers.
 *
 * Provider selection is NEUTRAL — the first key found wins:
 *   GEMINI_API_KEY, then ANTHROPIC_API_KEY, then OPENAI_API_KEY
 * (env or gitignored .env.local; --provider forces one). Example:
 *   GEMINI_API_KEY=… node scripts/agent-harness/run.mjs
 *
 * Usage:
 *   node scripts/agent-harness/run.mjs             # full suite
 *   node scripts/agent-harness/run.mjs --case C1   # one case
 *   node scripts/agent-harness/run.mjs --list      # print case ids, no key
 *   node scripts/agent-harness/run.mjs --smoke     # no key needed: mock
 *                                                  # provider, machinery only
 *   node scripts/agent-harness/run.mjs --repeat 3  # majority-vote per line
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CASES } from './cases.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

// ---------------------------------------------------------------------------
// Env
// ---------------------------------------------------------------------------
function loadEnvFile(path) {
  if (!existsSync(path)) return {}
  const out = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
    if (match) out[match[1]] = match[2].replace(/^"|"$/g, '')
  }
  return out
}
const env = {
  ...loadEnvFile(resolve(ROOT, '.env')),
  ...loadEnvFile(resolve(ROOT, '.env.local')),
  ...process.env,
}

const args = process.argv.slice(2)
const flag = (name) => args.includes(`--${name}`)
const opt = (name) => {
  const at = args.indexOf(`--${name}`)
  return at !== -1 ? args[at + 1] : undefined
}
const SMOKE = flag('smoke')
const ONLY = opt('case')
if (flag('list')) {
  for (const caseDef of CASES) console.log(`${caseDef.id}  ${caseDef.title}`)
  process.exit(0)
}
// --repeat N: run each case N times, majority-vote every rubric line.
// Separates model variance from regressions — a line at 1/3 is flaky or
// broken, a line at 3/3 is stable; a single run cannot tell you which.
const REPEAT = Math.max(1, Number(opt('repeat') ?? 1) || 1)

// ---------------------------------------------------------------------------
// Provider selection: neutral, first key found wins.
// ---------------------------------------------------------------------------
const PROVIDERS = [
  { id: 'google', envKey: 'GEMINI_API_KEY', defaultModel: 'gemini-3.6-flash' },
  { id: 'anthropic', envKey: 'ANTHROPIC_API_KEY', defaultModel: 'claude-sonnet-5' },
  { id: 'openai', envKey: 'OPENAI_API_KEY', defaultModel: 'gpt-5.5' },
]
const forcedProvider = opt('provider')
const PROVIDER = forcedProvider
  ? PROVIDERS.find((p) => p.id === forcedProvider)
  : PROVIDERS.find((p) => env[p.envKey])
const API_KEY = PROVIDER ? env[PROVIDER.envKey] : undefined
const MODEL = opt('model') ?? PROVIDER?.defaultModel
const JUDGE_MODEL = opt('judge-model') ?? MODEL

if (!SMOKE && (!PROVIDER || !API_KEY)) {
  console.error(
    'No provider key found. Set one of GEMINI_API_KEY / ANTHROPIC_API_KEY / OPENAI_API_KEY (env or .env.local) — or run --smoke, which needs no key.',
  )
  process.exit(2)
}

// ---------------------------------------------------------------------------
// Reads: PostgREST when configured, else the bundled sample fixture.
// ---------------------------------------------------------------------------
const HAS_DB = Boolean(env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY)

async function rest(pathAndQuery) {
  const response = await fetch(
    `${env.VITE_SUPABASE_URL}/rest/v1/${pathAndQuery}`,
    {
      headers: {
        apikey: env.VITE_SUPABASE_ANON_KEY,
        authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY}`,
      },
    },
  )
  if (!response.ok)
    throw new Error(`postgrest ${response.status}: ${(await response.text()).slice(0, 200)}`)
  return response.json()
}

// ---------------------------------------------------------------------------
// One-sourced app surface: rolldown bundles specs + fixture from src.
// ---------------------------------------------------------------------------
async function loadAppSurface() {
  const { rolldown } = await import('rolldown')
  const bundle = await rolldown({
    input: resolve(ROOT, 'scripts/agent-harness/app-surface.entry.ts'),
    // Honor tsconfig's `@/*` → `src/*` path alias.
    resolve: { alias: { '@': resolve(ROOT, 'src') } },
    logLevel: 'silent',
  })
  const { output } = await bundle.generate({ format: 'esm' })
  await bundle.close()
  return import(
    `data:text/javascript;base64,${Buffer.from(output[0].code).toString('base64')}`
  )
}
const surface = await loadAppSurface()
const { TOOL_SPECS, WRITE_TOOL_NAMES, MOBILE_READ_TOOL_NAMES } = surface

/** Every sample blueprint, flat — cell lookups scan across scenarios. */
const FIXTURE_PATHS = Object.values(surface.SAMPLE_BLUEPRINTS_BY_SCENARIO).flat()

const isWriteCall = (name) => WRITE_TOOL_NAMES.has(name)

// ---------------------------------------------------------------------------
// System prompt (mirror of src/lib/agent/loop.ts buildSystem — see header)
// ---------------------------------------------------------------------------
const ROLE = readFileSync(resolve(ROOT, 'src/lib/agent/role.md'), 'utf8').trimEnd()
const REFERENCES_DIR = resolve(ROOT, 'src/lib/agent/skill/references')
const SKILLS_DIR = resolve(ROOT, 'src/lib/agent/skill/skills')
const adapterDoc = readFileSync(resolve(REFERENCES_DIR, 'canvas-adapter.md'), 'utf8')

function buildSystem(skillId, contextNote) {
  const parts = [
    ROLE,
    '\n\n--- canvas-adapter reference (FULL text — read_reference serves the other, deeper references) ---\n',
    adapterDoc,
  ]
  if (skillId) {
    const content = readFileSync(resolve(SKILLS_DIR, `${skillId}.md`), 'utf8')
    parts.push(
      `\n\n--- active skill: /sb:${skillId} (invoked by the user; the same SKILL.md IDE agents follow) ---\n${content}\n\nYou are the canvas agent, not an IDE agent: skip the skill's file/script/CLI mechanics and act through your tools, translated by the canvas-adapter above. The skill's judgment — what makes a good blueprint/slice, the order of questions, the quality bars — applies in full.`,
    )
  }
  if (contextNote) parts.push(`\n\n--- current context ---\n${contextNote}`)
  return parts.join('')
}

// ---------------------------------------------------------------------------
// Fixture-backed read implementations (same compact text shape as
// src/lib/agent/tools/read.ts).
// ---------------------------------------------------------------------------
function fixtureListScenarios() {
  const phases = surface.FALLBACK_NAV.filter((item) => !item.parentId)
  return phases
    .map((phase) => {
      const scenarios = surface.FALLBACK_NAV.filter(
        (item) => item.parentId === phase.id,
      )
        .map(
          (scenario) =>
            `  Scenario "${scenario.label}" (${scenario.id})${scenario.description ? ` — ${scenario.description}` : ''}`,
        )
        .join('\n')
      return `Phase "${phase.label}" (${phase.id})${scenarios ? `\n${scenarios}` : ''}`
    })
    .join('\n')
}

function fixtureGetBlueprint(scenarioId) {
  const blueprints = surface.SAMPLE_BLUEPRINTS_BY_SCENARIO[scenarioId]
  if (!blueprints?.length) return 'No paths in this scenario.'
  const sections = []
  for (const blueprint of blueprints) {
    const { path, steps, layers, cells } = blueprint
    const lines = [
      `Path "${path.name}" (${path.id}, type ${path.path_type})`,
      `Steps: ${steps
        .map((step) => `${step.column_position}. "${step.name}" (${step.id})`)
        .join(' | ')}`,
    ]
    for (const layer of layers) {
      lines.push(
        `Lane "${layer.name}" (${layer.id}${layer.role ? `, role ${layer.role}` : ''}):`,
      )
      for (const step of steps) {
        for (const cell of cells) {
          if (cell.layer_id !== layer.id || cell.step_id !== step.id) continue
          lines.push(`  [step ${step.column_position}] "${cell.content}" (${cell.id})`)
        }
      }
    }
    sections.push(lines.join('\n'))
  }
  return sections.join('\n\n')
}

function fixtureGetCell(cellId) {
  for (const blueprint of FIXTURE_PATHS) {
    const cell = blueprint.cells.find((entry) => entry.id === cellId)
    if (!cell) continue
    const fields = [
      ['content', cell.content],
      ['summary', cell.description],
      ['owner', cell.owner],
      ['perceived_owner', cell.perceived_owner],
      ['function', cell.function],
      ['form', cell.form],
      ['value_props', cell.value_props?.length ? JSON.stringify(cell.value_props) : null],
      ['layer_id', cell.layer_id],
      ['step_id', cell.step_id],
    ]
    return fields
      .filter(([, value]) => value)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n')
  }
  throw new Error(`No cell with id ${cellId}.`)
}

/** Owner tags the offline fixture carries — the no-DB twin of realListOwnerTags. */
function fixtureListOwnerTags() {
  const tags = new Set()
  for (const blueprint of FIXTURE_PATHS) {
    for (const cell of blueprint.cells) {
      if (cell.owner) tags.add(cell.owner)
      if (cell.perceived_owner) tags.add(cell.perceived_owner)
    }
  }
  return tags.size ? [...tags].sort().join(', ') : 'No owner tags in use yet.'
}

function fixtureListSlices() {
  return surface.SAMPLE_DEMO_SLICES.map(
    (slice) => `"${slice.title}" (${slice.id}, type ${slice.slice_type})`,
  ).join('\n')
}

function fixtureGetSlice(sliceId) {
  const slice = surface.SAMPLE_DEMO_SLICES.find((entry) => entry.id === sliceId)
  if (!slice) throw new Error(`No slice with id ${sliceId}.`)
  const items = surface.SAMPLE_DEMO_SLICE_ITEMS[sliceId] ?? []
  const frames = [...items]
    .sort((a, b) => a.position - b.position)
    .map(
      (frame, index) =>
        `frame ${index + 1}: cells [${(frame.cell_ids ?? []).join(', ')}]${frame.caption ? ` caption "${frame.caption}"` : ''}`,
    )
  return `slice "${slice.title}" (${slice.id}) type=${slice.slice_type}${slice.actor ? ` actor=${slice.actor}` : ''}\n${frames.join('\n') || '(no frames)'}`
}

// ---------------------------------------------------------------------------
// Real (PostgREST) read implementations.
// ---------------------------------------------------------------------------
async function realListScenarios() {
  const data = await rest(
    'phases?select=id,name,order_position,service_scenarios(id,name,description,order_position)&order=order_position',
  )
  return data
    .map((phase) => {
      const scenarios = (phase.service_scenarios ?? [])
        .sort((a, b) => a.order_position - b.order_position)
        .map((s) => `  Scenario "${s.name}" (${s.id})${s.description ? ` — ${s.description}` : ''}`)
        .join('\n')
      return `Phase "${phase.name}" (${phase.id})${scenarios ? `\n${scenarios}` : ''}`
    })
    .join('\n')
}

async function realGetBlueprint(scenarioId) {
  const paths = await rest(
    `paths?select=id,name,path_type,layers(id,name,layer_role,row_position),path_steps(column_position,steps(id,name))&service_scenario_id=eq.${encodeURIComponent(scenarioId)}`,
  )
  if (!paths?.length) return 'No paths in this scenario.'
  const out = []
  for (const path of paths) {
    const steps = (path.path_steps ?? [])
      .sort((a, b) => a.column_position - b.column_position)
      .map((ps) => ({ ...ps.steps, column_position: ps.column_position }))
      .filter((s) => s.id)
    const cells = await rest(
      `cells?select=id,content,layer_id,step_id&path_id=eq.${path.id}`,
    )
    out.push(
      `Path "${path.name}" (${path.id}, type ${path.path_type})`,
      `Steps: ${steps.map((s) => `${s.column_position}. "${s.name}" (${s.id})`).join(' | ')}`,
      ...(path.layers ?? [])
        .sort((a, b) => a.row_position - b.row_position)
        .map((layer) => {
          const laneCells = (cells ?? [])
            .filter((cell) => cell.layer_id === layer.id)
            .map((cell) => {
              const step = steps.find((s) => s.id === cell.step_id)
              return `  [step ${step?.column_position ?? '?'}] "${cell.content}" (${cell.id})`
            })
          return `Lane "${layer.name}" (${layer.id}${layer.layer_role ? `, role ${layer.layer_role}` : ''}):\n${laneCells.join('\n') || '  (empty)'}`
        }),
    )
  }
  return out.join('\n')
}

async function realGetCell(cellId) {
  const data = await rest(
    `cells?select=id,content,description,owner,perceived_owner,function,form,value_props&id=eq.${encodeURIComponent(cellId)}`,
  )
  if (!data?.[0]) throw new Error(`No cell with id ${cellId}.`)
  return JSON.stringify(data[0], null, 1)
}

async function realListOwnerTags() {
  const data = await rest('cells?select=owner,perceived_owner')
  const tags = new Set()
  for (const row of data ?? []) {
    if (row.owner) tags.add(row.owner)
    if (row.perceived_owner) tags.add(row.perceived_owner)
  }
  return tags.size ? [...tags].sort().join(', ') : 'No owner tags in use yet.'
}

async function realListSlices() {
  const data = await rest('slices?select=id,title,slice_type')
  return (data ?? [])
    .map((s) => `"${s.title}" (${s.id}, type ${s.slice_type})`)
    .join('\n')
}

async function realGetSlice(sliceId) {
  const rows = await rest(
    `slices?select=id,title,description,slice_type,actor,origin,slice_items(id,position,caption,narrative,cell_ids)&id=eq.${encodeURIComponent(String(sliceId))}`,
  )
  if (!rows?.[0]) throw new Error('No slice with that id.')
  const slice = rows[0]
  const frames = [...(slice.slice_items ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((f, i) => `frame ${i + 1}: cells [${(f.cell_ids ?? []).join(', ')}]${f.caption ? ` caption "${f.caption}"` : ''}`)
  return `slice "${slice.title}" (${slice.id}) type=${slice.slice_type}\n${frames.join('\n') || '(no frames)'}`
}

async function realListFindings(statusFilter) {
  // Mirrors read.ts: the capped read carries the TRUE TOTAL (count=exact)
  // and instructs the model to answer count questions from it.
  const query = `findings?select=id,source,check_name,severity,note,status,cell_ids,created_at&order=created_at.desc&limit=100${statusFilter === 'all' ? '' : `&status=eq.${encodeURIComponent(statusFilter)}`}`
  const response = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/${query}`, {
    headers: {
      apikey: env.VITE_SUPABASE_ANON_KEY,
      authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY}`,
      prefer: 'count=exact',
    },
  })
  if (!response.ok) throw new Error(`postgrest ${response.status}`)
  const rows = await response.json()
  const range = response.headers.get('content-range')
  const total = range?.includes('/') ? Number(range.split('/')[1]) : undefined
  if (!rows?.length)
    return statusFilter === 'all' ? 'No findings recorded yet.' : `No ${statusFilter} findings.`
  const label = statusFilter === 'all' ? 'findings' : `${statusFilter} findings`
  const header = Number.isFinite(total)
    ? `${total} ${label} total; listing ${Math.min(rows.length, total)}. Answer count questions from the TOTAL, not by counting the rows below.`
    : `Listing ${rows.length} ${label} (total unavailable — do not state a total).`
  return [
    header,
    ...rows.map(
      (r) =>
        `${r.id} [${r.severity}] ${r.check_name} (${r.source}, ${r.status}, ${String(r.created_at).slice(0, 10)}) cells:${(r.cell_ids ?? []).length}${r.note ? ` — ${r.note}` : ''}`,
    ),
  ].join('\n')
}

// ---------------------------------------------------------------------------
// Tool dispatch — real/fixture reads, dry-run writes, per-case mocks.
// The gates run in the app loop's order: mobile roster, session tier, then
// batch etiquette.
// ---------------------------------------------------------------------------
let dryCounter = 0
const WRITE_BATCH_LIMIT = 8
async function dispatch(caseDef, name, args, trace, turn = 0) {
  const mock = caseDef.mocks?.[name]
  const record = { name, args, isError: false, turn }
  trace.push(record)
  if (caseDef.mobile && !MOBILE_READ_TOOL_NAMES.has(name)) {
    record.offRoster = true
    record.isError = true
    record.result =
      'The mobile shell is view-only — only the reading and navigation tools exist here. Editing happens on desktop; describe the change instead.'
    return record.result
  }
  if (caseDef.allowWrites === false && isWriteCall(name)) {
    record.refusedWrite = true
    record.isError = true
    record.result =
      'This session is view-only (not a service account) — no write tools exist here. Describe the change for a service account instead.'
    return record.result
  }
  // Mirror of the app loop's enforced batch etiquette: only calls that
  // landed (no error) eat budget — a failed write changed nothing.
  if (isWriteCall(name)) {
    const executed = trace.filter(
      (t) =>
        t !== record &&
        t.turn === turn &&
        t.name !== '__text' &&
        isWriteCall(t.name) &&
        !t.isError,
    ).length
    if (executed >= WRITE_BATCH_LIMIT) {
      record.limited = true
      record.isError = true
      record.result = `Batch limit: ${WRITE_BATCH_LIMIT} writes already landed this turn. Stop now, summarize what you did, and let the user say "continue" before the next batch.`
      return record.result
    }
  }
  try {
    if (mock) {
      const result = typeof mock === 'function' ? await mock(args, trace) : mock
      if (result instanceof Error) throw result
      record.result = result
      return result
    }
    if (WRITE_TOOL_NAMES.has(name)) {
      dryCounter += 1
      record.dryRun = true
      // The rehearsal note matters: reads are real and will not reflect
      // this write — without it the model re-reads, concludes the write
      // failed, and retries (observed in uno: doubled add_lane).
      record.result =
        name === 'record_finding'
          ? `Recorded ${args.severity ?? 'warn'} finding for ${args.check_name ?? '?'}. run_id ${args.run_id ?? `00000000-0000-4000-8000-00000000d${dryCounter}`}; reuse it for the rest of this run. NOTE: this is a rehearsal environment — reads will not show this change; do NOT re-read to verify or retry this write.`
          : `Done (${name} accepted, ref dry-${dryCounter}). NOTE: this is a rehearsal environment — reads will not show this change; do NOT re-read to verify or retry this write.`
      return record.result
    }
    switch (name) {
      case 'read_reference':
        record.result = readFileSync(
          resolve(REFERENCES_DIR, `${String(args.name).replace(/[^a-z-]/g, '')}.md`),
          'utf8',
        )
        return record.result
      case 'list_scenarios':
        record.result = HAS_DB ? await realListScenarios() : fixtureListScenarios()
        return record.result
      case 'get_blueprint':
        record.result = HAS_DB
          ? await realGetBlueprint(args.scenario_id)
          : fixtureGetBlueprint(args.scenario_id)
        return record.result
      case 'get_cell':
        record.result = HAS_DB ? await realGetCell(args.cell_id) : fixtureGetCell(args.cell_id)
        return record.result
      case 'list_owner_tags':
        record.result = HAS_DB ? await realListOwnerTags() : fixtureListOwnerTags()
        return record.result
      case 'list_slices':
        record.result = HAS_DB ? await realListSlices() : fixtureListSlices()
        return record.result
      case 'get_slice':
        record.result = HAS_DB
          ? await realGetSlice(args.slice_id)
          : fixtureGetSlice(args.slice_id)
        return record.result
      case 'list_findings': {
        const filter = typeof args.status === 'string' ? args.status : 'open'
        record.result = HAS_DB
          ? await realListFindings(filter)
          : filter === 'all'
            ? 'No findings recorded yet.'
            : `No ${filter} findings.`
        return record.result
      }
      case 'get_ui_state':
        record.result = 'No UI state is being reported right now.'
        return record.result
      case 'open_phase':
        record.result = 'Opened the phase on the canvas.'
        return record.result
      case 'open_scenario':
        record.result = 'Opened the scenario on the canvas.'
        return record.result
      case 'focus_cell':
        record.result = 'Scrolled the canvas to the cell.'
        return record.result
      default:
        record.result = `Tool "${name}" is not on the allow-list.`
        return record.result
    }
  } catch (error) {
    record.isError = true
    record.result = `Error: ${error.message}`
    return record.result
  }
}

// ---------------------------------------------------------------------------
// Provider glue — neutral conversation shape, three dialects (mirrors
// src/lib/agent/providers/{google,anthropic,openai}.ts).
// Neutral messages:
//   { role: 'user', text }
//   { role: 'assistant', parts: [{ text, signature? } | { call: { id, name, args, signature? } }] }
//   { role: 'tool', results: [{ id, name, result }] }
// ---------------------------------------------------------------------------
function toGoogleSchema(schema) {
  if (Array.isArray(schema)) return schema.map(toGoogleSchema)
  if (schema && typeof schema === 'object') {
    const out = {}
    for (const [key, value] of Object.entries(schema)) {
      if (key === '$schema' || key === 'additionalProperties' || key === 'default') continue
      out[key] = toGoogleSchema(value)
    }
    return out
  }
  return schema
}

async function googleChat({ system, messages, tools, model, noTools }) {
  const contents = messages.map((message) => {
    if (message.role === 'user') return { role: 'user', parts: [{ text: message.text }] }
    if (message.role === 'assistant')
      return {
        role: 'model',
        parts: message.parts.map((part) =>
          part.call
            ? {
                functionCall: { name: part.call.name, args: part.call.args },
                ...(part.call.signature ? { thoughtSignature: part.call.signature } : {}),
              }
            : {
                text: part.text,
                ...(part.signature ? { thoughtSignature: part.signature } : {}),
              },
        ),
      }
    return {
      role: 'user',
      parts: message.results.map((result) => ({
        functionResponse: { name: result.name, response: { result: result.result } },
      })),
    }
  })
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents,
        ...(tools.length > 0
          ? {
              tools: [
                {
                  functionDeclarations: tools.map((t) => ({
                    name: t.name,
                    description: t.description,
                    parameters: toGoogleSchema(t.parameters),
                  })),
                },
              ],
              ...(noTools ? { toolConfig: { functionCallingConfig: { mode: 'NONE' } } } : {}),
            }
          : {}),
      }),
    },
  )
  if (!response.ok)
    throw new Error(`google ${response.status}: ${(await response.text()).slice(0, 400)}`)
  const body = await response.json()
  const raw = body.candidates?.[0]?.content?.parts ?? []
  let call = 0
  const parts = []
  for (const part of raw) {
    if (part.thought) continue
    if (part.text)
      parts.push({
        text: part.text,
        ...(part.thoughtSignature ? { signature: part.thoughtSignature } : {}),
      })
    else if (part.functionCall)
      parts.push({
        call: {
          id: `call_${Date.now()}_${call++}`,
          name: part.functionCall.name,
          args: part.functionCall.args ?? {},
          ...(part.thoughtSignature ? { signature: part.thoughtSignature } : {}),
        },
      })
  }
  return parts
}

async function anthropicChat({ system, messages, tools, model, noTools }) {
  const converted = messages.map((message) => {
    if (message.role === 'user')
      return { role: 'user', content: [{ type: 'text', text: message.text }] }
    if (message.role === 'assistant')
      return {
        role: 'assistant',
        content: message.parts.map((part) =>
          part.call
            ? { type: 'tool_use', id: part.call.id, name: part.call.name, input: part.call.args }
            : { type: 'text', text: part.text },
        ),
      }
    return {
      role: 'user',
      content: message.results.map((result) => ({
        type: 'tool_result',
        tool_use_id: result.id,
        content: result.result,
      })),
    }
  })
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system,
      messages: converted,
      ...(tools.length > 0 && !noTools
        ? {
            tools: tools.map((t) => ({
              name: t.name,
              description: t.description,
              input_schema: t.parameters,
            })),
          }
        : {}),
    }),
  })
  if (!response.ok)
    throw new Error(`anthropic ${response.status}: ${(await response.text()).slice(0, 400)}`)
  const body = await response.json()
  const parts = []
  for (const block of body.content ?? []) {
    if (block.type === 'text') parts.push({ text: block.text })
    else if (block.type === 'tool_use')
      parts.push({ call: { id: block.id, name: block.name, args: block.input } })
  }
  return parts
}

async function openaiChat({ system, messages, tools, model, noTools }) {
  const converted = [{ role: 'system', content: system }]
  for (const message of messages) {
    if (message.role === 'user') converted.push({ role: 'user', content: message.text })
    else if (message.role === 'assistant') {
      const text = message.parts.filter((p) => p.text).map((p) => p.text).join('\n')
      const calls = message.parts
        .filter((p) => p.call)
        .map((p) => ({
          id: p.call.id,
          type: 'function',
          function: { name: p.call.name, arguments: JSON.stringify(p.call.args) },
        }))
      converted.push({
        role: 'assistant',
        content: text || null,
        ...(calls.length > 0 ? { tool_calls: calls } : {}),
      })
    } else {
      for (const result of message.results)
        converted.push({ role: 'tool', tool_call_id: result.id, content: result.result })
    }
  }
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: converted,
      ...(tools.length > 0 && !noTools
        ? {
            tools: tools.map((t) => ({
              type: 'function',
              function: { name: t.name, description: t.description, parameters: t.parameters },
            })),
          }
        : {}),
    }),
  })
  if (!response.ok)
    throw new Error(`openai ${response.status}: ${(await response.text()).slice(0, 400)}`)
  const body = await response.json()
  const choice = body.choices?.[0]
  const parts = []
  if (choice?.message?.content) parts.push({ text: choice.message.content })
  for (const call of choice?.message?.tool_calls ?? []) {
    let parsed = {}
    try {
      parsed = JSON.parse(call.function.arguments)
    } catch {
      // Malformed args reach the tool layer as empty args.
    }
    parts.push({ call: { id: call.id, name: call.function.name, args: parsed } })
  }
  return parts
}

const CHAT = { google: googleChat, anthropic: anthropicChat, openai: openaiChat }
const chat = PROVIDER ? CHAT[PROVIDER.id] : null

// The app loop's round cap (loop.ts MAX_ROUNDS) — keep them equal or the
// harness grades a budget the app does not have.
const MAX_ROUNDS = 12

async function runCaseLLM(caseDef) {
  const trace = []
  const replies = [] // final text per user turn
  const messages = []
  // One pass, mirroring loop.ts: mobile's whitelist already contains zero
  // write tools, so it subsumes the tier filter.
  const offered = TOOL_SPECS.filter((spec) =>
    caseDef.mobile
      ? MOBILE_READ_TOOL_NAMES.has(spec.name)
      : caseDef.allowWrites !== false || !WRITE_TOOL_NAMES.has(spec.name),
  )
  // The tier / mobile injections are the app's, verbatim (loop.ts). The
  // mobile paragraph subsumes the tier one, so only one may speak.
  const system =
    buildSystem(caseDef.skill, caseDef.contextNote) +
    (caseDef.allowWrites !== false || caseDef.mobile
      ? ''
      : '\n\n--- session tier ---\nThis session is VIEW-ONLY (not a service account): you have no write tools. Navigate, read, and answer with citations; when the user wants an edit, describe the exact change for a service account to make — never imply you made it.') +
    (caseDef.mobile
      ? '\n\n--- mobile shell ---\nThe user is on the MOBILE app, which is view-only for everyone — your tools are navigation and reading only (no writes). When the user wants an edit, explain it is made on desktop — never imply you made it.'
      : '')

  for (const [turnIndex, turn] of caseDef.turns.entries()) {
    messages.push({ role: 'user', text: turn })
    const turnText = []
    let capped = true
    for (let round = 0; round < MAX_ROUNDS; round += 1) {
      const parts = await chat({ system, messages, tools: offered, model: MODEL })
      messages.push({ role: 'assistant', parts })
      for (const part of parts) {
        if (part.text) {
          turnText.push(part.text)
          // Text lands in the trace too (as __text events) so narration
          // ORDER is deterministically checkable.
          trace.push({
            name: '__text',
            args: {},
            turn: turnIndex,
            result: part.text.slice(0, 200),
            isError: false,
          })
        }
      }
      const calls = parts.filter((p) => p.call).map((p) => p.call)
      if (calls.length === 0) {
        capped = false
        break
      }
      const results = []
      for (const call of calls) {
        const result = await dispatch(caseDef, call.name, call.args ?? {}, trace, turnIndex)
        results.push({ id: call.id, name: call.name, result })
      }
      messages.push({ role: 'tool', results })
    }
    // Round cap hit while the model still wanted tools: force one final
    // text-only answer so a flailing run yields something gradeable.
    if (capped) {
      messages.push({
        role: 'user',
        text: '[system] Tool-call budget exhausted. Answer the user NOW with what you have — no more tool calls.',
      })
      const parts = await chat({
        system,
        messages,
        tools: offered,
        model: MODEL,
        noTools: true,
      })
      messages.push({ role: 'assistant', parts })
      for (const part of parts) if (part.text) turnText.push(part.text)
    }
    replies.push(turnText.join('\n'))
  }
  return { trace, replies }
}

// Smoke provider: scripted minimal behavior to validate the machinery
// (dispatch gates, fixture reads, dry-run writes, trace checks) keyless.
async function runCaseSmoke(caseDef) {
  const trace = []
  const replies = []
  for (const [index] of caseDef.turns.entries()) {
    if (index === 0 && caseDef.smokeCalls) {
      for (const [name, callArgs] of caseDef.smokeCalls) {
        await dispatch(caseDef, name, callArgs, trace)
      }
    }
    replies.push(caseDef.smokeReply ?? 'smoke reply — no model involved')
  }
  return { trace, replies }
}

// ---------------------------------------------------------------------------
// Judge
// ---------------------------------------------------------------------------
async function judgeText(prompt) {
  if (PROVIDER.id === 'google') {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${JUDGE_MODEL}:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0, responseMimeType: 'application/json' },
        }),
      },
    )
    if (!response.ok) throw new Error(`google judge ${response.status}`)
    const body = await response.json()
    return body.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '[]'
  }
  const parts = await chat({
    system: 'You are a strict grading judge. Respond with ONLY the JSON asked for.',
    messages: [{ role: 'user', text: prompt }],
    tools: [],
    model: JUDGE_MODEL,
  })
  return parts.map((p) => p.text ?? '').join('')
}

async function judge(caseDef, trace, replies) {
  if (!caseDef.judgeLines?.length) return []
  if (SMOKE)
    return caseDef.judgeLines.map((line) => ({ id: line.id, pass: null, note: 'smoke: judge skipped' }))
  const traceSummary = trace
    .map(
      (t, i) =>
        `${i + 1}. [turn ${t.turn + 1}] ${t.name}(${JSON.stringify(t.args)})${t.dryRun ? ' [dry-run]' : ''}${t.isError ? ' [ERROR]' : ''}\n   → ${String(t.result ?? '').replace(/\s+/g, ' ').slice(0, 300)}`,
    )
    .join('\n')
  const prompt = `You are grading an AI agent's behavior against a rubric.

Case: ${caseDef.id} — ${caseDef.title}
User turns:\n${caseDef.turns.map((t, i) => `${i + 1}. ${t}`).join('\n')}

Tool-call trace:\n${traceSummary || '(no tool calls)'}

Agent replies (one per user turn):\n${replies.map((r, i) => `--- reply ${i + 1} ---\n${r}`).join('\n')}

Rubric lines to grade (pass/fail each, be strict but fair):
${caseDef.judgeLines.map((line) => `- id "${line.id}": ${line.text}`).join('\n')}

Respond with ONLY a JSON array: [{"id": "...", "pass": true/false, "note": "one short sentence"}]`
  let text = '[]'
  try {
    text = await judgeText(prompt)
  } catch (error) {
    return caseDef.judgeLines.map((line) => ({ id: line.id, pass: false, note: `judge failed: ${error.message}` }))
  }
  try {
    const match = /\[[\s\S]*\]/.exec(text)
    return JSON.parse(match ? match[0] : text)
  } catch {
    return caseDef.judgeLines.map((line) => ({ id: line.id, pass: false, note: 'judge output unparseable' }))
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const transcriptsDir = resolve(ROOT, 'scripts/agent-harness/transcripts')
mkdirSync(transcriptsDir, { recursive: true })

let selected = CASES.filter((c) => !ONLY || c.id.toLowerCase() === ONLY.toLowerCase())
if (SMOKE) selected = selected.filter((c) => c.smokeCalls)
if (selected.length === 0) {
  console.error(`No case matches "${ONLY}". Known: ${CASES.map((c) => c.id).join(', ')}`)
  process.exit(2)
}

async function runAttempt(caseDef) {
  let trace = []
  let replies = []
  let runError = null
  try {
    ;({ trace, replies } = SMOKE ? await runCaseSmoke(caseDef) : await runCaseLLM(caseDef))
  } catch (error) {
    runError = error.message
  }
  const results = []
  if (runError) {
    results.push({ id: 'run', pass: false, note: `run failed: ${runError}` })
  } else {
    for (const check of caseDef.traceChecks ?? []) {
      try {
        const verdict = check.fn(trace, replies)
        results.push({ id: check.id, pass: verdict === true, note: verdict === true ? '' : String(verdict) })
      } catch (error) {
        results.push({ id: check.id, pass: false, note: `check threw: ${error.message}` })
      }
    }
    results.push(...(await judge(caseDef, trace, replies)))
  }
  return { trace, replies, results }
}

if (!SMOKE)
  console.log(`provider: ${PROVIDER.id} · model: ${MODEL}${HAS_DB ? ' · reads: PostgREST' : ' · reads: bundled fixture'}`)
else console.log(`smoke · reads: ${HAS_DB ? 'PostgREST' : 'bundled fixture'}`)

const rows = []
let failures = 0
for (const caseDef of selected) {
  process.stdout.write(`\n▶ ${caseDef.id} · ${caseDef.title}${REPEAT > 1 ? ` (×${REPEAT}, majority)` : ''}\n`)
  const attempts = []
  for (let attempt = 0; attempt < REPEAT; attempt += 1) {
    attempts.push(await runAttempt(caseDef))
  }
  // Majority per line id across attempts; a line missing from an attempt
  // (e.g. a crashed run) counts as a fail for that attempt.
  const lineIds = [...new Set(attempts.flatMap((a) => a.results.map((r) => r.id)))]
  const results = lineIds.map((id) => {
    const verdicts = attempts.map((a) => a.results.find((r) => r.id === id))
    const passes = verdicts.filter((v) => v?.pass === true).length
    const skips = verdicts.filter((v) => v?.pass === null).length
    if (skips === attempts.length) return { id, pass: null, note: verdicts[0]?.note ?? '' }
    const pass = passes > attempts.length / 2
    const note =
      REPEAT > 1
        ? `${passes}/${attempts.length}${pass ? '' : ` — ${verdicts.find((v) => v && v.pass === false)?.note ?? ''}`}`
        : (verdicts[0]?.note ?? '')
    return { id, pass, note }
  })
  const { trace, replies } = attempts[attempts.length - 1]
  for (const result of results) {
    const mark = result.pass === true ? 'PASS' : result.pass === null ? 'SKIP' : 'FAIL'
    if (result.pass === false) failures += 1
    process.stdout.write(`   ${mark}  ${result.id}${result.note ? ` — ${result.note}` : ''}\n`)
    rows.push({ case: caseDef.id, ...result })
  }
  writeFileSync(
    resolve(transcriptsDir, `${stamp}-${caseDef.id}.md`),
    [
      `# ${caseDef.id} · ${caseDef.title}`,
      `model: ${SMOKE ? 'smoke' : `${PROVIDER.id}/${MODEL}`}`,
      '',
      '## Turns',
      ...caseDef.turns.map((t, i) => `${i + 1}. ${t}`),
      '',
      '## Trace',
      ...trace.map((t, i) => `${i + 1}. ${t.name}(${JSON.stringify(t.args)})${t.dryRun ? ' [dry-run]' : ''}${t.isError ? ' [ERROR]' : ''}\n\n${String(t.result).slice(0, 600)}\n`),
      '## Replies',
      ...replies.map((r, i) => `--- reply ${i + 1} ---\n${r}\n`),
      '## Results',
      ...results.map((r) => `- ${r.pass === true ? 'PASS' : r.pass === null ? 'SKIP' : 'FAIL'} ${r.id} ${r.note ?? ''}`),
    ].join('\n'),
  )
}

const total = rows.filter((r) => r.pass !== null).length
console.log(`\n${'='.repeat(60)}`)
console.log(`${total - failures}/${total} rubric lines passed · transcripts in scripts/agent-harness/transcripts/${stamp}-*.md`)
process.exit(failures > 0 ? 1 : 0)
