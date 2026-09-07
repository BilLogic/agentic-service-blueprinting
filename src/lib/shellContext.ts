/**
 * How the editor shell describes its sidebar to the agent.
 *
 * This is a sentence the model reads, so it is code with a reader — and it
 * got that reader wrong. The shell publishes the sidebar's state three times
 * (the collapsed context, the floating navbar's gate, and this line) from one
 * fact that was written out longhand each time. Two copies said
 * `collapsed && !presenting && !isLanding`; the third said "collapsed"
 * whenever the aside was hidden at all, which is also true while presenting
 * and on the landing view.
 *
 * A reader mid-presentation asking "where did the sidebar go?" was told it was
 * collapsed and to expand it — when presentation hides the navbar entirely and
 * Return is the way back. `EditorShell` already warns about exactly this
 * conflation, in a comment on one of the two lines that got it right.
 *
 * Extracted so the sentence can be asserted without mounting the shell.
 */
export type SidebarPosture = {
  /** Which panel the rail has selected. */
  panel: string
  /** Collapsed BY THE READER — not merely an aside that is not on screen. */
  collapsed: boolean
  /** Narrow viewport: the aside draws over the canvas when open. */
  overlay: boolean
  /** Presentation is full-bleed; the aside is gone and Return is the way out. */
  presenting: boolean
}

/**
 * One line naming the sidebar's state, or as much of it as is true.
 *
 * Order is deliberate and matches the other shell lines: what it is, then
 * every qualifier that applies, each earning its clause independently.
 */
export function describeSidebar({
  panel,
  collapsed,
  overlay,
  presenting,
}: SidebarPosture): string {
  const notes = [
    collapsed ? 'collapsed' : null,
    overlay ? 'narrow viewport (it overlays the canvas when open)' : null,
    presenting ? 'presenting' : null,
  ].filter(Boolean)
  return `Sidebar: ${panel} panel${notes.length > 0 ? `, ${notes.join(', ')}` : ''}`
}
