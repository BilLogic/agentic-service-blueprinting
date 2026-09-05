import { EntityDefinitionPopover } from '@/components/blueprint/EntityDefinitionPopover'
import { EntityTitleAffordance } from '@/components/blueprint/EntityTitleAffordance'
import {
  BLUEPRINT_MENUBAR_IDENTITY_HEIGHT,
  BLUEPRINT_MENUBAR_SUMMARY_CLASS,
  BLUEPRINT_MENUBAR_TITLE_CLASS,
} from '@/components/editor/menubarHeaderLayout'
import { Badge } from '@/components/ui/badge'
import { DeferredSkeleton } from '@/components/ui/deferred-skeleton'
import { Skeleton } from '@/components/ui/skeleton'
import type { EntityDetailKind } from '@/contexts/EntityDetailContext'
import { useShellBooting } from '@/contexts/shellBootStore'
import { ENTITY_KIND_DEFINITIONS } from '@/lib/panelTerms'
import { cn } from '@/lib/utils'

/**
 * How far along the identity is. The three settled `QueryResult` states, with
 * `ready` split by whether there is anything to name: a surface fed by props
 * is simply always ready.
 */
export type EntityHeaderStatus = 'loading' | 'ready' | 'error'

export type EntityHeaderProps = {
  kind: EntityDetailKind
  /** The row the title opens. Absent while loading, or when there is none. */
  id?: string | null
  /** What it is called. Absent for the same reasons. */
  label?: string | null
  /** What it is, under the name. Conditional at every call site. */
  summary?: string | null
  status?: EntityHeaderStatus
  /** The failure, in the SUMMARY slot. Read only when `status` is `error`. */
  message?: string | null
  className?: string
}

/**
 * The identity block's own skeleton session.
 *
 * Deliberately NOT `EDITOR_BOOT_HOLD_KEY`. That key is the shell's boot lane,
 * and a shared hold key is ONE session with one fade — the right tool for
 * stages of a waterfall that hand off to each other, which this bar is not a
 * stage of. It draws its own skeleton in its own session — the hold-key rule
 * `DeferredSkeleton` states.
 *
 * That is a different question from WHEN the session may end, and the two were
 * answered as one until #253. This bar waits on its query AND on the shell's
 * boot lane, so the bar, the sidebar and the board arrive on one beat instead
 * of the bar finishing first over a screen that is still loading.
 */
/**
 * Shared with `PathSelectorMenu` (#265): the path control sits in the same bar, so the
 * two are one waterfall stage of one surface — the case a shared key is
 * reserved for. One session, one beat, one fade.
 */
export const ENTITY_HEADER_HOLD_KEY = 'entity-header'

/**
 * The two lines, as boxes rather than as text. `aria-hidden` because a
 * placeholder read aloud is a placeholder announced as content — the same
 * rule `EditorSidebarBootSkeleton` follows.
 */
function EntityHeaderSkeleton() {
  return (
    <div
      data-entity-header-skeleton=""
      aria-hidden
      className="flex w-full min-w-0 flex-col gap-0.5"
    >
      {/* The affordance's own box — a 20px `text-sm` line inside `py-0.5`, at
          its `px-1.5` inset — so the name lands where the space was held. */}
      <div className="flex h-6 items-center px-1.5">
        <Skeleton className="h-3.5 w-40 max-w-full rounded-sm" />
      </div>
      {/* The summary's 16px `text-xs` row, at the summary's own inset. */}
      <div className="flex h-4 items-center px-1.5">
        <Skeleton className="h-2.5 w-64 max-w-full rounded-sm" />
      </div>
    </div>
  )
}

/**
 * What KIND of thing this bar names, said in a word rather than in a hue.
 *
 * A reader who has never seen a service blueprint cannot tell a scenario bar
 * from a phase bar: both are a bold name over a sentence. The badge says which
 * without being hovered, and carries that kind's definition for the reader who
 * then wants one (#240).
 *
 * NEUTRAL by decision, not by omission. The grid already spends colour on lane
 * role and path kind. The diagram assets do carry a per-entity tint, but those
 * are hardcoded hexes in `docs/assets` with no token behind them, so adopting
 * them would invent a THIRD colour axis rather than reuse either existing one.
 * `outline` is the badge's own neutral variant; the ink drops to
 * `text-muted-foreground` so the word does not compete with the semibold name
 * beside it. Nothing here touches the badge's size — one size for every badge
 * is settled in one place, not per call site.
 *
 * A DEFINITION TRIGGER AND NOTHING ELSE. `EntityTitleAffordance` keeps the
 * panel: it is one target with an `absolute inset-0` opener filling it, so a
 * badge placed inside it would either open the panel on click or have to climb
 * back out on a z-index. Rendering it as the affordance's SIBLING is what makes
 * "the badge does not open the panel" true by construction rather than by a
 * `stopPropagation` somebody can delete.
 *
 * No `cursor-help`: it is on its way out everywhere (#243) along with the
 * dotted cue and the ⓘ, and adding one here only to delete it next is churn.
 *
 * The accessible name is the kind THEN the entity's own name, so a screen
 * reader gets the pairing a sighted reader gets from the two sitting side by
 * side. Kind first, because the visible word has to start the name it is read
 * by for the two to be one label rather than two.
 */
