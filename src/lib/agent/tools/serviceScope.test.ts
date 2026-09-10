import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import {
  resolveServiceScope,
  serviceStakeholderIds,
  servicePhaseNames,
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

describe('servicePhaseNames', () => {
  it("returns the service's phase names, lowercased", async () => {
    const client = fakeClient((rec) =>
      rec.table === 'phases'
        ? { data: [{ name: 'Onboarding' }, { name: 'In-session' }], error: null }
        : { data: [], error: null },
    )
    const names = await servicePhaseNames(client, 'svc-sales')
    expect([...names].sort()).toEqual(['in-session', 'onboarding'])
  })
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
