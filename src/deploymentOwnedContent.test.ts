import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { resolveDeploymentConfig } from './deploymentConfig'
import {
  getBlueprintFallback,
  getFallbackPathsForScenario,
  hasBlueprintFallback,
} from './data/blueprintFallbacks'
import type { CoverContent } from './components/cover/coverModel'
import type { NavItem } from './types/nav'

/**
 * The template's own CONTENT, and how a deployment replaces each piece of it.
 *
 * `config.ts`, `content/` and `data/` are the three places this repository
 * keeps values that belong to whoever is running it — its name, its landing
 * page, the board it shows before a database arrives. Every other module
 * under `src` is application code that is the same for everyone.
 *
 * While a deployment kept a whole copy of the tree, it replaced any of them by
 * having a file at the same path: its own `src` came first under `@/…`, so its
 * version won. A deployment that reads the application out of the package has
 * no such copy, and `@/…` finds the template's version of each — which is the
 * failure this file exists to make impossible to reach by accident. Every
 * module in those three directories needs an answer to one question: when a
 * deployment's version is no longer on the path, what carries its values?
 *
 * There are two answers and no third. Either the value arrives through the
 * deployment config — the seam that already carries the wordmark, the accent
 * and the cover — or the module is unreachable to a deployment that has a
 * database, in which case the template's version standing in for a missing one
 * changes nothing that renders.
 *
 * The table below is that answer, per module, and the test under it fails when
 * a module appears in those directories without one. It is the inventory
 * written where it cannot go stale.
 */

type Verdict =
  /** A deployment's values arrive on `DeploymentConfig`. */
  | 'config'
  /**
   * The bundled sample. Reachable only with no database configured, and keyed
   * by this template's own identifiers, so a deployment's board never meets
   * it — see the sample's own tests below.
   */
  | 'bundled sample'
  /** Types, erased before anything runs. Nothing to supply. */
  | 'compile time only'

const VERDICTS: Record<string, Verdict> = {
  'config.ts': 'config',
  'content/coverContent.ts': 'config',
  'data/sampleNav.ts': 'config',
  'data/blueprintFallbacks.ts': 'bundled sample',
  'data/sliceFallbacks.ts': 'bundled sample',
  'data/sampleBlueprint.ts': 'bundled sample',
  'types/database.ts': 'compile time only',
}

const srcRoot = path.dirname(fileURLToPath(import.meta.url))

function modulesIn(dir: string): string[] {
  return readdirSync(path.join(srcRoot, dir), { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
    .filter((entry) => !entry.name.endsWith('.test.ts'))
    .map((entry) => `${dir}/${entry.name}`)
}

describe('the template’s own content', () => {
  it('is every module in the three content directories, and each has an answer', () => {
    const found = ['config.ts', 'types/database.ts', ...modulesIn('content'), ...modulesIn('data')]

    // Both directions. A module added to `data/` or `content/` with no verdict
    // fails here rather than at the moment a deployment silently inherits this
    // template's copy of it; a verdict for a module that no longer exists
    // fails too, so the table cannot outlive what it describes.
    expect([...found].sort()).toEqual(Object.keys(VERDICTS).sort())
  })
})

describe('what arrives through the deployment config', () => {
  const cover: CoverContent = {
    title: 'Acme Service Design',
    lede: 'One map of the service Acme delivers.',
    primaryCtaLabel: 'Open the map',
    commandCopy: { copyLabel: 'Copy', copiedLabel: 'Copied' },
    states: { noSlices: 'Nothing cut yet.' },
    tabs: [],
  }

  const nav: NavItem[] = [
    { id: 'acme-intake', index: 1, label: 'Intake', summary: 'How work arrives.' },
  ]

  /**
   * `config.ts` holds two values and both are already fields: the wordmark and
   * the accent. A deployment that names either gets its own, and the template's
   * copy of `config.ts` sitting on the path under it changes nothing.
   */
  it('carries the wordmark and the accent in place of the template’s config module', () => {
    const resolved = resolveDeploymentConfig({
      brand: { name: 'Acme Service Design', accent: '#2F6F62' },
    })

    expect(resolved.brand.name).toBe('Acme Service Design')
    expect(resolved.brand.accent).toBe('#2F6F62')
  })

  /** `content/coverContent.ts`: the landing page, replaced whole. */
  it('carries the cover in place of the template’s content module', () => {
    const resolved = resolveDeploymentConfig({ cover })

    // By reference, not a copy: a cover is a content document, and the app
    // renders the deployment's own object.
    expect(resolved.cover).toBe(cover)
  })

  /** `data/sampleNav.ts`: the board shown before a database answers. */
  it('carries the pre-database navigation in place of the template’s data module', () => {
    const resolved = resolveDeploymentConfig({ sample: { nav } })

    expect(resolved.sample.nav).toEqual(nav)
  })
})

/**
 * Who still reads `config.ts` directly, and what each read feeds.
 *
 * The verdict above says a deployment's name and accent arrive on the config.
 * That is true of every surface a person sees, and it is NOT true of every
 * read: the module is also where the template's own defaults live, so several
 * modules name it on purpose, as the last step of a fallback chain a
 * deployment has already overtaken. One read is neither — a constant built
 * while the navigation model evaluates, which no render-time value can reach.
 *
 * Listing them is the point. A new direct read is a new place a deployment's
 * name cannot get to, and it should have to be argued for rather than
 * arriving with a refactor.
 */
const CONFIG_READERS: Record<string, string> = {
  'deploymentConfig.ts': 'the defaults every overlay resolves against',
  'contexts/DeploymentConfigContext.tsx':
    'the last fallback of the workspace title, after the config and the cover',
  'components/cover/CoverPage.tsx':
    'the cover heading, when neither the config nor the cover names one',
  'lib/brandAccent.ts': 'the accent’s default, which this template leaves unset',
  'types/nav.ts':
    'the workspace breadcrumb’s label, built at module scope — the one read no config reaches',
}

/**
 * And the exception is inert, which is the other half of the claim.
 *
 * `types/nav.ts` builds the workspace breadcrumb's label from the template's
 * own name, so a deployment mounting this package would see that name in a
 * breadcrumb — except that the trail is assembled by a component nothing
 * renders. Nothing on screen is wrong today, and this is what will say so on
 * the day someone wires the component up: the label has to be carried in from
 * the resolved config before that component has a consumer.
 */
const UNRENDERED_BREADCRUMB = 'ScenarioMenubarBreadcrumb'

describe('the modules that still read the template’s own name', () => {
  it('are exactly the ones accounted for', () => {
    const readers: string[] = []

    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          walk(full)
          continue
        }
        if (!/\.tsx?$/.test(entry.name)) continue
        // Tests name it to assert on it; they render nothing.
        if (/\.test\.tsx?$/.test(entry.name)) continue
        const source = readFileSync(full, 'utf8')
        if (/from '(@\/config|\.\.?\/(?:\.\.\/)*config)'/.test(source)) {
          readers.push(path.relative(srcRoot, full))
        }
      }
    }
    walk(srcRoot)

    expect([...readers].sort()).toEqual(Object.keys(CONFIG_READERS).sort())
  })

  it('include one whose surface is not rendered, and it stays that way', () => {
    const importers: string[] = []

    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          walk(full)
          continue
        }
        if (!/\.tsx?$/.test(entry.name)) continue
        // Tests name it to assert on it; the question is what RENDERS it.
        if (/\.test\.tsx?$/.test(entry.name)) continue
        if (path.basename(full, path.extname(full)) === UNRENDERED_BREADCRUMB) continue
        if (readFileSync(full, 'utf8').includes(UNRENDERED_BREADCRUMB)) {
          importers.push(path.relative(srcRoot, full))
        }
      }
    }
    walk(srcRoot)

    expect(importers).toEqual([])
  })
})