function EntityKindBadge({
  kind,
  label,
}: {
  kind: EntityDetailKind
  label: string
}) {
  const term = ENTITY_KIND_DEFINITIONS[kind]

  return (
    <EntityDefinitionPopover kind={kind} side="bottom">
      <Badge
        data-entity-kind-badge=""
        variant="outline"
        aria-label={`${term.label}: ${label}`}
        className="text-muted-foreground"
      >
        {term.label}
      </Badge>
    </EntityDefinitionPopover>
  )
}

/**
 * The identity block above the canvas: what this thing is called, and what
 * it is.
 *
 * ONE component for three surfaces — the service overview, a phase, a
 * scenario. The same block was written three times, and only one of the three
 * owned a query, which is exactly why only that one was broken (#234). It
 * takes a RESOLVED identity and never a query: the service surface unpacks
 * `useServiceSpec`, the phase and scenario surfaces unpack the props they
 * already hold, and this component never learns which is which.
 *
 * It reserves its height rather than sizing to it — see
 * `BLUEPRINT_MENUBAR_IDENTITY_HEIGHT`, which is where the number and the
 * argument live, because all three bars draw their geometry from that module.
 *
 * The name is followed by a neutral badge naming its KIND — see
 * `EntityKindBadge`. It rides here rather than inside the title affordance
 * because it must not open the panel the affordance opens.
 *
 * FOUR STATES, THREE PICTURES:
 *
 *   loading            the skeleton
 *   ready, an entity   the name and its summary
 *   ready, nothing     a present, empty bar — this deployment has no service
 *   error              a present bar, with the failure in the SUMMARY slot
 *
 * The failure goes in the summary slot and never the title slot. The title is
 * an interactive affordance — it opens the entity panel — so error text there
 * offers a control that leads nowhere.
 *
 * The summary is a row UNDER the title, inside the same block. Inline after a
 * separator it competed with the name for the same line and truncated first on
 * a narrow canvas; outside the block it lost the block's own
 * `max-w-[calc(100%-9rem)]` and `gap-0.5`, so the two lines sat at a different
 * rhythm from the identical bar one level down. `title` and not a tooltip:
 * this is truncated prose, and the full text is one click away in the panel
 * the name opens.
 */
export function EntityHeader({
  kind,
  id,
  label,
  summary,
  status = 'ready',
  message,
  className,
}: EntityHeaderProps) {
  // A failed query has no summary to print, and printing a stale one under a
  // bar that cannot say what it is showing is worse than printing nothing.
  const caption = status === 'error' ? (message ?? null) : (summary ?? null)
  /*
    Two waits, one skeleton. The bar cannot resolve before its own query
    answers, and it does not resolve before the shell lifts its lane either —
    whichever is later is when the reader sees a name. The lane fires once per
    entry, so a return from a slice tab is held by neither: the latch is off
    and the query is warm (`staleTime: Infinity`).
  */
  const shellBooting = useShellBooting()

  return (
    <div
      data-entity-header=""
      className={cn(BLUEPRINT_MENUBAR_TITLE_CLASS, className)}
      style={{ height: BLUEPRINT_MENUBAR_IDENTITY_HEIGHT }}
    >
      <DeferredSkeleton
        loading={status === 'loading' || shellBooting}
        holdKey={ENTITY_HEADER_HOLD_KEY}
        skeleton={<EntityHeaderSkeleton />}
        className="flex w-full min-w-0 flex-col items-start gap-0.5"
      >
        {id && label ? (
          /*
            One ROW: the name, then the kind to its right. The row exists so
            the badge is a SIBLING of the opener rather than a child of it.

            `items-center` against a title row the badge cannot grow — a 20px
            `h-5` badge inside a 24px row — so the two-line height this bar
            pins stays exactly what `BLUEPRINT_MENUBAR_IDENTITY_HEIGHT` says.
          */
          <div
            data-entity-header-identity=""
            className="flex min-w-0 max-w-full items-center gap-1.5"
          >
            <EntityTitleAffordance kind={kind} id={id} label={label} />
            <EntityKindBadge kind={kind} label={label} />
          </div>
        ) : null}
        {caption ? (
          <p
            data-entity-header-summary=""
            className={BLUEPRINT_MENUBAR_SUMMARY_CLASS}
            title={caption}
          >
            {caption}
          </p>
        ) : null}
      </DeferredSkeleton>
    </div>
  )
}
