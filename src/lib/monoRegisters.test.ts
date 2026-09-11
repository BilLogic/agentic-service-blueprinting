import { describe, expect, it } from 'vitest'
import { classListHas } from '@/lib/classList'
import {
  REGISTER_1,
  REGISTER_2,
  REGISTER_3,
  TABULAR_WITHOUT_MONO,
  fontMonoSites,
  pairingViolations,
  rosteredRegisters,
  rungSize,
  signalledRegisters,
  staleNamed,
  tabularWithoutMonoSites,
} from '@/lib/monoRegisters'

/**
 * Monospace stays in three registers, and the guard knows the two ladders.
 *
 * #546 / #536. A `font-mono` call site belongs to exactly one register:
 *
 * 1. code, identifiers and stored values
 * 2. aligned numerals — always beside `tabular-nums`
 * 3. eyebrow and wordmark
 *
 * The scan is the class-list reader from #541: a token is present in any
 * order, including split across `cn()` arguments. Size is evaluated against
 * the ladder of the scope the site renders in, because `text-sm` is 13px
 * in prose and 14px inside `.font-mono`.
 */

describe('signalledRegisters', () => {
  it('a site in two registers fails', () => {
    // Slide-number-shaped: numerals and tracking at once. #546 tightens
    // #536's overlap — a call site belongs to exactly one.
    expect(
      signalledRegisters(
        'font-mono text-2xs font-medium tracking-[0.2em] tabular-nums uppercase',
      ),
    ).toEqual([2, 3])
  })

  it('tabular-nums signals register 2, tracking signals register 3', () => {
    expect(signalledRegisters('font-mono tabular-nums')).toEqual([2])
    expect(signalledRegisters('font-mono uppercase tracking-wider')).toEqual([
      3,
    ])
    expect(signalledRegisters('font-mono text-xs')).toEqual([])
  })
})

describe('pairingViolations', () => {
  it('register 2 without tabular-nums fails', () => {
    expect(pairingViolations('font-mono text-3xs', 2)).toEqual([
      'register 2 without tabular-nums',
    ])
  })

  it('tracking on register 1 fails', () => {
    expect(pairingViolations('font-mono tracking-tight', 1)).toEqual([
      'tracking on register 1',
    ])
  })

  it('tracking on register 2 fails', () => {
    expect(
      pairingViolations('font-mono tabular-nums tracking-tight', 2),
    ).toEqual(['tracking on register 2', 'two registers'])
  })

  it('register 3 may carry tracking, and register 2 may carry tabular-nums', () => {
    expect(pairingViolations('font-mono uppercase tracking-wider', 3)).toEqual(
      [],
    )
    expect(pairingViolations('font-mono tabular-nums', 2)).toEqual([])
    expect(pairingViolations('font-mono text-xs', 1)).toEqual([])
  })
})

describe('the tree', () => {
  it('is read with the class-list reader, matching in any order', () => {
    const sequence = fontMonoSites().find(
      (site) =>
        site.file === 'components/blueprint/BlueprintCellButton.tsx' &&
        classListHas(site.classes, ['font-mono', 'tabular-nums']),
    )
    expect(sequence, 'the sequence badge is a class list with both tokens').toBeTruthy()
    expect(sequence!.classes.join(' ')).not.toContain('font-mono tabular-nums')
  })

  it('puts every font-mono call site in exactly one register', () => {
    const listedTwice = [...REGISTER_1, ...REGISTER_2, ...REGISTER_3]
      .map((entry) => entry.file)
      .filter((file, index, files) => files.indexOf(file) !== index)
    expect(listedTwice, 'a surface listed under two registers').toEqual([])

    const offenders = fontMonoSites().flatMap((site) => {
      const listed = rosteredRegisters(site.file)
      const reasons: string[] = []
      if (listed.length === 0) {
        reasons.push('in none — which of the three registers is this?')
      }
      if (listed.length > 1) {
        reasons.push(`in two: ${listed.join(' and ')}`)
      }
      if (listed.length === 1) {
        reasons.push(...pairingViolations(site.classes, listed[0]))
      }
      return reasons.map(
        (reason) => `${site.file}:${site.line} ${reason} [${site.classes.join(' ')}]`,
      )
    })
    expect(offenders).toEqual([])
  })

  it('tabular-nums without monospace fails unless allowlisted with a reason', () => {
    const allowed = new Set(TABULAR_WITHOUT_MONO.map((entry) => entry.file))
    const offenders = tabularWithoutMonoSites()
      .filter((site) => !allowed.has(site.file))
      .map(
        (site) =>
          `${site.file}:${site.line} tabular-nums without font-mono [${site.classes.join(' ')}]`,
      )
    expect(offenders).toEqual([])
  })

  it('each allowlist entry states its reason and is still needed', () => {
    const roster = [...REGISTER_1, ...REGISTER_2, ...REGISTER_3]
    const missingReason = [...roster, ...TABULAR_WITHOUT_MONO]
      .filter((entry) => entry.because.trim() === '')
      .map((entry) => entry.file)
    expect(missingReason).toEqual([])

    expect(
      staleNamed(roster, fontMonoSites()),
      'register entries that no longer carry font-mono',
    ).toEqual([])
    expect(
      staleNamed(TABULAR_WITHOUT_MONO, tabularWithoutMonoSites()),
      'tabular-nums-without-mono entries that no longer match',
    ).toEqual([])
  })

  it('a stale allowlist entry fails', () => {
    const planted = {
      file: 'does/not/exist.tsx',
      because: 'planted to prove a stale carve-out fails rather than rotting',
    }
    expect(
      staleNamed([...TABULAR_WITHOUT_MONO, planted], tabularWithoutMonoSites()),
    ).toEqual([planted.file])
  })

  it('a mono text-sm passes, because the scope, not the class, decides the size', () => {
    // text-sm is 13px in prose and 14px inside `.font-mono, code, kbd, pre,
    // samp`. A guard that assumed one ladder would take the sans 13px, fail
    // to find it on the mono column (12, 14, 16, …), and reject a legible
    // code size. CoverCommandCopy's command string is that case: font-mono
    // text-sm, register 1.
    const sans = rungSize('sm', 'sans')
    const mono = rungSize('sm', 'mono')
    expect(Number.parseFloat(sans ?? '') * 16).toBe(13)
    expect(Number.parseFloat(mono ?? '') * 16).toBe(14)
    expect(
      ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl'].map((rung) =>
        Number.parseFloat(rungSize(rung, 'mono') ?? '') * 16,
      ),
    ).not.toContain(13)

    const site = fontMonoSites().find(
      (entry) =>
        entry.file === 'components/cover/CoverCommandCopy.tsx' &&
        classListHas(entry.classes, ['font-mono', 'text-sm']),
    )
    expect(site, 'CoverCommandCopy still writes font-mono text-sm').toBeTruthy()
    expect(signalledRegisters(site!.classes)).toEqual([])
    expect(rosteredRegisters(site!.file)).toEqual([1])
    expect(pairingViolations(site!.classes, 1)).toEqual([])
  })
})
