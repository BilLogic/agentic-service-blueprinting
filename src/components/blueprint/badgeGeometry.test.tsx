// @vitest-environment jsdom
/**
 * A badge's size is a variant of the badge, and the wrappers only name one.
 *
 * `PathLabelBadge`, `PathKindBadge` and `ScenarioTitleBadge` each used to
 * write their own height, padding and type scale around `<Badge>`, and the
 * three of them did not agree: all three called their small shape "compact"
 * and all three meant something different by it. The sizes now live in
 * `ui/badge.tsx` as a `size` variant (#149), which is only an improvement if
 * the pixels did not move — so this file pins the four utilities each shape
 * resolves to, for every value of `compact` the app passes.
 *
 * IT READS THE RESOLVED CLASS LIST, not the source. `cn` is tailwind-merge, so
 * what a wrapper writes and what the browser gets are different strings, and
 * the second is the one a reader sees. The numbers below were taken from the
 * rendered output BEFORE the variant existed.
 *
 * Only unmodified utilities count. `has-data-[icon=inline-end]:pr-1.5` and
 * `[&>svg]:size-3!` are on every badge and always were; they say when a size
 * applies to something else, not how big this badge is.
 */
import type { ReactElement } from 'react'
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { PathKindBadge } from '@/components/blueprint/PathKindBadge'
import { PathLabelBadge } from '@/components/blueprint/PathLabelBadge'
import { ScenarioTitleBadge } from '@/components/blueprint/ScenarioTitleBadge'
import { Badge } from '@/components/ui/badge'

afterEach(cleanup)

/** Colour is not size: `text-muted-foreground` is on more badges than any size. */
const TEXT_SIZES = new Set(['3xs', '2xs', 'xs', 'sm', 'base', 'lg'])

function isGeometry(token: string) {
  if (token.includes(':')) return false
  const text = /^text-(.+)$/.exec(token)
  if (text) return TEXT_SIZES.has(text[1])
  return /^(p[xytrbl]?|h|min-h|max-h)-\S+$/.test(token)
}

/**
 * Every class on the badge in `ui`.
 *
 * Found by `group/badge` rather than `data-slot="badge"`: two of these three
 * wrappers hand the badge to a tooltip or popover as its trigger, and the
 * trigger's own slot name replaces the badge's on the way through.
 */
function classesOf(ui: ReactElement) {
  const { container } = render(ui)
  const badge = container.querySelector('.group\\/badge')
  if (!badge) throw new Error('no badge rendered')
  return [...badge.classList]
}

/** The height, padding and type scale that badge actually resolves to. */
function geometryOf(ui: ReactElement) {
  return classesOf(ui).filter(isGeometry).sort()
}

describe('the size a wrapper asks for is the size it used to write', () => {
  const shapes: Array<[string, () => ReactElement, string[]]> = [
    [
      'a bare badge is the default size',
      () => <Badge>Draft</Badge>,
      ['h-5', 'px-2', 'py-0.5', 'text-xs'],
    ],
    [
      'a compact path label is the default size',
      () => (
        <PathLabelBadge
          name="Happy Path"
          summary={null}
          pathKind="happy"
          compact
          showTooltip={false}
        />
      ),
      ['h-5', 'px-2', 'py-0.5', 'text-xs'],
    ],
    [
      'a full-size path label is comfortable',
      () => (
        <PathLabelBadge
          name="Happy Path"
          summary={null}
          pathKind="happy"
          showTooltip={false}
        />
      ),
      ['h-auto', 'px-2.5', 'py-1', 'text-sm'],
    ],
    [
      // The one the issue did not expect: this wrapper's `compact` kept the
      // roomy padding and moved only the type scale, so it is NOT the
      // default size.
      'a compact path kind keeps the roomy padding',
      () => <PathKindBadge pathKind="happy" compact />,
      ['h-auto', 'px-2.5', 'py-1', 'text-xs'],
    ],
    [
      'a full-size path kind is comfortable',
      () => <PathKindBadge pathKind="happy" />,
      ['h-auto', 'px-2.5', 'py-1', 'text-sm'],
    ],
    [
      // A container's title hugs its text: the default size's padding at its
      // type scale, but 16px rather than a held 20px.
      'a scenario title is fitted',
      () => <ScenarioTitleBadge name="Warm-Up" />,
      ['h-auto', 'px-2', 'py-0.5', 'text-xs'],
    ],
  ]

  it.each(shapes)('%s', (_name, mount, expected) => {
    expect(geometryOf(mount())).toEqual(expected)
  })
})

describe('what moving the size out of the wrappers did not change', () => {
  it('keeps everything a wrapper writes that is not a size', () => {
    const classes = classesOf(
      <PathLabelBadge
        name="Happy Path"
        summary={null}
        pathKind="happy"
        showTooltip={false}
      />,
    )
    for (const kept of [
      'max-w-full',
      'cursor-default',
      'gap-1',
      'border-transparent',
      'font-semibold',
    ]) {
      expect(classes).toContain(kept)
    }
  })

  it('still lets a call site override the variant it is given', () => {
    // The phase badge on the canvas asks for `text-2xs`, a scale the variant
    // does not offer. `className` is merged last, so it still wins.
    const classes = classesOf(
      <ScenarioTitleBadge name="Warm-Up" className="font-mono text-2xs" />,
    )
    expect(classes).toContain('text-2xs')
    expect(classes).not.toContain('text-xs')
  })
})
