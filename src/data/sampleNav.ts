import type { NavItem } from '@/types/nav'

/**
 * The board this deployment shows before its own arrives.
 *
 * It lives here rather than in `@/types/nav` because it is a deployment's
 * CONTENT, not part of the navigation model: every repository built on this
 * template ships a different one, and a module of types and pure helpers that
 * carries one repository's phases cannot be shared with the next. The template
 * reads it through `DeploymentConfig.sample.nav`, which is what makes it
 * replaceable rather than baked in.
 */
// GENERATED-NAV:BEGIN — managed by scripts/generate_fallbacks.py --register.
// Replaced wholesale on registration (from the IR service); do not hand-edit.
// Default content is the template's meta-blueprint service: three phases
// (Discover → Setup → Maintain, Maintain looping back to Setup) wrapping six
// sample scenarios, matching supabase/seed.sql when Supabase is not
// configured.
import { SAMPLE_PHASES, SAMPLE_SCENARIOS } from '@/data/sampleBlueprint'

export const SAMPLE_NAV: NavItem[] = [
  ...SAMPLE_PHASES.map(
    (phase): NavItem => ({
      id: phase.id,
      index: phase.position,
      label: phase.name,
      summary: phase.summary,
      ...(phase.loops_to_phase_id ? { loopToId: phase.loops_to_phase_id } : {}),
    }),
  ),
  ...SAMPLE_SCENARIOS.map(
    (scenario): NavItem => ({
      id: scenario.id,
      index: scenario.position,
      label: scenario.name,
      parentId: scenario.phase_id,
      layout: scenario.layout,
      summary: scenario.summary,
    }),
  ),
]
// GENERATED-NAV:END
