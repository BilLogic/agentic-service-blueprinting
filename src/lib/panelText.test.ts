import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { PANEL_TEXT } from '@/lib/panelText'

const SRC = fileURLToPath(new URL('..', import.meta.url))

/**
 * Collect every .ts/.tsx file under `src/`, skipping nothing: a label class
 * pasted in a test is still a pasted label class.
 *
 * @param {string} dir - Directory to walk.
 * @returns {string[]} Absolute paths.
 */
function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) out.push(full)
  }
  return out
}

/**
 * Every quoted string in a file, split into the classes it spells.
 *
 * A `className` is a class LIST, not a class name, and this guard used to
 * match the token only as a complete quoted literal — `'…'`, `"…"`, `` `…` ``
 * and nothing else. That reads straight past the one shape that actually
 * drifts: the token with something in front of it.
 * `"mt-2 text-xs font-medium text-foreground"` is the heading token plus a
 * margin, and a literal match cannot see it. Five call sites spelled a token
 * that way while this file was green, and `EditorChrome`'s own
 * `"shrink-0 truncate text-xs font-medium text-foreground"` — fixed by hand in
 * the change that named these roles — was never what failed here either.
 *
 * So the unit is the class list and the test is a subset: a string that
 * carries every class of a token spells that token, whatever else it carries
 * and in whatever order. Order is not part of a token and the match must not
 * depend on it: `CellEvidenceTab` wrote
 * `text-xs font-medium break-words text-foreground`, which no substring
 * search for the token finds at all.
 *
 * A line at a time, which is how `tokenModel.classUses` reads the same tree
 * and is not a shortcut: an apostrophe in prose — `the control's own sizing` —
 * opens a string as far as a regex is concerned, and a whole-file scan lets
 * one of those swallow every class list after it. Line by line, a stray
 * apostrophe costs its own line and nothing else. The price is a class list
 * broken across lines, which nothing in this tree writes.
 *
 * @param {string} source - File contents.
 * @returns {{ line: number; classes: Set<string>; text: string }[]} One entry
 *   per quoted string.
 */
function classLists(
  source: string,
): { line: number; classes: Set<string>; text: string }[] {
  const out: { line: number; classes: Set<string>; text: string }[] = []
  source.split('\n').forEach((line, index) => {
    for (const match of line.matchAll(/'([^']*)'|"([^"]*)"|`([^`]*)`/g)) {
      const text = match[1] ?? match[2] ?? match[3] ?? ''
      const classes = text.split(/\s+/).filter(Boolean)
      if (classes.length === 0) continue
      out.push({ line: index + 1, classes: new Set(classes), text })
    }
  })
  return out
}

/**
 * Files that spell a label token's classes without being a label, and why.
 *
 * Named here rather than carved out of the matcher, and the argument is the
 * one `tokenDiscipline.test.ts` makes for its vendored font sizes: a pattern
 * narrowed to dodge a real case reads, to the next person, as a rule that
 * never covered it. A subset match is the whole rule — "these classes,
 * together, are the label" — and every string below really does carry them.
 * What each one does not carry is the ROLE.
 *
 * All three are shaped controls: a border, a background, a shadow, a pressed
 * or hovered counterpart. The muted ink in them is half of a state pair with
 * the border or the track, not a label's ink, and it moves when the control is
 * hovered or pressed. A label's does not. That is the line — text-only
 * treatments in this tree are label roles and went to the tokens; a bordered
 * button is a button that happens to agree with a label on three utilities.
 *
 * Every entry is asserted below to still spell a token, so a file that stops
 * needing its exemption loses it instead of leaving a dead carve-out behind
 * for the next pasted label to slip through.
 */
const LABEL_CLASS_LOOKALIKES: ReadonlyArray<{ file: string; because: string }> = [
  {
    file: 'components/editor/SegmentedControl.tsx',
    because:
      "the segment's resting treatment, half of an on/off pair with its `aria-pressed:` classes — the control's own sizing vocabulary, not a label",
  },
  {
    file: 'components/blueprint/BlueprintColumnHandles.tsx',
    because:
      'a bordered, backgrounded column-selection handle; its muted ink moves with `hover:border-primary`, so it is a hover pair rather than a label',
  },
  {
    file: 'components/blueprint/FeaturedResources.tsx',
    because:
      'a bordered link button with a glyph — button chrome that shares three utilities with the heading token',
  },
]

/** The classes of `token`, all present in one class list, in any order. */
const spells = (classes: Set<string>, token: string): boolean =>
  token.split(' ').every((name) => classes.has(name))

const TOKENS = [
  ['sectionHeading', PANEL_TEXT.sectionHeading],
  ['sectionLabel', PANEL_TEXT.sectionLabel],
] as const

/**
 * Every class list under `src/` that spells one of the label tokens.
 *
 * @param {string} token - The class list a token names.
 * @returns {string[]} `file:line: classes` for each, exemptions included.
 */
function spelledInline(token: string): string[] {
  const out: string[] = []
  for (const file of walk(SRC)) {
    if (file.endsWith('panelText.ts') || file.endsWith('panelText.test.ts')) continue
    const name = relative(SRC, file).split('\\').join('/')
    for (const list of classLists(readFileSync(file, 'utf8'))) {
      if (spells(list.classes, token)) out.push(`${name}:${list.line}: ${list.text}`)
    }
  }
  return out
}

const isExempt = (use: string): boolean =>
  LABEL_CLASS_LOOKALIKES.some((entry) => use.startsWith(`${entry.file}:`))

describe('panel label tokens', () => {
  it('names two label styles, and they are not the same', () => {
    expect(PANEL_TEXT.sectionHeading).toBe('text-xs font-medium text-foreground')
    expect(PANEL_TEXT.sectionLabel).toBe('text-2xs font-medium text-muted-foreground')
    expect(PANEL_TEXT.sectionHeading).not.toBe(PANEL_TEXT.sectionLabel)
  })

  it.each(TOKENS)(
    'is the only place %s is spelled as classes, in any class list',
    (_name, token) => {
      const pasted = spelledInline(token).filter((use) => !isExempt(use))
      expect(
        pasted,
        `${_name} classes spelled inline — write cn(PANEL_TEXT.${_name}, …) instead, ` +
          `or name the file in LABEL_CLASS_LOOKALIKES with the reason it is not a label:\n${pasted.join('\n')}`,
      ).toEqual([])
    },
  )

  it('every lookalike exemption is still a file that spells a token', () => {
    const spelled = TOKENS.flatMap(([, token]) => spelledInline(token))
    const stale = LABEL_CLASS_LOOKALIKES.filter(
      (entry) => !spelled.some((use) => use.startsWith(`${entry.file}:`)),
    ).map((entry) => entry.file)
    expect(
      stale,
      `Exempted from the label rule but no longer spelling a token: ${stale.join(', ')}. ` +
        'If the file moved, move the exemption with it; if the classes are gone, delete the exemption.',
    ).toEqual([])
  })
})
