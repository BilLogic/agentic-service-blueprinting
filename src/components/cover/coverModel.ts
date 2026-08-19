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

/**
 * A small figure beside text — a logomark, an avatar, a portrait. The
 * distinct type from `CoverFigure` matters: that one is a wide diagram
 * plate, sized from its own viewBox and rendered at `COVER_MEASURE`. This
 * one is a fixed, small square meant to sit next to a heading, and blowing
 * it up to the page measure would blur a logomark or let a character
 * illustration dominate a page otherwise made of technical diagrams.
 */
export type CoverPortraitImage = {
  src: string
  alt: string
  /** `badge` — a small mark (~80px), no border, no white ground: for a
   * logomark or icon that already reads on any background. `framed` — a
   * larger square (~200px) with a border and a white card behind it: for an
   * illustration authored for its own light ground, the same convention
   * `CoverFigure` uses for full diagrams. */
  size: 'badge' | 'framed'
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
      kind: 'portrait'
      id: string
      heading?: string
      /** Paragraphs may carry `**bold**`, `*italic*`, and `` `code` `` runs. */
      paragraphs: string[]
      image: CoverPortraitImage
    }
  | {
      kind: 'skill'
      id: string
      /** The invocation, e.g. `/sb:map`. Rendered as a click-to-copy chip and
       * doubling as the panel's title. */
      command: string
      /** What the skill does AND what it leaves behind, as one paragraph.
       * This used to be two fields — `purpose` and a separate `produces`
       * line below the figure — which put a skill's output on its own
       * visual rung underneath the illustration instead of reading as part
       * of what the skill is. One field, one sentence the author folds the
       * output into. */
      description: string
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

/**
 * Every image actually referenced in a content tree, in reading order —
 * wide figures and portrait images alike, since both resolve to a `src` on
 * disk and the asset-existence tests want to walk both without caring which
 * kind they are. Sections with no image slot filled contribute nothing.
 */
export function coverFigures(
  content: CoverContent,
): Array<{ src: string; alt: string }> {
  const images: Array<{ src: string; alt: string }> = []
  for (const tab of content.tabs) {
    for (const section of tab.sections) {
      if ('figure' in section && section.figure) images.push(section.figure)
      if ('image' in section && section.image) images.push(section.image)
    }
  }
  return images
}
