// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { act } from 'react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { WorkspaceBadges } from '@/components/editor/EditorChrome'
import { SupabaseProvider } from '@/contexts/SupabaseProvider'
import { contrast } from '@/lib/oklch'
import { resolveColor } from '@/lib/tokenModel'
import { setDevSimulatedTier, setDevSimulation, SIMULATION_OFF } from '@/lib/devPortal'

/**
 * The simulated tier is told on in the badge row, not only in the popover
 * that sets it.
 *
 * `devPortal.test.tsx` pins the badge component itself; this pins that the
 * shell MOUNTS it, beside the authoring and edit-preview badges. A portal
 * whose only tell is the settings section it was switched on from is a
 * session that looks like the reader's own account everywhere they actually
 * work.
 *
 * A database is connected here, because without one the row is never empty:
 * it says "sample data", which is the other badge's subject, not this one's.
 * An ordinary session is a connected one with no key and no simulation.
 */
const supabase = vi.hoisted(() => ({
  configured: true,
  authoringKey: false,
  authoringUi: false,
}))

vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: () => supabase.configured,
  hasDevAuthoringKey: () => supabase.authoringKey,
  hasDevAuthoringUi: () => supabase.authoringUi,
  devLoginCredentials: () => null,
  createSupabaseClient: () => ({
    auth: {
      getSession: async () => ({ data: { session: null } }),
      refreshSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
    },
    rpc: async () => ({ data: false, error: null }),
  }),
}))

beforeEach(() => {
  window.localStorage.clear()
  supabase.configured = true
  supabase.authoringKey = false
  supabase.authoringUi = false
  act(() => setDevSimulation(SIMULATION_OFF))
})

afterEach(cleanup)

function renderBadges() {
  render(
    <SupabaseProvider>
      <WorkspaceBadges />
    </SupabaseProvider>,
  )
}

test('the badge row is empty for an ordinary session', () => {
  renderBadges()
  expect(document.querySelector('[data-dev-tier-badge]')).toBeNull()
  expect(screen.queryByText('sample data')).toBeNull()
  expect(document.body.textContent).toBe('')
})

test('the badge row names the simulated tier while the simulation is on', () => {
  act(() => setDevSimulatedTier('regular'))
  renderBadges()
  expect(screen.getByText('simulating regular')).toBeTruthy()
  expect(document.querySelector('[data-dev-tier-badge="regular"]')).not.toBeNull()
})

test('the sample-data badge names the bundled sample when no database is connected', () => {
  supabase.configured = false
  renderBadges()
  expect(screen.getByText('sample data')).toBeTruthy()
  expect(document.body.textContent).not.toMatch(/Supabase/i)
})

/**
 * The indicator is the Badge component, and the edge is the whole point.
 *
 * It used to be a span carrying `rounded-md px-2 py-1 text-xs
 * text-muted-foreground` — badge geometry with no badge. Tailwind's `border`
 * utility was never among those classes, so the element computed to
 * `border-width: 0` over a transparent fill and the words sat loose in the
 * chrome. `data-slot` and `data-variant` are the Badge's own tells, and a
 * hand-rolled span cannot carry them.
 */
test('the sample-data indicator is the Badge component on its default variant', () => {
  supabase.configured = false
  renderBadges()
  const badge = screen.getByText('sample data')

  expect(badge.dataset.slot).toBe('badge')
  expect(badge.dataset.variant).toBe('default')
  // The variant's edge, and NOT the base string's `border-transparent` — `cn`
  // drops the loser, so the winning border class is the resolved one.
  expect(badge.classList.contains('border-input')).toBe(true)
  expect(badge.classList.contains('border-transparent')).toBe(false)
})

/**
 * `--input` against the badge's own fill, in both themes, read out of the
 * cascade rather than looked at.
 *
 * Measured against `--card` because that is what the badge paints under its
 * own edge. In LIGHT the card and the strip behind it resolve to the same
 * colour, so the edge is the only thing separating this badge from the nav it
 * sits in — which is why a `border-width: 0` badge read as plain words.
 *
 * The second assertion is why this is `default` and not `outline`. `outline`
 * draws `--border`, the token every quiet edge in the app shares; it is the
 * weaker of the two by construction (2% + 20% of the contrast dial, against
 * `--input`'s 3% + 38%), and the only way to make it carry a badge would be to
 * strengthen it everywhere. Stated as a comparison so the pair cannot silently
 * converge.
 */
test('the indicator draws an edge a reader can see in both themes', () => {
  for (const theme of ['light', 'dark'] as const) {
    const card = resolveColor('--card', theme, {
      over: resolveColor('--sidebar', theme),
    })
    const edge = contrast(resolveColor('--input', theme, { over: card }), card)
    const quiet = contrast(resolveColor('--border', theme, { over: card }), card)

    expect(edge).toBeGreaterThan(1.3)
    expect(edge).toBeGreaterThan(quiet)
  }
})

/**
 * Three states, three treatments — held so the row cannot become one word
 * repeated in three colours nobody can tell apart.
 *
 * Rendered one at a time because the provider guarantees they never co-occur:
 * `isEditPreview` is `hasDevAuthoringUi() && !isDevAuthoring`, so the amber and
 * the slate are mutually exclusive by construction, and "distinct" is a claim
 * about the treatments rather than about a row a reader could ever see whole.
 *
 * The tuple carries the edge as well as the fill: sample data and edit preview
 * share `text-muted-foreground`, so ink alone would not separate them, and the
 * thing that does is the edge this ticket gave one of them.
 */
test('the three states keep three distinct treatments', () => {
  const treatment = (label: string): string => {
    const badge = screen.getByText(label)
    const classes = Array.from(badge.classList)
    const pick = (prefix: string) =>
      classes.find((name) => name.startsWith(prefix)) ?? 'none'
    return [
      badge.dataset.variant,
      pick('border-'),
      pick('bg-'),
      pick('text-'),
    ].join(' ')
  }

  supabase.configured = false
  renderBadges()
  const sample = treatment('sample data')
  cleanup()

  supabase.configured = true
  supabase.authoringKey = true
  renderBadges()
  const authoring = treatment('authoring')
  cleanup()

  supabase.authoringKey = false
  supabase.authoringUi = true
  renderBadges()
  const preview = treatment('edit preview')

  expect(new Set([sample, authoring, preview]).size).toBe(3)
  // Amber stays amber: it is the one state on this row that carries a risk.
  expect(authoring).toContain('warning')

  // And the three fills are three colours, under both themes.
  for (const theme of ['light', 'dark'] as const) {
    const over = resolveColor('--sidebar', theme)
    const fills = (['--card', '--surface-warning', '--muted'] as const).map(
      (token) => resolveColor(token, theme, { over }).join(','),
    )
    expect(new Set(fills).size).toBe(3)
  }
})
