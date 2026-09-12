/// <reference types="vitest/config" />
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, symlinkSync, writeFileSync, copyFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { resolveConfig } from 'vite'
import { afterAll, describe, expect, it } from 'vitest'

/**
 * The deployment source root: the second place application source can live.
 *
 * A deployment that mounts this package stops keeping a copy of the
 * application and reads it out of the package instead — `@/…` finds the
 * package once its own `src` is gone. That leaves its OWN files with nowhere
 * to go: its config module, its content, whatever else it authors. They
 * cannot go back into `src`, because the first root that exists wins and a
 * half-populated `src` would capture every `@/…` import in the package.
 *
 * So they go in `deployment/`, and the three build files name it: an alias
 * that is not the application's, a TypeScript include, and a test glob. All
 * three ship HERE, in the template, because all three are files a deployment
 * holds byte-identical to this repository's — the same bytes have to serve a
 * repository that has a deployment root and one that does not.
 *
 * This repository is the second kind. It has no `deployment/` directory and
 * never will, so every assertion below about what the configuration NAMES is
 * paired with one about this tree being unchanged by the naming.
 */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** The directory the convention reserves, and the alias that reaches it. */
const DEPLOYMENT_ROOT_DIRNAME = 'deployment'
const DEPLOYMENT_ALIAS = '~'

function aliasEntries(alias: unknown): Array<{ find: unknown; replacement: string }> {
  return alias as Array<{ find: unknown; replacement: string }>
}

function readTsConfig(configPath: string, overrideInclude?: string[]) {
  const read = ts.readConfigFile(configPath, ts.sys.readFile)
  expect(read.error).toBeUndefined()
  const json = read.config as { include?: string[] }
  if (overrideInclude) json.include = overrideInclude
  return ts.parseJsonConfigFileContent(json, ts.sys, path.dirname(configPath))
}

describe('the deployment source root', () => {
  it('is what the alias that is not the application’s points at', async () => {
    const config = await resolveConfig(
      { configFile: path.join(repoRoot, 'vite.config.ts') },
      'serve',
    )
    const entries = aliasEntries(config.resolve.alias)

    const app = entries.find((entry) => entry.find === '@')
    const deployment = entries.find((entry) => entry.find === DEPLOYMENT_ALIAS)

    expect(app?.replacement).toBe(path.join(repoRoot, 'src'))
    expect(deployment?.replacement).toBe(
      path.join(repoRoot, DEPLOYMENT_ROOT_DIRNAME),
    )
    // Two roots, two aliases. One prefix cannot name both: Vite maps a prefix
    // to exactly ONE directory, so a shared prefix would be a choice between
    // the roots rather than a pair of them — and where a per-module fallback
    // IS available, it is the path-shadowing this seam exists to end.
    expect(deployment?.replacement).not.toBe(app?.replacement)
  })

  it('has its tests collected by the shipped test globs', async () => {
    const config = await resolveConfig(
      { configFile: path.join(repoRoot, 'vite.config.ts') },
      'serve',
    )
    expect(config.test?.include).toContain(
      `${DEPLOYMENT_ROOT_DIRNAME}/**/*.test.ts`,
    )
    expect(config.test?.include).toContain(
      `${DEPLOYMENT_ROOT_DIRNAME}/**/*.test.tsx`,
    )
  })

  it('is on the TypeScript program, under the same alias', () => {
    const app = readTsConfig(path.join(repoRoot, 'tsconfig.app.json'))
    expect(app.raw.include).toContain(DEPLOYMENT_ROOT_DIRNAME)
    expect(app.options.paths?.[`${DEPLOYMENT_ALIAS}/*`]).toEqual([
      `./${DEPLOYMENT_ROOT_DIRNAME}/*`,
    ])

    // The root config carries the same mapping so an editor resolves what the
    // build resolves; it compiles nothing itself.
    const root = readTsConfig(path.join(repoRoot, 'tsconfig.json'))
    expect(root.options.paths?.[`${DEPLOYMENT_ALIAS}/*`]).toEqual([
      `./${DEPLOYMENT_ROOT_DIRNAME}/*`,
    ])
  })
})

