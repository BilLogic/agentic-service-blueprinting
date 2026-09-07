import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * `bootstrap.ts`'s contract is negative: a host imports it BEFORE the app, so
 * whatever it pulls in has already evaluated by the time the seams are set.
 * The moment it re-exports something from the app — a type, a helper, a
 * convenience `App` — the module it exists to precede evaluates first and both
 * seams settle on the template's defaults.
 *
 * So the import list is held here, by name. This is a textual test on purpose:
 * a runtime assertion would have to import the module to check it, and
 * importing it is what it is asserting about.
 */

const ALLOWED = [
  './lib/storageNamespace',
  './lib/agent/tools/referenceRegistry',
]

describe('the pre-import entry point', () => {
  it('reaches nothing but the two seams it exists to set', () => {
    const source = readFileSync(
      new URL('./bootstrap.ts', import.meta.url),
      'utf8',
    )
    // Comments stripped first: the module's own docstring shows a host the
    // package specifier to import, and a grep that counted that would be
    // reading the documentation as if it were the code.
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '')
    const specifiers = [...code.matchAll(/from '([^']+)'/g)].map((m) => m[1])
    expect(specifiers).not.toHaveLength(0)
    for (const specifier of specifiers) expect(ALLOWED).toContain(specifier)
  })
})
