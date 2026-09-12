// @vitest-environment jsdom
/**
 * Whose slices a reader sees.
 *
 * The same rule the board and the navigation already hold: with a database
 * answering, its rows are the slices, and nothing from this template's bundled
 * sample may reach a reader. With no database configured, the sample IS the
 * slices, whole, because a fresh clone's slice list is load-bearing for
 * onboarding exactly as its board is.
 *
 * The path this file pins is the one the other two gates do not cover.
 * `useSupabaseQuery` calls a hook's fallback on TWO paths — the no-database
 * one, where the sample is the point, and the ERROR one, where it is not — and
 * four surfaces render `fallback ?? []`. So a configured deployment whose
 * slices read failed or timed out was shown three of this template's demo
 * slices as its own, in its sidebar, its tab strip, its cell footer and its
 * mobile shell.
 *
 * The seam under test is the real one end to end: neither hook is mocked, only
 * the Supabase provider, and the `isSupabaseConfigured` mock moves WITH the
 * provider's `configured` for the reason `EditorContext.nav.test.tsx` gives —
 * in the app they are one function, and a test where they disagree is testing
 * a state that cannot happen.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FALLBACK_SLICES } from '@/data/sliceFallbacks'
import { useSlice } from '@/hooks/useSlice'
import { useSlices } from '@/hooks/useSlices'

const supabase = vi.hoisted(() => ({
  configured: false,
  client: null as unknown,
}))

vi.mock('@/contexts/SupabaseProvider', () => ({
  useSupabase: () => ({
    client: supabase.client,
    configured: supabase.configured,
    canWrite: false,
  }),
}))

vi.mock('@/lib/supabase', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/supabase')>()),
  isSupabaseConfigured: () => supabase.configured,
}))

/**
 * A client that fails every read. The failure itself is not the subject — a
 * timeout, a dropped connection and a policy refusal all land on the same
 * error branch — only that the branch exists and is reached while a database
 * is configured.
 */
const failingClient = {
  from: () => {
    throw new Error('read failed')
  },
}

function wrap() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

afterEach(() => {
  cleanup()
  supabase.configured = false
  supabase.client = null
})

const SAMPLE_SLICE = FALLBACK_SLICES[0]!

describe('the bundled slices, with a database configured', () => {
  it('offers no slice list when the read fails', async () => {
    supabase.configured = true
    supabase.client = failingClient

    const { result } = renderHook(() => useSlices('service-1'), {
      wrapper: wrap(),
    })

    await waitFor(() => expect(result.current.status).toBe('error'))
    if (result.current.status !== 'error') throw new Error('not the error case')
    // Not `[]` — a failed read may not claim the workspace has no slices.
    expect(result.current.fallback).toBeNull()
  })

  it('opens no bundled slice when the read fails', async () => {
    supabase.configured = true
    supabase.client = failingClient

    const { result } = renderHook(() => useSlice(SAMPLE_SLICE.id), {
      wrapper: wrap(),
    })

    await waitFor(() => expect(result.current.status).toBe('error'))
    if (result.current.status !== 'error') throw new Error('not the error case')
    expect(result.current.fallback).toBeNull()
  })
})

describe('the bundled slices, with no database configured', () => {
  it('serves the sample list, exactly as it does today', async () => {
    const { result } = renderHook(() => useSlices('service-1'), {
      wrapper: wrap(),
    })

    await waitFor(() => expect(result.current.status).toBe('ready'))
    if (result.current.status !== 'ready') throw new Error('not ready')
    expect(result.current.source).toBe('fallback')
    expect(result.current.data.map((slice) => slice.id)).toEqual(
      FALLBACK_SLICES.map((slice) => slice.id),
    )
  })

  it('opens a sample slice, exactly as it does today', async () => {
    const { result } = renderHook(() => useSlice(SAMPLE_SLICE.id), {
      wrapper: wrap(),
    })

    await waitFor(() => expect(result.current.status).toBe('ready'))
    if (result.current.status !== 'ready') throw new Error('not ready')
    expect(result.current.source).toBe('fallback')
    expect(result.current.data.slice.id).toBe(SAMPLE_SLICE.id)
  })
})
