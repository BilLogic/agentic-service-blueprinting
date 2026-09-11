import { describe, expect, it } from 'vitest'
import { readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { consumersOf, declaredNames } from '@/lib/tokenModel'

/**
 * The ratchet on a vocabulary that was retired, and why a deletion needs one.
 *
 * `compat.css` carried three extra names for two greys — `foreground-light` for
 * caption grey, `foreground-lighter` and `foreground-muted` for hint grey —
 * spelled Supabase's way so a snippet lifted from their docs resolved without
 * being rewritten. Nothing in this tree ever consumed them, which is exactly
 * what made them dangerous: a second spelling with no consumers reads as
 * available, so the next person writing a caption picks whichever name they saw
 * last, and a reviewer cannot tell whether two classes mean one colour or two.
 *
 * Deleting the file does not settle that. A borrowed snippet still arrives
 * spelling it their way, and the cheap fix — re-register the alias, one line,
 * the app looks the same — is the thing this test exists to refuse. Adopt the
 * snippet by rewriting it into `muted-foreground` and `tertiary-foreground`,
 * which is what this system calls those jobs.
 *
 * NOT covered here, on purpose: `--foreground-lightness`. It is a per-theme
 * dial, not an alias, and it shares a prefix with a retired name — so the
 * patterns below are anchored rather than substring matches.
 */

const STYLES = resolve(dirname(fileURLToPath(import.meta.url)), '../styles')

/** The three names, in both the raw and the Tailwind-registered spelling. */
const RETIRED = [
  'foreground-light',
  'foreground-lighter',
  'foreground-muted',
].flatMap((name) => [`--${name}`, `--color-${name}`])

describe('the retired alias vocabulary', () => {
  it('declares none of the three names anywhere in the token layer', () => {
    const declared = declaredNames()
    const returned = RETIRED.filter((name) => declared.has(name))
    expect(returned).toEqual([])
  })

  it('has no alias stylesheet left to import', () => {
    expect(readdirSync(STYLES)).not.toContain('compat.css')
  })

  it('leaves nothing consuming them, so the deletion changed no colour', () => {
    const stragglers = RETIRED.flatMap((name) =>
      consumersOf(name).map((use) => `${name} in ${use.file}`),
    )
    expect(stragglers).toEqual([])
  })

  it('still declares the two jobs those names stood in for', () => {
    const declared = declaredNames()
    expect(declared.has('--muted-foreground')).toBe(true)
    expect(declared.has('--tertiary-foreground')).toBe(true)
  })
})
