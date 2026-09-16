// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { act } from 'react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { WorkspaceBadges } from '@/components/editor/EditorChrome'
import { SupabaseProvider } from '@/contexts/SupabaseProvider'
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
  // The WIDTH first, because that is the defect: `border-width: 0` is what the
  // old span computed to. tailwind-merge keeps width and colour in separate
  // groups, so a bare `border` going missing from the variant's base string —
  // or a `border-0` arriving at a call site — would leave the two colour
  // assertions below passing over an edgeless badge.
  expect(badge.classList.contains('border')).toBe(true)
  // Then the colour: the variant's edge, and NOT the base string's
  // `border-transparent`, which `cn` drops as the loser.
  expect(badge.classList.contains('border-input')).toBe(true)
  expect(badge.classList.contains('border-transparent')).toBe(false)
})

/**
 * Three states, three treatments — held so the row cannot become one word
 * repeated in three colours nobody can tell apart.
 *
 * Rendered one at a time because AMBER AND SLATE are exclusive by
 * construction: `isEditPreview` is `hasDevAuthoringUi() && !isDevAuthoring &&
 * session === null`, so a session that can really write is never also showing
 * the preview that says nothing saves.
 *
 * That is the only pair the provider excludes, and the claim stops there.
 * `hasDevAuthoringKey()` never consults `configured`, so a dev server holding a
 * service key with no project URL renders "sample data" AND "authoring"
 * together — an odd session, but a reachable one, and a reason the three
 * treatments have to be distinct rather than merely unlikely to collide.
 *
 * The tuple carries the edge as well as the fill: sample data and edit preview
 * share `text-muted-foreground`, so ink alone would not separate them, and the
 * thing that does is the edge this ticket gave one of them.
 */
test('the three states keep three distinct treatments', () => {
  const treatment = (label: string) => {
    const badge = screen.getByText(label)
    const classes = Array.from(badge.classList)
    const pick = (prefix: string) =>
      classes.find((name) => name.startsWith(prefix)) ?? 'none'
    const fill = pick('bg-')
    return {
      fill,
      look: [badge.dataset.variant, pick('border-'), fill, pick('text-')].join(
        ' ',
      ),
    }
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

  const states = [sample, authoring, preview]
  expect(new Set(states.map((state) => state.look)).size).toBe(3)
  // Amber stays amber: it is the one state on this row that carries a risk.
  expect(authoring.look).toContain('warning')

  /*
   * And the three fills are three colours, under both themes.
   *
   * The token comes OUT of the class each badge actually rendered — the role
   * utilities are `bg-<role>` over `--<role>` — rather than from three names
   * restated here. Restating them measured the tokens this test expected
   * instead of the ones the badges wear, so a variant whose fill had moved
   * would have gone on passing.
   */
  for (const theme of ['light', 'dark'] as const) {
    const over = resolveColor('--sidebar', theme)
    const fills = states.map((state) =>
      resolveColor(`--${state.fill.replace(/^bg-/, '')}`, theme, {
        over,
      }).join(','),
    )
    expect(new Set(fills).size).toBe(3)
  }
})
