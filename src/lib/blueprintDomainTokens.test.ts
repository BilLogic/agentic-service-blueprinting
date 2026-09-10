import { describe, expect, it } from 'vitest'
import { declarationsIn, stylesheet } from '@/lib/tokenModel'

/**
 * The board's own vocabulary — the L4 domain layer — and the two ways it rots.
 *
 * `blueprint.css` hands a cell its colours through custom properties because
 * the colour comes from row data, so there is no static class to write. Sixteen
 * blocks (nine lane roles, seven touchpoint tones) each set the same set of
 * properties, and that repetition is where both failures live.
 *
 * ONE. Two names, one value. `--background-blueprint-cell-origin` held the same
 * value as `--background-blueprint-cell` in all sixteen blocks, and
 * `--ring-blueprint-cell-soft` the same value as `--ring-blueprint-cell` in all
 * sixteen — 32 declarations that had to agree with 32 others, with nothing
 * saying so. `ui/button.tsx` chained through both as if they could differ. That
 * is the plan's headline shape: a value that must equal another value, and no
 * statement of it.
 *
 * TWO. The prose above the blocks is the only inventory of these names, and it
 * has disagreed with the code twice — it said "ten properties" over a list of
 * seven, then "seven" over a set that only had five distinct values. A comment
 * is the interface here, so it is asserted like one.
 */

const FILE = 'blueprint.css'

/** The `[data-blueprint-lane=…]` / `[data-blueprint-tone=…]` blocks. */
function roleBlocks(): Map<string, Map<string, string>> {
  const blocks = new Map<string, Map<string, string>>()
  for (const entry of declarationsIn(FILE)) {
    if (!/^\[data-blueprint-(lane|tone)='[^']+'\]$/.test(entry.selector)) continue
    const block = blocks.get(entry.selector) ?? new Map<string, string>()
    block.set(entry.name, entry.value)
    blocks.set(entry.selector, block)
  }
  return blocks
}

const NUMBER_WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
]

describe('the blueprint domain tokens', () => {
  it('reads the role blocks', () => {
    // Nine lanes plus seven tones. Asserted so that a selector or parser
    // change cannot make every rule below pass against an empty set — the
    // failure mode Part 4 of the visual-vocabulary plan names for all four
    // guards it audited.
    expect(roleBlocks().size).toBe(16)
  })

  it('gives no two properties the same value in every block', () => {
    const blocks = [...roleBlocks().values()]
    const names = [...new Set(blocks.flatMap((block) => [...block.keys()]))].sort()
    const twinned: string[] = []
    for (let i = 0; i < names.length; i += 1) {
      for (let j = i + 1; j < names.length; j += 1) {
        const [a, b] = [names[i], names[j]]
        const comparable = blocks.filter(
          (block) => block.has(a) && block.has(b),
        )
        if (comparable.length !== blocks.length) continue
        if (comparable.every((block) => block.get(a) === block.get(b))) {
          twinned.push(`${a} === ${b} in all ${blocks.length} blocks`)
        }
      }
    }
    expect(twinned).toEqual([])
  })

  it('inventories in prose exactly the properties it declares', () => {
    const text = stylesheet(FILE).text
    const comment = /CELL SEMANTIC TOKENS[\s\S]*?\*\//.exec(text)
    expect(comment).not.toBeNull()
    const documented = [
      ...(comment as RegExpExecArray)[0].matchAll(
        /^\s*\*\s+(--[a-z-]+)\s\s+\S/gm,
      ),
    ].map((match) => match[1])
    const declared = [
      ...new Set([...roleBlocks().values()].flatMap((block) => [...block.keys()])),
    ]
    expect([...documented].sort()).toEqual([...declared].sort())

    // And the count the sentence claims, spelled the way the sentence spells it.
    const claimed = /defines the same (\w+) properties/.exec(
      (comment as RegExpExecArray)[0],
    )
    expect(claimed?.[1]).toBe(NUMBER_WORDS[declared.length])
  })
})
