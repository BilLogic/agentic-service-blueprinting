import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { TOOL_SPECS } from '@/lib/agent/tools/specs'
import { TOOL_DEFINITIONS } from '@/lib/agent/tools/definitions'
import { configureAgentReferences, readReference } from '@/lib/agent/tools/references'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import {
  resolveServiceScope,
  scopeOf,
  serviceStakeholderIds,
} from '@/lib/agent/tools/serviceScope'
import { runTool } from '@/lib/agent/tools/definition'
import { listBlueprintTool } from '@/lib/agent/tools/definitions/blueprint'
import { listEvidenceTool } from '@/lib/agent/tools/definitions/evidence'
import { listFindingsTool } from '@/lib/agent/tools/definitions/findings'
import { getBusinessModelTool } from '@/lib/agent/tools/definitions/service'
import { listSlicesTool } from '@/lib/agent/tools/definitions/slices'
import { fakeToolContext } from '@/lib/agent/tools/definitions/testContext'
import { dispatchTool } from '@/lib/agent/tools/registry'
import { setActiveService } from '@/contexts/activeService'

/*
 * The scope seam. A session is handed its scope — the active service, the
 * same default the interface has — and a read covers that service unless the
 * call names another or says `all`; a single-service deployment collapses
 * every scope to the same set. The multi-service default is asserted on a
 * two-service fixture, at the resolver and through a read tool's `run`,
 * because it is the case a single-service short-circuit hides. The catalog
 * helpers assert the OTHER half of the decision that a service owns its
 * journey and shares the catalog — that a service's cast is derived by JOIN
 * through its journey, never a `service_id` on the catalog.
 */

type Rec = { table: string; filters: Array<[string, ...unknown[]]>; select?: string }

/**
 * A minimal query-recording client. `resolve` answers each `.from(table)…`
 * chain from the accumulated record; `log` captures every query so a test can
 * assert which tables were (and were not) touched.
 */
function fakeClient(
  resolve: (rec: Rec) => { data: unknown; error: unknown },
  log: Rec[] = [],
): SupabaseClient<Database> {
  function builder(table: string) {
    const rec: Rec = { table, filters: [] }
    const b = {
      select(sel: string) {
        rec.select = sel
        return b
      },
      eq(...a: unknown[]) {
        rec.filters.push(['eq', ...a])
        return b
      },
      in(...a: unknown[]) {
        rec.filters.push(['in', ...a])
        return b
      },
      not(...a: unknown[]) {
        rec.filters.push(['not', ...a])
        return b
      },
      order() {
        return b
      },
      limit() {
        return b
      },
      maybeSingle() {
        return b
      },
      range() {
        return b
      },
      contains(...a: unknown[]) {
        rec.filters.push(['contains', ...a])
        return b
      },
      then(onF: (v: unknown) => unknown, onR?: (e: unknown) => unknown) {
        log.push(rec)
        return Promise.resolve(resolve(rec)).then(onF, onR)
      },
    }
    return b
  }
  return { from: (t: string) => builder(t) } as unknown as SupabaseClient<Database>
}

const TWO = [
  { id: 'svc-support', name: 'Support Desk', slug: 'support-desk', created_at: '2026-01-01' },
  { id: 'svc-sales', name: 'Sales Pipeline', slug: 'sales-pipeline', created_at: '2026-02-01' },
]

const servicesClient = (rows: unknown[], log: Rec[] = []) =>
  fakeClient((rec) => (rec.table === 'services' ? { data: rows, error: null } : { data: [], error: null }), log)

/** The session's scope when the board draws Sales Pipeline. */
const ON_SALES = scopeOf({ id: 'svc-sales', slug: 'sales-pipeline', name: 'Sales Pipeline' })

