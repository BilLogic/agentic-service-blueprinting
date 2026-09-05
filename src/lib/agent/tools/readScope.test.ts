import { describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { listScenarios, listStakeholders } from '@/lib/agent/tools/read'
import type { ServiceScope } from '@/lib/agent/tools/serviceScope'

/*
 * The read tools APPLYING a scope. `serviceScope.test.ts` pins how a scope is
 * resolved and how the join is walked; this pins that a scoped read returns
 * ONLY the active service's rows, that `all` returns everything, and that the
 * catalog read narrows by the implicit-membership join rather than by a column
 * the shared catalog does not have.
 *
 * The deployment this came from pins the same pair over `search_blueprint`,
 * whose ranked read needs a `public.search_blueprint` RPC this kit has no
 * migration for; `list_scenarios` is the journey read the template scopes
 * instead.
 */

type Rec = { table: string; select?: string; filters: string[] }

function fakeClient(handlers: {
  from?: (rec: Rec) => { data: unknown; error: unknown }
}): SupabaseClient<Database> {
  const log: Rec[] = []
  function builder(table: string) {
    const rec: Rec = { table, filters: [] }
    log.push(rec)
    const b = {
      select(sel: string) {
        rec.select = sel
        return b
      },
      eq(column: string) {
        rec.filters.push(column)
        return b
      },
      in() {
        return b
      },
      not() {
        return b
      },
      order() {
        return b
      },
      then(onF: (v: unknown) => unknown, onR?: (e: unknown) => unknown) {
        return Promise.resolve(
          handlers.from ? handlers.from(rec) : { data: [], error: null },
        ).then(onF, onR)
      },
    }
    return b
  }
  const client = {
    from: (t: string) => builder(t),
  } as unknown as SupabaseClient<Database>
  return Object.assign(client, { __log: log }) as SupabaseClient<Database>
}

const readLog = (client: SupabaseClient<Database>) =>
  (client as unknown as { __log: Rec[] }).__log

const SALES: ServiceScope = {
  kind: 'service',
  serviceId: 'svc-sales',
  serviceName: 'Sales Pipeline',
}

describe('listScenarios scope', () => {
  const PHASES = [
    {
      id: 'ph-sales',
      name: 'Prospecting',
      position: 1,
      scenarios: [
        { id: 'sc-demo', name: 'Book a demo', summary: null, position: 1 },
      ],
    },
  ]

  it('scoped to a service filters the journey by service_id', async () => {
    const client = fakeClient({
      from: (rec) =>
        rec.table === 'phases'
          ? { data: PHASES, error: null }
          : { data: [], error: null },
    })
    const out = await listScenarios(client, SALES)
    expect(out).toContain('Prospecting')
    // The journey is the hard per-service boundary, so the scope is one
    // column filter and no join.
    expect(readLog(client)[0]!.filters).toEqual(['service_id'])
  })

  it('widened to all reads every phase, unfiltered', async () => {
    const client = fakeClient({
      from: (rec) =>
        rec.table === 'phases'
          ? { data: PHASES, error: null }
          : { data: [], error: null },
    })
    const out = await listScenarios(client, { kind: 'all' })
    expect(out).toContain('Prospecting')
    expect(readLog(client)[0]!.filters).toEqual([])
  })

  it('defaults to all when no scope is passed (byte-for-byte the old read)', async () => {
    const client = fakeClient({
      from: (rec) =>
        rec.table === 'phases'
          ? { data: PHASES, error: null }
          : { data: [], error: null },
    })
    await listScenarios(client)
    expect(readLog(client)[0]!.filters).toEqual([])
  })
})

describe('listStakeholders scope', () => {
  const CAST = [
    { id: 'stk-a', name: 'Student', kind: 'recipient', summary: null, aliases: [] },
    { id: 'stk-b', name: 'Tutor', kind: 'staff', summary: null, aliases: [] },
    { id: 'stk-c', name: 'Vendor', kind: 'partner', summary: null, aliases: [] },
  ]

  it('scoped to a service shows only the cast its journey references (the join)', async () => {
    const client = fakeClient({
      from: (rec) => {
        switch (rec.table) {
          case 'stakeholders':
            return { data: CAST, error: null }
          case 'phases':
            return { data: [{ id: 'ph1' }], error: null }
          case 'scenarios':
            return { data: [{ id: 'sc1' }], error: null }
          case 'paths':
            return { data: [{ id: 'pa1' }], error: null }
          case 'lanes':
            // Sales' lanes pick the student and the tutor, not the vendor.
            return {
              data: [{ stakeholder_id: 'stk-a' }, { stakeholder_id: 'stk-b' }],
              error: null,
            }
          default:
            return { data: [], error: null }
        }
      },
    })
    const out = await listStakeholders(client, SALES)
    expect(out).toContain('Student')
    expect(out).toContain('Tutor')
    expect(out).not.toContain('Vendor')
  })

  it('unscoped (all) shows the whole deployment catalog', async () => {
    const client = fakeClient({
      from: (rec) =>
        rec.table === 'stakeholders'
          ? { data: CAST, error: null }
          : { data: [], error: null },
    })
    const out = await listStakeholders(client, { kind: 'all' })
    expect(out).toContain('Student')
    expect(out).toContain('Tutor')
    expect(out).toContain('Vendor')
  })

  it('says so, and how to widen, when a service references nobody', async () => {
    const client = fakeClient({
      from: (rec) =>
        rec.table === 'stakeholders'
          ? { data: CAST, error: null }
          : { data: [], error: null },
    })
    const out = await listStakeholders(client, SALES)
    expect(out).toContain('Sales Pipeline')
    expect(out).toContain('service:"all"')
  })
})
