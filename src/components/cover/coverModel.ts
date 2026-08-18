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
  /**
   * Wide-and-short figures may sit beside their prose at `lg`. Tall ones
   * always stack, because a tall figure in a half-width column is unreadable.
   */
  wide?: boolean
}

/** A CTA the page can offer. Link items resolve against `repoUrl` and
 * disappear when the deployment has not configured one. */
export type CoverCtaItem =
  | { kind: 'openCanvas'; label: string }
  | { kind: 'openSlice'; label: string }
  | { kind: 'presentSlice'; label: string }
  | { kind: 'link'; label: string; docPath: string }

export type CoverSection =
  | {
      kind: 'prose'
      id: string
      heading?: string
      /** Paragraphs may carry `**bold**` runs for terms on first definition. */
      paragraphs: string[]
      figure?: CoverFigure
    }
  | {
      kind: 'defs'
      id: string
      heading?: string
      intro?: string
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
      figure: CoverFigure
    }
  | { kind: 'cta'; id: string; items: CoverCtaItem[] }

export type CoverTab = {
  value: string
  label: string
  sections: CoverSection[]
}

export type CoverContent = {
  /** Falls back to `ORG_NAME` when absent — the usual case. */
  title?: string
  lede: string
  primaryCtaLabel: string
  /** Repository host root; link CTAs are dropped when it is absent. */
  repoUrl?: string
  /** Shown in place of the slice CTAs when the workspace holds no slices. */
  sliceEmptyNote: string
  tabs: CoverTab[]
}

/** What the shared components need from the app to make their CTAs work. */
export type CoverSliceState =
  | { status: 'loading' }
  | { status: 'ready'; sliceId: string }
  | { status: 'empty' }

export type CoverActions = {
  openCanvas: () => void
  openSlice: (sliceId: string) => void
  presentSlice: (sliceId: string) => void
  slice: CoverSliceState
}

/** Every figure referenced anywhere in a content tree, in reading order. */
export function coverFigures(content: CoverContent): CoverFigure[] {
  const figures: CoverFigure[] = []
  for (const tab of content.tabs) {
    for (const section of tab.sections) {
      if (section.kind === 'cta') continue
      if (section.figure) figures.push(section.figure)
    }
  }
  return figures
}
