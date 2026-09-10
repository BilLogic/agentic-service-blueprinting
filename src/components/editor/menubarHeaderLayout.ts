/** Shared layout classes for blueprint canvas menubar headers. */
export const BLUEPRINT_MENUBAR_HEADER_CLASS =
  'relative h-9 w-full max-w-full shrink-0 items-center gap-3 rounded-none border-0 bg-transparent px-3 py-0 shadow-none'

/** Docked navbar bar — same surface/elevation as the side nav. */
export const BLUEPRINT_NAVBAR_BAR_CLASS =
  'relative shrink-0 border-b border-border bg-sidebar px-4'

/**
 * Cell-detail drawer top offset. The drawer is portalled to the body, so it
 * cannot inherit the chrome above it — the panel measures the canvas region
 * (`[data-slide-canvas]`) at open time and publishes the result in this
 * variable. The fallback is the base view's docked h-9 navbar + border; a
 * slice tab, which stacks its header band on top, resolves taller and no
 * longer covers it.
 */
export const CELL_DETAIL_PANEL_TOP_VAR = '--cell-detail-panel-top'
export const CELL_DETAIL_PANEL_TOP_CLASS =
  '!top-[var(--cell-detail-panel-top,calc(2.25rem+1px+1rem))]'

/** Gap between the canvas top edge and the panel — matches its right inset. */
export const CELL_DETAIL_PANEL_TOP_GAP_PX = 16

/**
 * Cell-detail drawer bottom offset — the top pattern's counterpart. Keeps the
 * drawer clear of the bottom canvas chrome (the annotation toolbar band) with
 * the same 16px breathing room as CELL_DETAIL_PANEL_TOP_GAP_PX.
 */
/**
 * Height of the bottom canvas chrome (the annotation toolbar band) plus the
 * same 16px breathing room the top gap uses. Named, because a bare
 * `bottom-[61px]` is a number nobody can check against the thing it clears.
 */
export const CELL_DETAIL_PANEL_BOTTOM_GAP_PX = 61
/*
  Written out, not interpolated. Tailwind reads SOURCE text: a template
  literal produces a class at runtime that the compiler never saw, so
  `!bottom-[61px]` had no rule behind it and the drawer ran to the bottom of
  the viewport, under the annotation toolbar. The test below keeps the literal
  and the constant in step.
*/
export const CELL_DETAIL_PANEL_BOTTOM_CLASS = '!bottom-[61px]'

/** The canvas region the panel measures against. */
export const CANVAS_REGION_SELECTOR = '[data-slide-canvas]'

/** Flattens the menubar when it sits inside the docked navbar bar. */
export const BLUEPRINT_MENUBAR_FLAT_CLASS =
  'relative h-9 rounded-none border-0 bg-transparent px-0 py-0 shadow-none'

/**
 * Left-aligned title + paths control row. Right padding keeps the row clear
 * of the absolutely-positioned zoom indicator / Reset View cluster.
 */
export const BLUEPRINT_MENUBAR_TITLE_CLASS =
  'relative z-10 flex h-full min-w-0 max-w-[calc(100%-9rem)] items-center gap-2.5 px-1'

export const BLUEPRINT_MENUBAR_SUMMARY_CLASS =
  'min-w-0 truncate text-xs text-muted-foreground'

/**
 * The identity block's pinned height: the title line, then the summary line.
 *
 * Reserved, not sized to content. The summary is conditional at every call
 * site — `service.summary ? <p> : null`, a scenario with no description — and
 * on the service bar it arrives a round-trip after the bar does. A block that
 * sizes to content therefore grows by a line under the reader's cursor when
 * the query lands, and the canvas below it jumps. Two lines are held whether
 * or not the second one has anything in it.
 *
 * A LENGTH and not a Tailwind class, so the bars agree on one value a test
 * can read back off the box: the claim is that five different states measure
 * the same, and a class name cannot be measured. 24px title row (a 20px
 * `text-sm` line box inside `EntityTitleAffordance`'s `py-0.5`) + 2px for the
 * block's `gap-0.5` + a 16px `text-xs` summary line.
 */
export const BLUEPRINT_MENUBAR_IDENTITY_HEIGHT = '2.625rem'

export const BLUEPRINT_MENUBAR_TITLE_TEXT_CLASS =
  'shrink-0 text-sm font-semibold tracking-tight text-foreground'

export const BLUEPRINT_MENUBAR_SEPARATOR_CLASS =
  'shrink-0 text-xs text-muted-foreground/70'
