import { Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { IconTooltip } from '@/components/editor/IconTooltip'
import {
  useEntityDetail,
  type EntityDetailKind,
} from '@/contexts/EntityDetailContext'
import { cn } from '@/lib/utils'

const KIND_LABELS: Record<EntityDetailKind, string> = {
  service: 'Service properties',
  lane: 'Lane properties',
  phase: 'Phase properties',
  scenario: 'Scenario properties',
  step: 'Step properties',
}

/**
 * The ⓘ that opens an entity's properties. One component for every level,
 * so the affordance reads as one family and nobody has to learn it twice.
 *
 * On a LANE it is a button of its own, and that is the interesting case: a
 * lane label already means two different things depending on where it is
 * rendered — inert prose in the grid, and "select every cell in this lane" in
 * the label rail's Design mode. Neither is "show me its properties", and
 * teaching either a third reading would make the rail's selection handle
 * ambiguous. So the button is separate, sized and inked like `SidebarNav`'s
 * row actions (24px target, 14px glyph, no fill of its own, because the row it
 * sits in already has one).
 *
 * ALWAYS VISIBLE, and that is #140 Q11 rather than a style choice. It carried
 * a `revealOnHover` mode — transparent at rest, drawn on hover — which no
 * caller ever used and which no touch reader could ever have seen. ⓘ means
 * "opens the panel" everywhere in this app now, and a signifier a reader
 * cannot see is not a signifier.
 */
export function EntityPropertiesButton({
  kind,
  id,
  name,
  className,
}: {
  kind: EntityDetailKind
  id: string
  /** Named in the accessible label — several of these can share one screen. */
  name: string
  className?: string
}) {
  const { toggleEntity } = useEntityDetail()
  const label = KIND_LABELS[kind]
  return (
    <IconTooltip label={label}>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        // The tooltip says what it does; this says which one. "Lane
        // properties" five times over tells a screen-reader user nothing.
        aria-label={`${label}: ${name}`}
        className={cn(
          'size-6 shrink-0 text-muted-foreground/60 hover:text-foreground',
          className,
        )}
        onClick={(event) => {
          // The label rail's lane button, the phase section and the canvas all
          // listen above this: opening a panel is not a selection, not a
          // navigation and not a pan.
          event.stopPropagation()
          toggleEntity({ kind, id })
        }}
      >
        <Info className="size-3.5" />
      </Button>
    </IconTooltip>
  )
}