describe('resolveServiceScope', () => {
  it('collapses to `all` on a single-service deployment, whatever the filter', async () => {
    const one = [TWO[0]]
    await expect(resolveServiceScope(servicesClient(one), {})).resolves.toEqual({
      kind: 'all',
    })
    // Even an explicit single-service name resolves to `all`: with one service
    // every scope is the same set, so the machinery is skipped entirely.
    await expect(
      resolveServiceScope(servicesClient(one), { serviceArg: 'Support Desk' }),
    ).resolves.toEqual({ kind: 'all' })
  })

  it("is the session's scope — the active service — when the call names none", async () => {
    // The case a single-service short-circuit hides: with two services and
    // no filter, a read is confined to the one the board draws.
    await expect(resolveServiceScope(servicesClient(TWO), { active: ON_SALES })).resolves.toEqual(
      ON_SALES,
    )
  })

  it('is refused when the session has no service — an unresolved slug, a bare script — unless the call names one', async () => {
    await expect(resolveServiceScope(servicesClient(TWO), {})).rejects.toThrow(/No service is active/)
    await expect(resolveServiceScope(servicesClient(TWO), { active: null })).rejects.toThrow(
      /No service is active/,
    )
    await expect(
      resolveServiceScope(servicesClient(TWO), { serviceArg: 'all', active: null }),
    ).resolves.toEqual({ kind: 'all' })
    // One service: nothing to be confused about, so nothing to refuse.
    await expect(resolveServiceScope(servicesClient([TWO[0]]), { active: null })).resolves.toEqual({
      kind: 'all',
    })
  })

  it('a filter moves the read to another named service, and "all" widens past the active one', async () => {
    // The board draws sales, but the filter names support — the filter decides.
    await expect(
      resolveServiceScope(servicesClient(TWO), { serviceArg: 'Support Desk', active: ON_SALES }),
    ).resolves.toEqual({ kind: 'service', serviceId: 'svc-support', serviceName: 'Support Desk' })
    // by slug, too
    await expect(
      resolveServiceScope(servicesClient(TWO), { serviceArg: 'support-desk', active: ON_SALES }),
    ).resolves.toEqual({ kind: 'service', serviceId: 'svc-support', serviceName: 'Support Desk' })
    // "all" is the deployment said out loud, past whatever is active
    await expect(
      resolveServiceScope(servicesClient(TWO), { serviceArg: 'all', active: ON_SALES }),
    ).resolves.toEqual({ kind: 'all' })
  })

  it('throws with the real service names when the filter names none of them', async () => {
    await expect(
      resolveServiceScope(servicesClient(TWO), { serviceArg: 'Billing' }),
    ).rejects.toThrow(/Support Desk, Sales Pipeline/)
  })
})

/*
 * A read, through its own `run`, under the scope its session was handed:
 * confined to that service with no `service` argument, spanning the
 * deployment with the explicit one. Asserted on the filter the read sends,
 * because that is what the database sees.
 */
