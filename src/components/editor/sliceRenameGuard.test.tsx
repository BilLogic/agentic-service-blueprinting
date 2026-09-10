// @vitest-environment jsdom
/**
 * What the rename dialog's concurrency guard actually does, driven rather
 * than read.
 *
 * The guard has now been wrong in both directions. It first sent the stamp
 * captured when the context menu opened, so a refetch in between failed a
 * rename nobody had raced. The fix sent the freshest stamp the client
 * held instead — which passes the guard precisely when somebody else's rename
 * has already been refetched into the list, and overwrites them. Both
 * failures are invisible in the source: the call reads the same either way,
 * and only the *value* of the token differs.
 *
 * So the two directions are stood up as one pair, against a fake `slices`
 * table whose update bumps `updated_at` the way the real trigger does. Without
 * that bump no token could ever go stale and the whole file would be vacuous.
 *
 * The dialog is rendered directly and its `slice` prop is swapped between the
 * seed and the submit. That swap used to matter: the sidebar resolved the row
 * from the live list on every render, so a refetch reached straight into the
 * open dialog. This change deletes that resolution and freezes the seed at
 * open, so the swap is now expected to change nothing — which is exactly what
 * these rerenders assert, and why they stay.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  cleanup,
  configure,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { RenameSliceDialog } from '@/components/editor/SlicesSidebarSection'
import { clearSession } from '@/lib/authoringSession'
import type { SliceListEntry } from '@/hooks/useSlices'
import type { Database } from '@/types/database'

/**
 * Timeouts sized for a loaded machine, not an idle one.
 *
 * This file's first test failed once in CI-like conditions — four agents each
 * running the suite — with `getByText` unable to find the conflict notice, on
 * a run where the rename had in fact been refused correctly. It has never
 * reproduced since: five consecutive full-suite runs on an idle machine, and
 * 5/5 in isolation.
 *
 * What the measurements do and do not say. The awaited work is fast: cutting
 * `asyncUtilTimeout` to 200 ms leaves all four tests passing, so every wait in
 * this file settles inside a fifth of the old default. What is slow is
 * standing the file up — vitest bills it separately as `environment`, seconds
 * of it, and the first test in the file pays visibly more than the three
 * behind it.
 *
 * An earlier version of this comment read that first-test figure as the wait
 * itself and it is not: the two are accounted separately, and the 200 ms run
 * proves the wait is nowhere near the budget. The point that survives is the
 * one that matters — the awaited work needs the host responsive, and nothing
 * here reserved headroom for a host that is not.
 *
 * `testTimeout` is raised alongside it so that if a wait ever does hang for a
 * real reason, the failure that surfaces is `waitFor`'s — which names the text
 * it could not find — rather than a bare test timeout that names nothing.
 */
configure({ asyncUtilTimeout: 4000 })
vi.setConfig({ testTimeout: 20_000 })

const supabase = vi.hoisted(() => ({ client: null as unknown }))

vi.mock('@/contexts/SupabaseProvider', () => ({
  useSupabase: () => ({
    client: supabase.client,
    canWrite: true,
    session: null,
    status: 'ready',
  }),
}))

type Row = Record<string, unknown>
type Result = { data: unknown; error: { message: string } | null }

/**
 * One row of `slices`, answering the two query shapes this path builds: a
 * `select(...).eq('id', …).maybeSingle()` and an
 * `update(...).eq(...).select()`. Anything else should fail the test rather
 * than be quietly served.
 */
function fakeSlicesTable(row: Row) {
  let stamps = 0
  const bump = () => `2026-08-26T09:0${++stamps}:00.123456+00:00`

  function builder(verb: 'select' | 'update', patch?: Row) {
    const filters: Row = {}
    let selected = false

    const matches = () =>
      Object.entries(filters).every(([column, value]) => row[column] === value)

    const resolve = (): Result => {
      if (verb === 'select') return { data: matches() ? [{ ...row }] : [], error: null }
      if (!matches()) return { data: selected ? [] : null, error: null }
      // `updated_at` is trigger-maintained, and the trigger fires on every
      // matching update — including one that rewrites a field with the value
      // it already had.
      Object.assign(row, patch, { updated_at: bump() })
      return { data: selected ? [{ ...row }] : null, error: null }
    }

    const api = {
      select(_columns?: string) {
        selected = true
        return api
      },
      eq(column: string, value: unknown) {
        filters[column] = value
        return api
      },
      maybeSingle(): Promise<Result> {
        const result = resolve()
        return Promise.resolve({
          data: (result.data as Row[])[0] ?? null,
          error: result.error,
        })
      },
      then(onFulfilled: (value: Result) => unknown) {
        return Promise.resolve(resolve()).then(onFulfilled)
      },
    }
    return api
  }

  const client = {
    from(_table: string) {
      return {
        select: (columns?: string) => builder('select').select(columns),
        update: (patch: Row) => builder('update', patch),
      }
    },
  } as unknown as SupabaseClient<Database>

  return { client, row }
}

