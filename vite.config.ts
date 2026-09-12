/// <reference types="vitest/config" />
import { existsSync } from 'fs'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * Where `@/…` points: this repository's own `src`, or the package's.
 *
 * A deployment that imports this repository as a dependency can stop keeping
 * a copy of the application and read it out of `node_modules` instead. Its
 * build config is the same file as this one — held byte-identical by the
 * deployment's reconciled set — so the choice cannot be made by editing it
 * there. It is made by what is on disk: the first root that exists wins.
 *
 * Here the first always exists and the second is never reached; this repo has
 * no self-dependency. The two tsconfigs carry the same pair of roots.
 *
 * `src` is ALL OR NOTHING. TypeScript's `paths` falls back per MODULE and
 * this falls back per ROOT, so the two agree exactly when `src` is wholly
 * present or wholly absent, and can disagree on a tree that is half-vendored.
 * Do not half-vendor one.
 */
const APP_SOURCE_ROOTS = [
  path.resolve(__dirname, './src'),
  path.resolve(__dirname, './node_modules/agentic-service-blueprinting/src'),
]

const appSource =
  APP_SOURCE_ROOTS.find((root) => existsSync(root)) ?? APP_SOURCE_ROOTS[0]

/**
 * Where `~/…` points: the deployment's own source root.
 *
 * The paragraph above settles where the APPLICATION comes from. It leaves the
 * deployment's own files — its config module, its content, whatever else it
 * authors — with nowhere to go, and they cannot go back into `src`: the first
 * root that exists wins, so a `src` holding only a deployment's files would
 * capture every `@/…` import in the package and resolve none of them.
 *
 * So they live in `deployment/`, reached by an alias that is deliberately NOT
 * the application's. One prefix cannot name both roots — an alias maps a
 * prefix to exactly one directory here, and where a per-module fallback is
 * available at all (TypeScript's `paths`) it is the path-shadowing this
 * arrangement exists to end: a deployment file quietly standing in for a
 * package file of the same name, with nothing reporting the substitution.
 * Two roots, two prefixes, and an import says at a glance which side it is on.
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
  plugins: [react(), tailwindcss()],
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
