import { existsSync, readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TOOL_SPECS } from '@/lib/agent/tools/specs'
import { readReference } from '@/lib/agent/tools/read'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import {
  resolveServiceScope,
  serviceStakeholderIds,
} from '@/lib/agent/tools/serviceScope'
import { setActiveServiceSlug } from '@/contexts/activeServiceStore'
import { __resetActiveServiceIdCache } from '@/lib/service'

/*
 * The scope seam. `resolveServiceScope` is what replaced the global
 * single-service cache: a read covers EVERY service unless the call names one,
 * a filter narrows to one or says `all` out loud, and a single-service
 * deployment collapses every scope to the same set so it behaves exactly as
 * before. The multi-service default is the case the old single-service
 * short-circuit hid, so it is asserted here on a two-service fixture —
 * including with a slug set, because the URL scopes the canvas and not the
 * agent's reach. The catalog helpers assert the OTHER half of the decision that
 * a service owns its journey and shares the catalog — that a service's cast is
 * derived by JOIN through its journey, never a `service_id` on the catalog.
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

const servicesClient = (rows: unknown[]) =>
  fakeClient((rec) => (rec.table === 'services' ? { data: rows, error: null } : { data: [], error: null }))

beforeEach(() => {
  __resetActiveServiceIdCache()
})
afterEach(() => {
  setActiveServiceSlug(null)
  __resetActiveServiceIdCache()
})

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

  it('covers the WHOLE deployment when the call names no service', async () => {
    // The case the single-service short-circuit used to hide: with two
    // services and no filter, a read is not narrowed to one of them.
    await expect(resolveServiceScope(servicesClient(TWO), {})).resolves.toEqual({
      kind: 'all',
    })
    // And with no options object at all — the argument is optional.
    await expect(resolveServiceScope(servicesClient(TWO))).resolves.toEqual({
      kind: 'all',
    })
  })

  it('still covers the whole deployment when a slug names one service', async () => {
    // The URL scopes the CANVAS. It does not scope the agent's reach: the one
    // service on screen is not a filter on a question that named none.
    setActiveServiceSlug('sales-pipeline')
    await expect(resolveServiceScope(servicesClient(TWO), {})).resolves.toEqual({
      kind: 'all',
    })
  })

  it('a filter narrows to one named service and widens with "all"', async () => {
    // The slug names support, but the filter names sales — the filter decides.
    setActiveServiceSlug('support-desk')
    await expect(
      resolveServiceScope(servicesClient(TWO), { serviceArg: 'Sales Pipeline' }),
    ).resolves.toEqual({ kind: 'service', serviceId: 'svc-sales', serviceName: 'Sales Pipeline' })
    // by slug, too
    await expect(
      resolveServiceScope(servicesClient(TWO), { serviceArg: 'sales-pipeline' }),
    ).resolves.toEqual({ kind: 'service', serviceId: 'svc-sales', serviceName: 'Sales Pipeline' })
    // "all" is the default said out loud, and still widens past a named one
    await expect(
      resolveServiceScope(servicesClient(TWO), { serviceArg: 'all' }),
    ).resolves.toEqual({ kind: 'all' })
  })

  it('throws with the real service names when the filter names none of them', async () => {
    await expect(
      resolveServiceScope(servicesClient(TWO), { serviceArg: 'Billing' }),
    ).rejects.toThrow(/Support Desk, Sales Pipeline/)
  })
})

/*
 * What the agent is TOLD about an omitted service, held to what an omitted
 * service DOES. The two drifted once already: the resolver read every service
 * while the rulebook said an unnamed read stayed on the service on screen, so
 * a model that trusted the words believed a whole-deployment answer covered
 * only the board in front of the human.
 */
describe('the words about an omitted service match the behaviour', () => {
  const EVERY_SERVICE = /omitting it searches every service/i
  const ACTIVE_SERVICE = /(active service|service on screen|one on screen\))/i

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
      ...(/every service/i.test(row) ? [] : ['the row does not say every service']),
      ...(ACTIVE_SERVICE.test(row) ? ['the row says an omitted service is the one on screen'] : []),
      ...toolNames
        .filter((name) => !row.includes(`\`${name}\``))
        .map((name) => `the row does not name \`${name}\``),
    ]
  }

  /** The template's source rulebook. A deployment has no such folder. */
  const SOURCE_REFERENCES = new URL('../../../../references/', import.meta.url)
  const SOURCE_ADAPTER = new URL('canvas-adapter.md', SOURCE_REFERENCES)
  const GENERATED_ADAPTER = new URL('../skill/references/canvas-adapter.md', import.meta.url)

  it('omitting `service` resolves to every service on a multi-service deployment', async () => {
    setActiveServiceSlug('sales-pipeline')
    await expect(resolveServiceScope(servicesClient(TWO), {})).resolves.toEqual({
      kind: 'all',
    })
  })

  it('every read that takes `service` says omitting it covers every service', () => {
    expect(scoped.length).toBeGreaterThan(0)
    for (const spec of scoped) {
      const param = (spec.parameters.properties as Record<string, { description?: string }>)
        .service
      expect(param?.description, spec.name).toMatch(EVERY_SERVICE)
      expect(spec.description, spec.name).not.toMatch(/default[^.]*\b(active|on screen)\b/i)
    }
  })

  /*
   * Read from the record the agent is actually served — the one `get_reference`
   * answers from and the system prompt quotes in full — never from a file at a
   * fixed path. A deployment receives the adapter through the package's
   * generated copy or registers a replacement of its own, and either way the
   * served text is what a model reads and what has to name every tool.
   */
  it('the adapter the agent is served says the same, and names every such tool', () => {
    const names = scoped.map((spec) => spec.name)
    expect(names.length).toBeGreaterThan(0)
    expect(serviceRowProblems(readReference('canvas-adapter'), names)).toEqual([])
  })

  it('a registered replacement adapter is the one held to the tools', async () => {
    vi.resetModules()
    const { registerReferenceDocs } = await import('@/lib/agent/tools/referenceRegistry')
    registerReferenceDocs({
      'canvas-adapter': '| Work across several services | Omitting it searches every service. |\n',
    })
    const { readReference: served } = await import('@/lib/agent/tools/read')
    const { TOOL_SPECS: specs } = await import('@/lib/agent/tools/specs')
    const names = specs.filter(takesService).map((spec) => spec.name)

    expect(names.length).toBeGreaterThan(0)
    expect(serviceRowProblems(served('canvas-adapter'), names)).toEqual(
      names.map((name) => `the row does not name \`${name}\``),
    )
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
