import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/*
 * TWO WAYS TO LABEL A THING, AND ONLY TWO.
 *
 *   `PanelSectionLabel` — a section name inside a panel. Sentence case,
 *     because a panel is already a quiet surface and capitals there are a
 *     second voice in a room that has one.
 *   `Eyebrow` — a capitalised word over a region of chrome. One spelling of
 *     the letterspacing, in one file.
 *
 * Both existed before this test and both were bypassed: a dependency group
 * inlined its own capitalised label while every other panel section used the
 * primitive, and twenty-odd eyebrows were written by hand at two different
 * letterspacings. Every utility in those strings is legal on its own, which is
 * why review never caught it — the drift is only visible when you count.
 *
 * So the rule is enforced where it can be: an authored component may not spell
 * an eyebrow itself. The primitives are exempt, being the place it is spelled.
 */

const ROOT = join(process.cwd(), 'src/components')

/** The primitives, and the vendored tree the component CLI owns. */
const EXEMPT = new Set(['blueprint/Eyebrow.tsx', 'blueprint/PanelSectionLabel.tsx'])

/**
 * A capitalised SMALL label written by hand: the eyebrow, spelled out.
 *
 * Both halves are load-bearing. `uppercase` alone catches a badge — a divider
 * badge is capitals too, and it is a different thing: a badge says what
 * something IS and carries its own geometry and colour. An eyebrow is `text-xs`
 * chrome furniture over a region, which is the pair this matches.
 */
const HAND_SPELLED = /(?=.*\buppercase\b)(?=.*\btext-xs\b)/

function componentFiles(dir: string, prefix = ''): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    const rel = prefix ? `${prefix}/${name}` : name
    if (statSync(path).isDirectory()) {
      return name === 'ui' ? [] : componentFiles(path, rel)
    }
    if (!name.endsWith('.tsx') || name.includes('.test.')) return []
    return EXEMPT.has(rel) ? [] : [rel]
  })
}

describe('an eyebrow is spelled in one place', () => {
  it('is not written by hand in a component', () => {
    const offenders = componentFiles(ROOT).flatMap((rel) => {
      const lines = readFileSync(join(ROOT, rel), 'utf8').split('\n')
      return lines.flatMap((line, index) => {
        // Only class strings. Prose about the register — and there is some,
        // in files that explain why they carry a mono one — is not a use.
        if (!HAND_SPELLED.test(line)) return []
        if (!/className|cn\(|'|"/.test(line)) return []
        if (/^\s*(\/\/|\*|\/\*)/.test(line.trim())) return []
        // The mono registers are their own thing: a phase marker and a slide
        // number are identity, not chrome furniture, and they say so.
        if (/font-mono/.test(line)) return []
        return [`${rel}:${index + 1}: ${line.trim().slice(0, 100)}`]
      })
    })
    expect(
      offenders,
      `Use <Eyebrow> — it is one spelling, in one file:\n${offenders.join('\n')}`,
    ).toEqual([])
  })

  it('reads a hand-spelled eyebrow when there is one, so the guard is not vacuous', () => {
    // The exact string this replaced, at both letterspacings it was found in.
    expect(HAND_SPELLED.test('className="text-xs font-medium tracking-wide text-muted-foreground uppercase"')).toBe(true)
    expect(HAND_SPELLED.test('className="text-xs font-medium tracking-wider text-muted-foreground uppercase"')).toBe(true)
    expect(HAND_SPELLED.test('className="text-xs font-medium text-muted-foreground"')).toBe(false)
  })
})