describe('a read tool under the session scope', () => {
  const phasesFilters = (log: Rec[]) =>
    log
      .filter((rec) => rec.table === 'phases')
      .flatMap((rec) => rec.filters.filter(([, column]) => column === 'service_id').map(([, , value]) => value))

  it('with no scope argument is confined to ctx.scope', async () => {
    const log: Rec[] = []
    const client = servicesClient(TWO, log)
    await runTool(listBlueprintTool, { granularity: ['phase'] }, fakeToolContext({ client, scope: ON_SALES }))
    expect(phasesFilters(log)).toEqual(['svc-sales'])
  })

  it('with the explicit deployment scope spans every service', async () => {
    const log: Rec[] = []
    const client = servicesClient(TWO, log)
    await runTool(
      listBlueprintTool,
      { granularity: ['phase'], service: 'all' },
      fakeToolContext({ client, scope: ON_SALES }),
    )
    expect(log.some((rec) => rec.table === 'phases')).toBe(true)
    expect(phasesFilters(log)).toEqual([])
  })

  it('through the dispatcher, the scope is the store\'s service — and none is refused, not widened', async () => {
    const log: Rec[] = []
    const client = servicesClient(TWO, log)
    setActiveService({ id: 'svc-sales', slug: 'sales-pipeline', name: 'Sales Pipeline' })
    try {
      await dispatchTool(client, 'session', 'list_blueprint', { granularity: ['phase'] })
      expect(phasesFilters(log)).toEqual(['svc-sales'])
      setActiveService(null)
      await expect(
        dispatchTool(client, 'session', 'list_blueprint', { granularity: ['phase'] }),
      ).rejects.toThrow(/No service is active/)
      await expect(dispatchTool(client, 'session', 'list_slices', {})).rejects.toThrow(
        /No service is active/,
      )
    } finally {
      setActiveService(null)
    }
  })

  it('the reads with no service argument of their own are confined to the scope by column', async () => {
    const filtersOf = (log: Rec[], table: string) =>
      log
        .filter((rec) => rec.table === table)
        .flatMap((rec) => rec.filters.filter(([, column]) => column === 'service_id').map(([, , value]) => value))
    const log: Rec[] = []
    const client = fakeClient(() => ({ data: [], error: null }), log)
    const ctx = fakeToolContext({ client, scope: ON_SALES })
    await runTool(listSlicesTool, {}, ctx)
    await runTool(listFindingsTool, {}, ctx)
    await runTool(listEvidenceTool, {}, ctx)
    await runTool(getBusinessModelTool, {}, ctx)
    for (const table of ['slices', 'audit_findings', 'evidence', 'business_models'])
      expect(filtersOf(log, table), table).toEqual(['svc-sales'])
  })
})

/*
 * What the agent is TOLD about an omitted service, held to what an omitted
 * service DOES. The two drifted once already: the resolver read every service
 * while the rulebook said an unnamed read stayed on the service on screen, so
 * a model that trusted the words believed a whole-deployment answer covered
 * only the board in front of the human. The default has since become the
 * active service, and the words moved with it.
 */
describe('the words about an omitted service match the behaviour', () => {
  const ACTIVE_SERVICE = /omitting it reads the active service/i
  // The old claim, in any of its spellings: every service as the default.
  const EVERY_SERVICE_DEFAULT =
    /omitting it searches every service|cover every service[^.|]*when it is omitted|every service by default|covers every service/i

  const takesService = (spec: (typeof TOOL_SPECS)[number]) =>
    Object.keys(spec.parameters.properties ?? {}).includes('service')

  const scoped = TOOL_SPECS.filter(takesService)

  /**
   * The adapter's service row, and every way it disagrees with the tools that
   * take `service`. Empty is agreement.
   */
  function serviceRowProblems(adapter: string, toolNames: readonly string[]): string[] {
    const row = adapter
      .split('\n')
      .find((line) => line.startsWith('| Work across several services'))
    if (!row) return ['the adapter has no "| Work across several services" row']
    return [
      ...(/read the active service when it is omitted/i.test(row)
        ? []
        : ['the row does not say an omitted service is the active one']),
      ...(EVERY_SERVICE_DEFAULT.test(row) ? ['the row says an omitted service is every service'] : []),
      ...toolNames
        .filter((name) => !row.includes(`\`${name}\``))
        .map((name) => `the row does not name \`${name}\``),
    ]
  }

  /** The template's source rulebook. A deployment has no such folder. */
  const SOURCE_REFERENCES = new URL('../../../../references/', import.meta.url)
  const SOURCE_ADAPTER = new URL('canvas-adapter.md', SOURCE_REFERENCES)
  const GENERATED_ADAPTER = new URL('../skill/references/canvas-adapter.md', import.meta.url)

  it('omitting `service` resolves to the active service on a multi-service deployment', async () => {
    await expect(resolveServiceScope(servicesClient(TWO), { active: ON_SALES })).resolves.toEqual(
      ON_SALES,
    )
  })

  it('every read that takes `service` says omitting it reads the active service', () => {
    expect(scoped.length).toBeGreaterThan(0)
    for (const spec of scoped) {
      const param = (spec.parameters.properties as Record<string, { description?: string }>)
        .service
      expect(param?.description, spec.name).toMatch(ACTIVE_SERVICE)
      expect(param?.description, spec.name).not.toMatch(EVERY_SERVICE_DEFAULT)
      // The tool's own sentence too — it drifted once while the argument's did not.
      expect(spec.description, spec.name).not.toMatch(EVERY_SERVICE_DEFAULT)
    }
  })

  /*
   * Read from the record the agent is actually served — the one `get_reference`
   * answers from and the system prompt quotes in full — never from a file at a
   * fixed path. A deployment receives the adapter through the package or
   * supplies a replacement in its config, and either way the served text is
   * what a model reads and what has to name every tool.
   */
  it('the adapter the agent is served says the same, and names every such tool', () => {
    const names = scoped.map((spec) => spec.name)
    expect(names.length).toBeGreaterThan(0)
    expect(serviceRowProblems(readReference('canvas-adapter', TOOL_DEFINITIONS), names)).toEqual([])
  })

  it('a replacement adapter from the config is the one held to the tools', () => {
    configureAgentReferences({
      'canvas-adapter': '| Work across several services | The reads read the active service when it is omitted. |\n',
    })
    try {
      const names = scoped.map((spec) => spec.name)
      expect(names.length).toBeGreaterThan(0)
      expect(serviceRowProblems(readReference('canvas-adapter', TOOL_DEFINITIONS), names)).toEqual(
        names.map((name) => `the row does not name \`${name}\``),
      )
    } finally {
      configureAgentReferences(undefined)
    }
  })

  /*
   * The template is the adapter's home: `references/` holds the source, and
   * the skills sync vendors it for the app to import. A deployment has no
   * `references/` folder, so there is nothing to compare and the case skips
   * rather than failing on a path it was never given.
   */
  it.skipIf(!existsSync(SOURCE_REFERENCES))(
    'the source adapter and its generated copy agree',
    () => {
      expect(readFileSync(GENERATED_ADAPTER, 'utf8')).toBe(readFileSync(SOURCE_ADAPTER, 'utf8'))
    },
  )
})

