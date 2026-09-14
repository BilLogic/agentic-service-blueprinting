/// <reference types="vitest/config" />
import { existsSync } from 'fs'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * Where `@/…` points: this repository's own `src`, or the package's, with
 * this repository's `src` laid over it PER PATH.
 *
 * A deployment that imports this repository as a dependency reads the
 * application out of `node_modules` and keeps, in its own `src`, only the
 * files it still has a reason to hold — its residents. Its build config is
 * the same file as this one — held byte-identical by the deployment's
 * reconciled set — so the choice cannot be made by editing it there. It is
 * made by what is on disk: when the package is installed, the package is the
 * application and `src` is the overlay; when it is not, `src` is the
 * application. Here the package is never installed — this repo has no
 * self-dependency — so the alias points at `src` and the overlay plugin is
 * never loaded. The two tsconfigs carry the same pair of roots, in the same
 * order, and already resolve per module.
 *
 * The ALL-OR-NOTHING rule this file used to state — the alias pointed at one
 * root, the first that existed, so a half-vendored `src` captured every
 * import and resolved none of the rest — is withdrawn; the decision that the
 * deployment overlays the package per path records the overlay, and
 * `scripts/overlay.mjs` is the rule. That module is imported BY
 * PACKAGE NAME, which is the one spelling that resolves on both sides: out of
 * `node_modules` in a deployment, and by self-reference here. A relative
 * import would name a file a deployment does not have, and a config that
 * imports a module the tree lacks is a config that does not load.
 *
 * THE PAIR IS WRITTEN DOWN A FOURTH TIME, in `scripts/sweep.mjs`, for the
 * checks that WALK the application — they have to land on the files the build
 * resolves or they are measuring a tree nobody ships. They cannot read it from
 * here: this file is loaded by bundling it in isolation.
 * `scripts/tests/the-build-and-a-walk-find-one-root.test.mjs` is what makes
 * the copies one fact. Edit the roots here and that test goes red.
 */
const APP_SOURCE_ROOTS = [
  path.resolve(__dirname, './src'),
  path.resolve(__dirname, './node_modules/agentic-service-blueprinting/src'),
]

const [residents, packagedApplication] = APP_SOURCE_ROOTS as [string, string]

/**
 * Whether the application arrived as a PACKAGE.
 *
 * Everything below turns on this one fact, and nothing below is reached in a
 * repository of the other kind. The same bytes serve both: the branch is
 * taken by what is on disk, exactly as the roots above are.
 */
const applicationIsAPackage = existsSync(packagedApplication)

const appSource = applicationIsAPackage ? packagedApplication : residents

/**
 * The overlay, when there is one: the package's root is the alias, and the
 * plugin answers with a resident's file for every path `src` still holds.
 * Loaded only where the package is — see the account above of why by name.
 */
const overlay = applicationIsAPackage
  ? (await import('agentic-service-blueprinting/overlay')).overlayPlugin({
      layers: APP_SOURCE_ROOTS,
    })
  : null

/**
 * What the dev server pre-bundles, once the application lives in
 * `node_modules`.
 *
 * A production build is unaffected by any of this — it has no pre-bundling
 * step — which is why the whole of it is invisible to a build, to a test run,
 * and to every check. Only the dev server pre-bundles, and only a deployment
 * has an application inside `node_modules` for it to pre-bundle.
 *
 * TWO THINGS GO WRONG, and they have to be fixed together.
 *
 * The first is the application itself. The optimizer bundles a dependency
 * with rolldown, and rolldown knows nothing of Vite's own import forms: a
 * `?raw` specifier reaches it as a filename ending in the four characters
 * `?raw`, which names no file, and the build stops. `role.md` and the skill
 * and reference documents are all reached that way, so the whole application
 * fails to pre-bundle and the page never loads. That is what `exclude` is
 * for. It takes the package's own name AND `@`, because the alias resolves
 * into `node_modules` too and every `@/…` import is otherwise registered as
 * a dependency of its own.
 *
 * The second is what excluding costs. Vite discovers dependencies by
 * crawling from an entry, and it refuses to register one whose importer sits
 * inside `node_modules` — a rule that is right for a normal dependency and
 * wrong for an application that lives there. Exclude the application and the
 * crawl stops at it, so nothing the application imports is pre-bundled
 * either, and the first CommonJS-only package it reaches is served to the
 * browser as CommonJS and throws on a named export. So `entries` points the
 * crawl at the application's own files, which is what puts its dependencies
 * back on the list; the tests are held out because a deployment installs the
 * application's dependencies and not its development ones, and a crawl that
 * reads a test file asks for a package that is not there.
 */
const packagedApplicationOptimizeDeps = {
  exclude: ['agentic-service-blueprinting', '@'],
  entries: [
    'index.html',
    `${appSource}/**/*.{ts,tsx}`,
    `!${appSource}/**/*.test.{ts,tsx}`,
    // And the residents, which import from the package too.
    `${residents}/**/*.{ts,tsx}`,
    `!${residents}/**/*.test.{ts,tsx}`,
  ],
}

/**
 * Where `~/…` points: the deployment's own source root.
 *
 * The paragraph above settles where the APPLICATION comes from, and what a
 * deployment's `src` is: residents, files the package also has, each held for
 * a reason the residents list records. The deployment's OWN files — its
 * config module, its content, whatever else it authors — are not residents,
 * and do not go in `src`: a file there stands for a package file of the same
 * path, and a file that stands for nothing is a resident with no reason.
 *
 * So they live in `deployment/`, reached by an alias that is deliberately NOT
 * the application's. Two roots, two prefixes, and an import says at a glance
 * which side it is on: `@/…` is the application, whichever layer answers,
 * and `~/…` is this deployment's.
 *
 * The directory is named here, in the template, rather than by each
 * deployment, because this file is one a deployment holds byte-identical to
 * this one. The same bytes have to serve a repository that has a deployment
 * root and one that has not. This repository is the second kind: `deployment/`
 * does not exist here and never will, the alias is never reached, and the test
 * glob below matches nothing. `deploymentRoot.test.ts` holds both halves —
 * that the three lines name the root, and that this tree is unchanged by their
 * naming it.
 */
const deploymentSource = path.resolve(__dirname, './deployment')

// https://vite.dev/config/
export default defineConfig({
  plugins: [...(overlay ? [overlay] : []), react(), tailwindcss()],
  optimizeDeps: applicationIsAPackage ? packagedApplicationOptimizeDeps : {},
  resolve: {
    alias: {
      '@': appSource,
      '~': deploymentSource,
    },
  },
  test: {
    // Node by default (colour math, layout helpers, script-level suites);
    // component tests opt into jsdom per-file with a
    // `// @vitest-environment jsdom` docblock.
    environment: 'node',
    // The suite runs with the dev-server flags OFF, whatever a developer keeps
    // in their own `.env.local`. `VITE_DEV_AUTHORING_UI=true` is how a
    // deployment shows its edit surfaces on a dev server without an authoring
    // key; it is read once at module load, so no `stubEnv` inside a test can
    // reach it, and a suite that inherits it starts with write flags already
    // up. That fails on the machine that has the flag and passes in CI, which
    // is the shape of failure that costs the most to diagnose.
    env: { VITE_DEV_AUTHORING_UI: '' },
    include: [
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
      // A deployment's own tests, in its own root. Nothing here matches them —
      // see the deployment source root above.
      'deployment/**/*.test.ts',
      'deployment/**/*.test.tsx',
      'scripts/tests/**/*.test.mjs',
    ],
  },
})
