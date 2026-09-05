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
 * single-service cache: a read scopes to the active service by default, a
 * filter narrows to one or widens to all, and a single-service deployment
 * collapses every scope to the same set so it behaves exactly as before. The
 * catalog helpers assert the OTHER half of ADR 0003 — that a service's cast is
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
    await expect(
      resolveServiceScope(servicesClient(one), { defaultMode: 'active' }),
    ).resolves.toEqual({ kind: 'all' })
    // Even an explicit single-service name resolves to `all`: with one service
    // every scope is the same set, so the machinery is skipped entirely.
    await expect(
      resolveServiceScope(servicesClient(one), {
        serviceArg: 'Support Desk',
        defaultMode: 'active',
      }),
    ).resolves.toEqual({ kind: 'all' })
  })

  it('defaults to the ACTIVE service — the one the URL slug names', async () => {
    setActiveServiceSlug('sales-pipeline')
    await expect(
      resolveServiceScope(servicesClient(TWO), { defaultMode: 'active' }),
    ).resolves.toEqual({ kind: 'service', serviceId: 'svc-sales', serviceName: 'Sales Pipeline' })
  })

  it('defaults to the first service by created_at at the bare root (no slug)', async () => {
    await expect(
      resolveServiceScope(servicesClient(TWO), { defaultMode: 'active' }),
    ).resolves.toEqual({ kind: 'service', serviceId: 'svc-support', serviceName: 'Support Desk' })
  })

  it('widens to `all` when the creator default is all', async () => {
    setActiveServiceSlug('sales-pipeline')
    await expect(
      resolveServiceScope(servicesClient(TWO), { defaultMode: 'all' }),
    ).resolves.toEqual({ kind: 'all' })
  })

  it('a filter narrows to one named service and widens with "all"', async () => {
    // Active is support, but the filter names sales — the filter wins.
    setActiveServiceSlug('support-desk')
    await expect(
      resolveServiceScope(servicesClient(TWO), {
        serviceArg: 'Sales Pipeline',
        defaultMode: 'active',
      }),
    ).resolves.toEqual({ kind: 'service', serviceId: 'svc-sales', serviceName: 'Sales Pipeline' })
    // by slug, too
    await expect(
      resolveServiceScope(servicesClient(TWO), { serviceArg: 'sales-pipeline', defaultMode: 'active' }),
    ).resolves.toEqual({ kind: 'service', serviceId: 'svc-sales', serviceName: 'Sales Pipeline' })
    // "all" widens deliberately, past the active default
    await expect(
      resolveServiceScope(servicesClient(TWO), { serviceArg: 'all', defaultMode: 'active' }),
    ).resolves.toEqual({ kind: 'all' })
  })

  it('throws with the real service names when the filter names none of them', async () => {
    await expect(
      resolveServiceScope(servicesClient(TWO), { serviceArg: 'Billing', defaultMode: 'active' }),
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