describe('serviceStakeholderIds — the implicit-membership JOIN', () => {
  it("derives the cast from the service's lanes, never a service_id on stakeholders", async () => {
    const log: Rec[] = []
    const client = fakeClient((rec) => {
      switch (rec.table) {
        case 'phases':
          return { data: [{ id: 'ph1' }], error: null }
        case 'scenarios':
          return { data: [{ id: 'sc1' }], error: null }
        case 'paths':
          return { data: [{ id: 'pa1' }, { id: 'pa2' }], error: null }
        case 'lanes':
          return {
            data: [
              { stakeholder_id: 'stk-tutor' },
              { stakeholder_id: 'stk-student' },
              { stakeholder_id: null },
              { stakeholder_id: 'stk-tutor' },
            ],
            error: null,
          }
        default:
          return { data: [], error: null }
      }
    }, log)

    const ids = await serviceStakeholderIds(client, 'svc-sales')
    expect([...ids].sort()).toEqual(['stk-student', 'stk-tutor'])

    // The membership walk is phases → scenarios → paths → lanes. The catalog
    // table is NEVER queried, and nothing is filtered by a stakeholder
    // service_id — there is no such column; membership is the join.
    const tables = log.map((r) => r.table)
    expect(tables).toEqual(['phases', 'scenarios', 'paths', 'lanes'])
    expect(tables).not.toContain('stakeholders')
    // The lane read keys on the journey (path_id), and reads stakeholder_id.
    const lanes = log.find((r) => r.table === 'lanes')!
    expect(lanes.select).toContain('stakeholder_id')
    expect(lanes.filters.some(([, col]) => col === 'path_id')).toBe(true)
    expect(lanes.filters.some(([, col]) => col === 'service_id')).toBe(false)
  })

  it('short-circuits to an empty cast when the service has no journey yet', async () => {
    const client = fakeClient((rec) =>
      rec.table === 'phases' ? { data: [], error: null } : { data: [], error: null },
    )
    await expect(serviceStakeholderIds(client, 'svc-empty')).resolves.toEqual(new Set())
  })
})
