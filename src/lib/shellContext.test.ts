import { describe, expect, it } from 'vitest'
import { describeSidebar } from '@/lib/shellContext'

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
