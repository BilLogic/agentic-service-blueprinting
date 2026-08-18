/**
 * The cover page's content model.
 *
 * Types only — no strings live here. The renderers in this directory are
 * skinned entirely by a `CoverContent` object supplied by the deployment
 * (`src/content/coverContent.ts` in this repo). That split is what lets a
 * fork change every label, figure, and link without touching a component.
 */

/** One figure on its plate. Dimensions come from the SVG's viewBox so the
 * page reserves the right box before the image decodes. */
export type CoverFigure = {
  /** Public path, e.g. `/cover/blueprint-anatomy.svg`. Never a filename the
   * component knows about — the content module owns the whole path. */
  src: string
  /** What the figure shows, not what it is called. */
  alt: string
  width: number
  height: number
}

/**
 * Every section's figure is optional, and an absent one is a first-class
 * state rather than a defect: a section whose figure has not been authored
 * yet renders prose-only. No placeholder box, no broken `src` — the copy for
 * those sections is written to stand on its own, and dropping the figure in
 * later is a one-line edit to this deployment's content module.
 */

/** A quiet inline link out to the repository's guide. Rendered only when the
 * deployment has configured a `repoUrl`; there is no button form. */
export type CoverGuideLink = {
  label: string
  /** Repo-relative, e.g. `docs/guide/01-the-blueprint-model.md`. */
  docPath: string
}

export type CoverSection =
  | {
      kind: 'prose'
      id: string
      heading?: string
      /** Paragraphs may carry `**bold**`, `*italic*`, and `` `code` `` runs. */
      paragraphs: string[]
      figure?: CoverFigure
    }
  | {
      kind: 'figure'
      id: string
      heading?: string
      figure: CoverFigure
    }
  | {
      kind: 'defs'
      id: string
      heading?: string
      intro?: string
      /** Header row for the definition table. Both cells are copy. */
      columns: { term: string; definition: string }
      items: { term: string; definition: string }[]
      figure?: CoverFigure
    }
  | {
      kind: 'skill'
      id: string
      /** The invocation, e.g. `/sb:map`. Rendered as a click-to-copy chip. */
      command: string
      purpose: string
      producesLabel: string
      produces: string
      figure?: CoverFigure
    }

export type CoverTab = {
  value: string
  label: string
  /** One orienting sentence above the tab's first section. */
  intro?: string
  sections: CoverSection[]
  /** Appended after the last section, when `repoUrl` is set. */
  link?: CoverGuideLink
}

export type CoverContent = {
  /** Falls back to `ORG_NAME` when absent — the usual case. */
  title?: string
  lede: string
  /** The page's only button. */
  primaryCtaLabel: string
  /** Repository host root; guide links are dropped when it is absent. */
  repoUrl?: string
  /** Labels for the click-to-copy command chips. */
  chip: { copyLabel: string; copiedLabel: string }
  /** Degraded-state sentences the surrounding app may show. */
  states: { noSlices: string }
  tabs: CoverTab[]
}

/** Every figure actually referenced in a content tree, in reading order.
 * Sections with an empty figure slot contribute nothing. */
export function coverFigures(content: CoverContent): CoverFigure[] {
  const figures: CoverFigure[] = []
  for (const tab of content.tabs) {
    for (const section of tab.sections) {
      if (section.figure) figures.push(section.figure)
    }
  }
  return figures
}
