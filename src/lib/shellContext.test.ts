import { describe, expect, it } from 'vitest'
import {
  describeSelection,
  describeSidebar,
  namesSelection,
} from '@/lib/shellContext'

/**
 * The line the agent reads about the sidebar.
 *
 * The case that matters is `presenting`. `asideHidden` in `EditorShell` has
 * three causes — the reader collapsed it, a presentation is running, or this
 * is the landing view — and only the first is a collapse anybody can undo by
 * expanding. Reporting the other two as "collapsed" sends the agent to a
 * control that is not on screen.
 */
describe('describeSidebar', () => {
  it('says nothing beyond the panel when the sidebar is simply open', () => {
    expect(
      describeSidebar({
        panel: 'phases',
        collapsed: false,
        overlay: false,
        presenting: false,
      }),
    ).toBe('Sidebar: phases panel')
  })

  it('names a collapse the reader chose', () => {
    expect(
      describeSidebar({
        panel: 'phases',
        collapsed: true,
        overlay: false,
        presenting: false,
      }),
    ).toBe('Sidebar: phases panel, collapsed')
  })

  it('does not call a presentation collapsed', () => {
    // The regression this file exists for. The aside is off screen, and the
    // floating navbar that would carry the expand control is off screen with
    // it — so "collapsed" points at a control the reader cannot reach.
    const line = describeSidebar({
      panel: 'phases',
      collapsed: false,
      overlay: false,
      presenting: true,
    })
    expect(line).toBe('Sidebar: phases panel, presenting')
    expect(line).not.toContain('collapsed')
  })

  it('reports overlay and collapse independently', () => {
    expect(
      describeSidebar({
        panel: 'slices',
        collapsed: true,
        overlay: true,
        presenting: false,
      }),
    ).toBe(
      'Sidebar: slices panel, collapsed, narrow viewport (it overlays the canvas when open)',
    )
  })

  it('keeps the qualifiers in one order, whichever of them apply', () => {
    // A sentence assembled from optional clauses is a sentence that can
    // reorder itself between renders; the model reads this every turn.
    expect(
      describeSidebar({
        panel: 'phases',
        collapsed: true,
        overlay: true,
        presenting: true,
      }),
    ).toBe(
      'Sidebar: phases panel, collapsed, narrow viewport (it overlays the canvas when open), presenting',
    )
  })
})

/**
 * The two lines a shell reports about its selection, and the check the
 * navigation tools run against them.
 *
 * These were the same sentence spelled four times — twice in the two shells,
 * once as a prefix constant in the navigation tools, and once again as a
 * regex in a source-text guard that read the phone's file looking for the
 * interpolation. The spelling that mattered was the one nobody had: a phone
 * release shipped without the phase line at all, and every agent-driven
 * phase jump answered "the selected phase was not verified" while the canvas
 * sat on exactly the phase asked for. Rendering and recognition now leave
 * from the same place, so the tools cannot fail to read what a shell writes.
 */
describe('describeSelection', () => {
  it('names a selected phase with its label and its id', () => {
    expect(describeSelection('phase', { id: 'p-1', label: 'Discover' })).toBe(
      'Selected phase: "Discover" (p-1)',
    )
  })

  it('names a selected scenario the same way', () => {
    expect(
      describeSelection('scenario', { id: 's-2', label: 'Walk-in intake' }),
    ).toBe('Selected scenario: "Walk-in intake" (s-2)')
  })

  it('says none in the words the tools expect when nothing is selected', () => {
    expect(describeSelection('phase', null)).toBe('Selected phase: none')
    expect(describeSelection('scenario', null)).toBe('Selected scenario: none')
  })

  it('lets a shell qualify its none without respelling the line', () => {
    // The phone's overview genuinely has no scenario open, and saying so
    // plainly reads as a fault rather than as a view. The qualifier rides on
    // the same sentence so the tools still recognise it as no selection.
    expect(describeSelection('scenario', null, 'overview')).toBe(
      'Selected scenario: none (overview)',
    )
  })
})

describe('namesSelection', () => {
  // Every row runs against a context this module rendered, not against a
  // second copy of the format: a table over the real renderer is the only
  // kind that cannot drift away from what the shells actually publish.
  const context = [
    'View level: phase',
    describeSelection('phase', { id: 'p-1', label: 'Discover' }),
    describeSelection('scenario', { id: 's-2', label: 'Walk-in intake' }),
    'Agent chat: hidden',
  ].join('\n')

  const rows: Array<[string, 'phase' | 'scenario', string, boolean]> = [
    ['the phase it reports', 'phase', 'p-1', true],
    ['the scenario it reports', 'scenario', 's-2', true],
    ['a phase it does not report', 'phase', 'p-9', false],
    ['the scenario id asked of the phase line', 'phase', 's-2', false],
    ['the phase id asked of the scenario line', 'scenario', 'p-1', false],
    ['an id that is only a suffix of the reported one', 'phase', '1', false],
  ]

  it.each(rows)('recognises %s', (_label, kind, id, expected) => {
    expect(namesSelection(context, kind, id)).toBe(expected)
  })

  it('recognises nothing in a context that reports no selection', () => {
    const empty = [
      describeSelection('phase', null),
      describeSelection('scenario', null, 'overview'),
    ].join('\n')
    expect(namesSelection(empty, 'phase', 'p-1')).toBe(false)
    expect(namesSelection(empty, 'scenario', 's-2')).toBe(false)
    // "none" is prose here, not an id, and a tool that took it for one would
    // report a landed navigation for a selection that never happened.
    expect(namesSelection(empty, 'phase', 'none')).toBe(false)
  })

  it('reads a label containing the punctuation the line is built from', () => {
    // Phase titles are reader-written; one with a parenthesis or a quote in
    // it must not make the id at the end of the line unreadable.
    const tricky = describeSelection('phase', {
      id: 'p-3',
      label: 'Triage (fast) "hot" cases',
    })
    expect(namesSelection(tricky, 'phase', 'p-3')).toBe(true)
    expect(namesSelection(tricky, 'phase', 'fast')).toBe(false)
  })
})