describe('a repository with no deployment root', () => {
  it('is this one', () => {
    expect(existsSync(path.join(repoRoot, DEPLOYMENT_ROOT_DIRNAME))).toBe(false)
  })

  /**
   * The regression the naming could have caused, measured rather than argued:
   * the set of files TypeScript compiles is IDENTICAL to the set it compiled
   * when `include` named `src` alone. An include pattern that matches nothing
   * contributes nothing — this is what says so, on the shipped file.
   */
  it('compiles exactly the files it compiled before the root was named', () => {
    const configPath = path.join(repoRoot, 'tsconfig.app.json')
    const shipped = readTsConfig(configPath)
    const beforeTheRootWasNamed = readTsConfig(configPath, ['src'])

    expect(shipped.errors).toEqual([])
    expect(shipped.fileNames.length).toBeGreaterThan(0)
    expect([...shipped.fileNames].sort()).toEqual(
      [...beforeTheRootWasNamed.fileNames].sort(),
    )
  })

  /**
   * And the same for the suite. The deployment globs are rooted at a directory
   * this repository does not have, so they can match nothing; asserting the
   * directory's absence is the whole of the proof, and it is a stronger one
   * than a file count, which would drift with every test anyone adds.
   */
  it('collects no test from the deployment globs, because there is nothing to collect', async () => {
    const config = await resolveConfig(
      { configFile: path.join(repoRoot, 'vite.config.ts') },
      'serve',
    )
    const deploymentGlobs = (config.test?.include ?? []).filter((glob) =>
      glob.startsWith(`${DEPLOYMENT_ROOT_DIRNAME}/`),
    )
    expect(deploymentGlobs.length).toBeGreaterThan(0)
    expect(existsSync(path.join(repoRoot, DEPLOYMENT_ROOT_DIRNAME))).toBe(false)
  })
})

/**
 * The whole seam, end to end, on a tree that actually has a deployment root.
 *
 * Everything above reads the configuration. This one RUNS it: a throwaway
 * project holding the four build files of this repository byte for byte, this
 * package linked in under its own name, no `src` of its own, and one module
 * plus one test in `deployment/`. It is the state a deployment reaches on the
 * far side of the switch, and the only way to show the three shipped lines
 * carry it is to put a test in that directory and watch it run.
 */
describe('a deployment that brings its own source root', () => {
  const scratches: string[] = []

  afterAll(() => {
    for (const scratch of scratches) rmSync(scratch, { recursive: true, force: true })
  })

  function stageDeployment(): string {
    const scratch = mkdtempSync(path.join(tmpdir(), 'asb-deployment-root-'))
    scratches.push(scratch)

    for (const file of [
      'vite.config.ts',
      'tsconfig.json',
      'tsconfig.app.json',
      'tsconfig.node.json',
    ]) {
      copyFileSync(path.join(repoRoot, file), path.join(scratch, file))
    }
    writeFileSync(
      path.join(scratch, 'package.json'),
      `${JSON.stringify({ name: 'a-deployment', private: true, type: 'module' }, null, 2)}\n`,
    )

    // Everything this repository has installed, plus this repository under the
    // name a deployment depends on it by. Links rather than copies: the point
    // is to resolve against the real package, not a snapshot of it.
    const modules = path.join(scratch, 'node_modules')
    mkdirSync(modules)
    for (const entry of readdirSync(path.join(repoRoot, 'node_modules'))) {
      symlinkSync(path.join(repoRoot, 'node_modules', entry), path.join(modules, entry))
    }
    symlinkSync(repoRoot, path.join(modules, 'agentic-service-blueprinting'))

    const deployment = path.join(scratch, DEPLOYMENT_ROOT_DIRNAME)
    mkdirSync(deployment)
    writeFileSync(
      path.join(deployment, 'workspaceName.ts'),
      "export const WORKSPACE_NAME = 'A Deployment'\n",
    )
    writeFileSync(
      path.join(deployment, 'workspaceName.test.ts'),
      [
        "import { expect, it } from 'vitest'",
        // Its own module, through its own alias.
        "import { WORKSPACE_NAME } from '~/workspaceName'",
        // The application's, through the application's alias, out of the
        // package — this tree has no `src` for it to come from.
        "import { ORG_NAME } from '@/config'",
        '',
        "it('reads its own root and the package it mounts', () => {",
        "  expect(WORKSPACE_NAME).toBe('A Deployment')",
        '  expect(ORG_NAME.length).toBeGreaterThan(0)',
        '  expect(ORG_NAME).not.toBe(WORKSPACE_NAME)',
        '})',
        '',
      ].join('\n'),
    )

    return scratch
  }

  it('resolves both roots and runs the tests it keeps there', () => {
    const scratch = stageDeployment()
    expect(existsSync(path.join(scratch, 'src'))).toBe(false)

    const output = execFileSync(
      path.join(repoRoot, 'node_modules', '.bin', 'vitest'),
      ['run', '--reporter=verbose'],
      {
        cwd: scratch,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        // The summary below is read as text, so it has to BE text. A reporter
        // that colours its output writes escape sequences between the words,
        // and `Test Files  1 passed` stops matching anything — which is a
        // green run reported as a failure. Locally the pipe is enough to turn
        // colour off; a CI runner turns it back on.
        env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
      },
    )

    expect(output).toContain('workspaceName.test.ts')
    expect(output).toMatch(/Test Files\s+1 passed \(1\)/)
  }, 180_000)
})
