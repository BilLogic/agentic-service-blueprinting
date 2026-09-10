/**
 * Phase 4b data gate (Compare v3 plan): Merged branch canvas builds only if,
 * post-normalization, the MEDIAN compared pair yields ≥2 spine segments
 * covering ≥30% of columns. Run ad-hoc:
 *   npx vitest run scripts/compare-gate.test.ts
 * This file reports; it does not assert the gate (it records the verdict).
 *
 * The subject is the REGISTERED fallback content, and a deployment is allowed
 * to have none: `scripts/generate_fallbacks.py --register` fills the registry
 * for an organization that keeps blueprint content offline, and a deployment
 * whose content lives entirely in its database registers nothing. There is
 * nothing to report then, which is a fact about that deployment rather than a
 * failure, so the report says so and stops. What stays asserted is that a
 * registry WITH content yields pairs — an emptied-out reader would otherwise
 * look the same as an empty registry.
 */
import { SAMPLE_NAV } from '@/data/sampleNav'
import { describe, expect, it } from 'vitest'
import { buildCompareModel, type CompareBlueprints } from '@/lib/compareSlots'
import {
  getFallbackPathsForScenario,
  getRawBlueprintFallback,
} from '@/data/blueprintFallbacks'
import { isSubslide } from '@/types/nav'

type PairResult = {
  scenario: string
  pair: string
  columns: number
  spineSegments: number
  spineColumns: number
  spineCoverage: number
}

function collectPairs(): PairResult[] {
  const results: PairResult[] = []
  const scenarios = SAMPLE_NAV.filter((item) => isSubslide(item))
  for (const scenario of scenarios) {
    const paths = getFallbackPathsForScenario(scenario.id)
    if (!paths || paths.length < 2) continue
    for (let i = 0; i < paths.length; i += 1) {
      for (let j = i + 1; j < paths.length; j += 1) {
        const a = getRawBlueprintFallback(scenario.id, paths[i].id)
        const b = getRawBlueprintFallback(scenario.id, paths[j].id)
        if (!a || !b) continue
        const model = buildCompareModel([a, b] as CompareBlueprints)
        const spineRuns = model.runs.filter((run) => run.kind === 'shared')
        const spineColumns = spineRuns.reduce(
          (sum, run) => sum + run.columnKeys.length,
          0,
        )
        results.push({
          scenario: scenario.label ?? scenario.id,
          pair: `${paths[i].name} vs ${paths[j].name}`,
          columns: model.columns.length,
          spineSegments: spineRuns.length,
          spineColumns,
          spineCoverage: spineColumns / Math.max(1, model.columns.length),
        })
      }
    }
  }
  return results
}

/** Scenarios the registry actually carries paths for. */
function registeredScenarioCount(): number {
  return SAMPLE_NAV.filter(
    (item) =>
      isSubslide(item) && (getFallbackPathsForScenario(item.id)?.length ?? 0) > 0,
  ).length
}

describe('Phase 4b data gate', () => {
  it('reports spine segments + coverage per compared pair', () => {
    if (registeredScenarioCount() === 0) {
      console.log(
        '\n=== Phase 4b gate ===\nno registered fallback content — nothing to compare\n',
      )
      return
    }

    const results = collectPairs()
    expect(results.length).toBeGreaterThan(0)

    const lines = results.map(
      (r) =>
        `${r.scenario} · ${r.pair}: ${r.columns} cols, ${r.spineSegments} spine segs, ` +
        `${r.spineColumns} spine cols (${Math.round(r.spineCoverage * 100)}%)` +
        ` → ${r.spineSegments >= 2 && r.spineCoverage >= 0.3 ? 'PASS' : 'fail'}`,
    )
    const passing = results.filter(
      (r) => r.spineSegments >= 2 && r.spineCoverage >= 0.3,
    )
    const sorted = [...results].sort((a, b) => a.spineCoverage - b.spineCoverage)
    const median = sorted[Math.floor(sorted.length / 2)]

    console.log(
      [
        '',
        '=== Phase 4b gate ===',
        ...lines,
        `pairs: ${results.length} · passing: ${passing.length}`,
        `median pair: ${median.scenario} · ${median.pair} — ${median.spineSegments} segs, ${Math.round(median.spineCoverage * 100)}% coverage`,
        `GATE (median ≥2 segs AND ≥30%): ${median.spineSegments >= 2 && median.spineCoverage >= 0.3 ? 'PASS' : 'FAIL'}`,
        '',
      ].join('\n'),
    )
  })
})
