// @vitest-environment jsdom
/**
 * "Nobody — a structural row." is a claim about the service, and only a
 * successful read of the cast can make it.
 *
 * The registry is a second query that starts after the lane's own resolves, so
 * a read-only lane ALWAYS renders at least once with the list still in flight.
 * Collapsing loading and error into an empty array made that first render say
 * "Nobody" for every lane, including the ones that name a stakeholder, and a
 * failed read left the sentence standing for good.
 */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { QueryResult } from '@/hooks/useSupabaseQuery'
import type { Stakeholder } from '@/types/database'

const result = vi.hoisted(() => ({
  current: { status: 'loading' } as QueryResult<Stakeholder[]>,
}))

vi.mock('@/hooks/useStakeholders', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/useStakeholders')>()
  return { ...actual, useStakeholders: () => result.current }
})

import { StakeholderSelect } from '@/components/blueprint/StakeholderSelect'

const NOBODY = /Nobody — a structural row/

afterEach(cleanup)

describe('the read-only stakeholder field', () => {
  it('says nothing about the cast while the cast is loading', () => {
    result.current = { status: 'loading' }
    render(<StakeholderSelect value="who-1" onChange={() => {}} disabled />)

    expect(screen.queryByText(NOBODY)).toBeNull()
    expect(screen.getByText(/Loading the cast/)).toBeTruthy()
  })

  it('reports a failed read rather than asserting an empty lane', () => {
    result.current = { status: 'error', message: 'the network', fallback: null }
    render(<StakeholderSelect value="who-1" onChange={() => {}} disabled />)

    expect(screen.queryByText(NOBODY)).toBeNull()
    expect(screen.getByText(/could not be loaded/)).toBeTruthy()
  })

  it('says Nobody only once the read succeeded and the lane names no one', () => {
    result.current = { status: 'ready', data: [], source: 'database' }
    render(<StakeholderSelect value={null} onChange={() => {}} disabled />)

    expect(screen.getByText(NOBODY)).toBeTruthy()
  })

  it('shows the party a loaded lane names', () => {
    result.current = {
      status: 'ready',
      source: 'database',
      data: [
        {
          id: 'who-1',
          name: 'Regular Tutor',
          kind: 'individual',
          summary: 'Teaches the weekly session.',
          aliases: [],
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      ],
    }
    render(<StakeholderSelect value="who-1" onChange={() => {}} disabled />)

    expect(screen.queryByText(NOBODY)).toBeNull()
    expect(screen.getByText('Regular Tutor')).toBeTruthy()
  })
})