/** The row as the client holds it — a list entry, not the server's copy. */
function listEntry(row: Row): SliceListEntry {
  return { ...(row as unknown as SliceListEntry), slides: [] }
}

const SERVER_ROW = (): Row => ({
  id: 'slice-1',
  service_id: 'svc-1',
  title: 'Concierge intake',
  summary: null,
  kind: 'journey',
  actor: null,
  authorship: 'human',
  locale: 'en',
  position: 0,
  stakeholder_id: null,
  created_at: '2026-08-26T09:00:00.000000+00:00',
  created_by: null,
  updated_at: '2026-08-26T09:00:00.000000+00:00',
})

/** Type the new title into the dialog and press Rename. */
function rename(title: string) {
  const [titleField] = Array.from(document.querySelectorAll('input'))
  fireEvent.change(titleField, { target: { value: title } })
  fireEvent.click(screen.getByRole('button', { name: 'Rename' }))
}

beforeEach(() => clearSession())
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('refuses a rename typed over a title someone else has since changed', async () => {
  const server = SERVER_ROW()
  const { client } = fakeSlicesTable(server)
  supabase.client = client

  // The dialog opens on the row as the list knows it, and the form is seeded
  // from that row: this is what the user is looking at while they type.
  const seeded = listEntry({ ...server })
  const { rerender } = render(
    <RenameSliceDialog slice={seeded} open onOpenChange={() => {}} />,
  )

  // Someone else renames it, and this client refetches — so the sidebar's
  // live-list resolution now hands the dialog the newer row mid-edit.
  server.title = 'Front desk intake'
  server.updated_at = '2026-08-26T09:30:00.654321+00:00'
  rerender(
    <RenameSliceDialog slice={listEntry({ ...server })} open onOpenChange={() => {}} />,
  )

  rename('Concierge intake (v2)')

  await waitFor(() =>
    expect(
      screen.getByText('This slice changed somewhere else. Reopen it and try again.'),
    ).toBeDefined(),
  )
  expect(server.title).toBe('Front desk intake')
})

it('lands the rename when the stamp moved but nothing the form was seeded from did', async () => {
  const server = SERVER_ROW()
  const { client } = fakeSlicesTable(server)
  supabase.client = client

  const seeded = listEntry({ ...server })
  const { rerender } = render(
    <RenameSliceDialog slice={seeded} open onOpenChange={() => {}} />,
  )

  // The slide editor's Save re-sends the slice's own values purely to exercise
  // this guard, and the trigger bumps `updated_at` anyway. Nothing the rename
  // form is looking at has changed, so the rename must still land — this is
  // the false positive the first fix removed and the second must not restore.
  server.updated_at = '2026-08-26T09:30:00.654321+00:00'
  rerender(
    <RenameSliceDialog slice={listEntry({ ...server })} open onOpenChange={() => {}} />,
  )

  rename('Concierge intake (v2)')

  await waitFor(() => expect(server.title).toBe('Concierge intake (v2)'))
})

it('lands the rename when the client never saw the newer stamp at all', async () => {
  const server = SERVER_ROW()
  const { client } = fakeSlicesTable(server)
  supabase.client = client

  // No refetch this time: the list — and so the dialog — still holds the old
  // stamp at submit. The row itself is untouched, so the guard has nothing to
  // protect and the rename lands.
  render(
    <RenameSliceDialog slice={listEntry({ ...server })} open onOpenChange={() => {}} />,
  )
  server.updated_at = '2026-08-26T09:30:00.654321+00:00'

  rename('Concierge intake (v2)')

  await waitFor(() => expect(server.title).toBe('Concierge intake (v2)'))
})

it('lands the rename when only the derived authorship moved', async () => {
  const server = SERVER_ROW()
  server.authorship = 'agent'
  const { client } = fakeSlicesTable(server)
  supabase.client = client

  render(
    <RenameSliceDialog slice={listEntry({ ...server })} open onOpenChange={() => {}} />,
  )

  // `authorship` is not round-tripped: every meta write puts it through
  // `authorshipAfterEdit`, which turns anything that is not 'human' into
  // 'customized'. A concurrent slide-editor Save therefore moves this field
  // with nobody having typed anything, and the rename would have stored the
  // identical value. Comparing it raw refuses a rename that races nothing.
  server.authorship = 'customized'
  server.updated_at = '2026-08-26T09:30:00.654321+00:00'

  rename('Concierge intake (v2)')

  await waitFor(() => expect(server.title).toBe('Concierge intake (v2)'))
})
