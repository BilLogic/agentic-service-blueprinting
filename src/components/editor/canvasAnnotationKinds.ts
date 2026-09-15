import {
  ANNOTATION_STICKY_SWATCHES,
  ANNOTATION_STROKE_SWATCHES,
  type PlacedAnnotation,
} from '@/lib/canvasAnnotations'

/**
 * WHAT EACH KIND OF MARK IS, AS A TABLE.
 *
 * There were three style bars and three mark nodes, and the differences
 * between them were smaller than the files were: the sticky bar was the text
 * bar without its alignment control, the three marks shared their pointer
 * handler to the line, and every bar ended in the same delete button under a
 * different noun. A copy per kind meant a fourth kind would be a seventh and
 * an eighth file, and meant a fix — an aria label, a divider, the rule for
 * what a press on a label does — had to be made two or three times or be
 * wrong somewhere.
 *
 * So the per-kind differences are written down here instead, and there is one
 * bar (`AnnotationStyleBar.tsx`) and one mark (`AnnotationMarkNode.tsx`) that
 * read them. A fourth kind of mark is a row in this file.
 *
 * This table says WHICH controls a kind offers and in what grouping; it does
 * not say how any of them is drawn. The drawing is the bar's, once per
 * control, which is the half that was being copied.
 */

export type AnnotationMarkKind = 'shape' | 'sticky' | 'text'

/**
 * One control in a style bar. The id picks the control the bar draws; the
 * rest is what that control cannot know without being told — which swatch set
 * a colour picker offers, and what a delete button calls the thing it deletes.
 */
export type AnnotationBarControl =
  | { id: 'shapeType' }
  | { id: 'fill' }
  | { id: 'stroke' }
  | {
      id: 'color'
      /** The swatches this kind's ink is chosen from. */
      swatches: readonly string[]
      /** Read to a screen reader before the swatch's own name. */
      swatchLabel: string
    }
  | { id: 'fontSize' }
  | { id: 'bold' }
  | { id: 'strike' }
  | { id: 'align' }
  | { id: 'delete'; label: string }

/**
 * A kind of mark, as the bar and the node need it.
 *
 * `controls` is a list of GROUPS, not of controls: the bar draws a rule
 * between groups and nothing between the members of one, which is what keeps
 * bold and strikethrough sitting together the way they always have.
 */
export type AnnotationMarkDescriptor = {
  controls: readonly (readonly AnnotationBarControl[])[]
  /**
   * Whether a press on the mark's own label opens the editor instead of
   * starting a drag. True of the shape, whose label sits inside a box big
   * enough to drag by elsewhere; the sticky and the text mark ARE their
   * editors, so the textarea takes the press before this could.
   */
  editOnLabelPress: boolean
}

export const ANNOTATION_MARK_KINDS: Record<
  AnnotationMarkKind,
  AnnotationMarkDescriptor
> = {
  shape: {
    controls: [
      [{ id: 'shapeType' }],
      [{ id: 'fill' }],
      [{ id: 'stroke' }],
      [{ id: 'delete', label: 'Delete shape' }],
    ],
    editOnLabelPress: true,
  },
  sticky: {
    controls: [
      [
        {
          id: 'color',
          swatches: ANNOTATION_STICKY_SWATCHES,
          swatchLabel: 'Sticky',
        },
      ],
      [{ id: 'fontSize' }],
      [{ id: 'bold' }, { id: 'strike' }],
      [{ id: 'delete', label: 'Delete sticky' }],
    ],
    editOnLabelPress: false,
  },
  text: {
    controls: [
      [
        {
          id: 'color',
          swatches: ANNOTATION_STROKE_SWATCHES,
          swatchLabel: 'Text',
        },
      ],
      [{ id: 'fontSize' }],
      [{ id: 'bold' }, { id: 'strike' }],
      [{ id: 'align' }],
      [{ id: 'delete', label: 'Delete text' }],
    ],
    editOnLabelPress: false,
  },
}

/** Which row of the table a mark is. A rectangle and an ellipse are one kind. */
export function annotationMarkKind(mark: PlacedAnnotation): AnnotationMarkKind {
  if (mark.type === 'sticky') return 'sticky'
  if (mark.type === 'text') return 'text'
  return 'shape'
}
