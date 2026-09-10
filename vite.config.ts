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

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': appSource,
    },
  },
  test: {
    // Node by default (colour math, layout helpers, script-level suites);
    // component tests opt into jsdom per-file with a
    // `// @vitest-environment jsdom` docblock.
    environment: 'node',
    include: [
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
      'scripts/tests/**/*.test.mjs',
    ],
  },
})
