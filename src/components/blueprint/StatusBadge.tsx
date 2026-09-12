import { Badge } from '@/components/ui/badge'
import { DefinitionPopover } from '@/components/blueprint/DefinitionCard'
import {
  ENTITY_STATUS_MEANING,
  ENTITY_STATUS_SHORT,
  isUnbuilt,
  type EntityStatus,
} from '@/lib/entityStatus'
import { cn } from '@/lib/utils'

/**
 * How far along a path or a cell is.
 *
 * Every status renders, `live` included. It was hidden at first on the
 * argument that the default is most of the board and a badge nobody reads is
 * worse than no badge — but that reasoning only holds in a dense list. In a
 * properties block a labelled field with no value reads as broken, and "is
 * this live?" is the first question a reader brings to a route they have not
 * seen before. Answering it costs one word.
 *
 * Three treatments, because the six values are not three kinds of the same
 * thing:
 *
 * - **live** — quiet and solid. The norm, stated.
 * - **unbuilt** (proposed / planned / built) — muted, and DASHED, echoing the
 *   dashed border those cells already carry on the canvas. One vocabulary for
 *   "this does not exist yet", in the panel and on the board.
 * - **at_risk / deprecated** — the warning tint. These describe something live
 *   and going wrong, which is the one case worth a colour.
 *
 * The word is the whole control, so the definition hangs off the word itself
 * rather than an icon beside it.
 *
 * A `DefinitionCard`, not the Tooltip this shipped with. The
 * reason was already written down one file over, in `panelShell`: a tooltip
 * never opens on touch. So `ENTITY_STATUS_MEANING` — the one authored line
 * that separates "built" from "live" — was unreadable on a phone, on a shell
 * that has a real phone posture. It was also the third shape of definition in
 * the app, and there is now one.
 */
export function StatusBadge({
  status,
  className,
  definition = true,
}: {
  status: EntityStatus | null | undefined
  className?: string
  /**
   * False inside a row that is already one control — a picker's button, its
   * checkbox label, a menu item. The word then joins that control's text
   * instead of nesting a second, focusable control inside it, which would
   * take a click meant for the row and sit where a screen reader cannot
   * reach it cleanly.
   */
  definition?: boolean
}) {
  if (!status) return null

  const needsAttention = status === 'at_risk' || status === 'deprecated'

  const badge = (
    <Badge
      // The amber treatment is the badge's OWN warning variant, asked for by
      // name rather than re-derived here out of a tint and an edge. The
      // badge is where the reasoning for that shape is written down and
      // measured, and a wrapper carrying its own copy of it is a second
      // answer to a question that already has one.
      //
      // What changes is the ink. This wrote `--foreground` on the tint —
      // ordinary copy on a tinted badge, at 20:1 — where the variant writes
      // the role's own ink for its own tint, 13:1 in light and 9:1 in dark.
      // Still far clear of AA, and now the word carries the status itself
      // rather than leaving the tint to carry it alone.
      variant={needsAttention ? 'warning' : 'outline'}
      // Reachable without a pointer: where the word IS the control, the
      // definition has to be gettable by keyboard too — hover is never the
      // only way in. No help cursor and no dotted rule — both are gone
      // everywhere; the popover is what carries the definition to a reader
      // with no pointer at all. No hover colour — see `ui/badge.tsx`.
      tabIndex={definition ? 0 : undefined}
      className={cn(
        'shrink-0 gap-0 font-normal',
        status === 'live' && 'text-foreground',
        isUnbuilt(status) && 'border-dashed text-muted-foreground',
        className,
      )}
    >
      {ENTITY_STATUS_SHORT[status]}
    </Badge>
  )

  if (!definition) return badge

  return (
    <DefinitionPopover
      sections={[
        {
          eyebrow: ENTITY_STATUS_SHORT[status],
          body: ENTITY_STATUS_MEANING[status],
        },
      ]}
    >
      {badge}
    </DefinitionPopover>
  )
}