describe('the bundled sample', () => {
  /**
   * The three sample modules have no field on the config, and need none. Every
   * lookup into them is keyed by an identifier, and the identifiers are this
   * template's own — generated for its meta-blueprint. A deployment's scenario
   * and path ids are not among them, so the registry answers a deployment the
   * same way an empty one would, on every surface that consults it without
   * first asking whether a database exists.
   *
   * That second clause is the load-bearing one, and it is why this is a test
   * rather than a sentence. Most readers of these modules do ask — the board,
   * the navigation, the slice hooks and the agent's trial surface are all
   * behind `isBundledSampleActive()`, which is false the moment a deployment
   * is configured. A few do not: resolving a slice's scenario falls through to
   * the registry after a database read finds nothing, and the navigation model
   * asks whether a slide has registered content at all. Those are the ones
   * this holds.
   */
  it('answers nothing to identifiers that are not its own', () => {
    const notThisTemplates = 'bbbbbbbb-0000-4000-8000-00000000d1d1'

    expect(hasBlueprintFallback(notThisTemplates)).toBe(false)
    expect(getFallbackPathsForScenario(notThisTemplates)).toEqual([])
    expect(getBlueprintFallback(notThisTemplates)).toBeNull()
  })

  /**
   * And it answers something to its own, so the test above is a statement
   * about the keys rather than about an empty registry.
   */
  it('answers its own', async () => {
    const { SAMPLE_SCENARIO_ID } = await import('./data/blueprintFallbacks')

    expect(hasBlueprintFallback(SAMPLE_SCENARIO_ID)).toBe(true)
    expect(getFallbackPathsForScenario(SAMPLE_SCENARIO_ID).length).toBeGreaterThan(0)
  })
})

describe('the database types', () => {
  /**
   * The largest file a deployment used to fork, and the one with no seam,
   * because there is nothing for a seam to carry: every import of it in this
   * tree is a TYPE import, so it contributes not one byte to what runs. It is
   * this template's compile-time statement of the schema its own code needs,
   * and a deployment satisfies it by having that schema — an agreement between
   * migrations, settled where migrations are settled, not by swapping a module
   * underneath the code that was typechecked against it.
   *
   * The guard is the import form. A value import here would make the file real
   * at runtime and the paragraph above false in the same commit.
   */
  it('are imported as types and never as values', () => {
    const offenders: string[] = []

    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          walk(full)
          continue
        }
        if (!/\.tsx?$/.test(entry.name)) continue
        const source = readFileSync(full, 'utf8')
        for (const line of source.split('\n')) {
          if (!/from '(@|\.\.?)\/?[^']*types\/database'/.test(line)) continue
          if (!line.trimStart().startsWith('import type')) {
            offenders.push(`${path.relative(srcRoot, full)}: ${line.trim()}`)
          }
        }
      }
    }
    walk(srcRoot)

    expect(offenders).toEqual([])
  })
})
