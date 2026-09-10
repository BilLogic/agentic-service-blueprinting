import { Info } from 'lucide-react'
import { IconTooltip } from '@/components/editor/IconTooltip'
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@/components/editor/SegmentedControl'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  devPortalEnabled,
  setDevSimulatedTier,
  setDevSimulationOn,
  useDevSimulation,
  type DevSimulatedTier,
} from './devPortal'

const SIMULATED_TIER_LABEL: Record<DevSimulatedTier, string> = {
  admin: 'Admin',
  regular: 'Regular',
}

/**
 * The simulation's persistent tell.
 *
 * Its own colour on purpose. The workspace's amber badges mean "this is live,
 * be careful"; this one means "what you are seeing is not your account" — a
 * different kind of caution, and the two must never be mistaken for each
 * other. That is also why it no longer sits in the workspace badge row: the
 * row is the app telling you about your session, and this is the kit telling
 * you it is lying to the app. Kit chrome belongs on kit chrome.
 *
 * No build gate of its own: outside development the simulation is off at the
 * seam, so this is already nothing. A second copy of the rule here could only
 * ever disagree with the first.
 */
function DevTierTell() {
  const devSimulation = useDevSimulation()
  if (!devSimulation.on) return null
  return (
    <Badge
      variant="warning"
      data-dev-tier-badge={devSimulation.tier}
      className="shrink-0"
      title="Developer portal: the UI is simulating a tier. Your real account is unchanged, and the server still decides every write."
    >
      simulating {devSimulation.tier}
    </Badge>
  )
}

/** A row's ⓘ. The caveats live here, not in the bar as prose. */
function InfoHint({ label, className }: { label: string; className?: string }) {
  return (
    <IconTooltip label={label} side="top">
      <button
        type="button"
        aria-label={label}
        className={cn(
          'shrink-0 rounded-sm p-0.5 text-muted-foreground/70 transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
          className,
        )}
      >
        <Info className="size-3" aria-hidden />
      </button>
    </IconTooltip>
  )
}

/**
 * The portal itself: a strip of kit chrome over the bottom-left corner.
 *
 * It used to be a section inside the app's settings popover, which put a
 * control only the kit's own authors can use inside a surface every
 * deployment ships. The controls are unchanged and so is what they do; what
 * moved is whose chrome they hang off. Floating over the corner is also the
 * honest shape for it — it is not part of the app, and it should not look
 * like it is.
 *
 * Two controls, because there are exactly two decisions: is the simulation
 * running, and which tier does it play. Everything else this used to report —
 * what the real session is, whether the no-database agent trial is active —
 * was status, not control. It is derivable from the workspace badges and the
 * agent panel, and reading it here made a settings popover into a dashboard.
 * The caveats stay, behind the ⓘ on the row each one qualifies.
 *
 * Its own `TooltipProvider`, because it is mounted above the app's: the
 * overlay wraps the tree from just under the database client, and the app
 * mounts its provider several bands below that.
 */
export function DevPortalBar() {
  const devSimulation = useDevSimulation()

  // Unlike a status badge, this has no off state to collapse to — it is the
  // controls themselves, and outside development there is nothing for them
  // to control.
  if (!devPortalEnabled()) return null

  return (
    <TooltipProvider delay={200}>
      <div
        className="fixed bottom-3 left-3 z-50 flex items-center gap-2 rounded-lg border border-border bg-background/95 px-2.5 py-1.5 shadow-md backdrop-blur-sm"
        data-dev-portal
      >
        <div className="flex items-center gap-1">
          <p className="text-2xs font-medium text-muted-foreground">
            For developers
          </p>
          <InfoHint label="Simulates a permission tier in this browser only. Row-level security and the RPC grants are unchanged, so a write your real account cannot make still fails server-side." />
        </div>

        <span className="h-4 w-px shrink-0 bg-border" aria-hidden />

        <Switch
          checked={devSimulation.on}
          onCheckedChange={setDevSimulationOn}
          aria-label="Simulate a permission tier"
          data-dev-simulate
        />
        <InfoHint label="Off means the UI reflects your real account. On plays the tier beside it instead — in this browser only." />

        <SegmentedControl
          value={devSimulation.tier}
          onValueChange={setDevSimulatedTier}
          disabled={!devSimulation.on}
          aria-label="Simulated tier"
          data-dev-simulated-tier
          className="data-disabled:opacity-50"
        >
          {(['regular', 'admin'] as const).map((id) => (
            <SegmentedControlItem key={id} value={id}>
              {SIMULATED_TIER_LABEL[id]}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
        <InfoHint label="Admin shows the editing surfaces and the agent's write tools; Regular hides them. Interface only — the server still decides every write." />

        <DevTierTell />
      </div>
    </TooltipProvider>
  )
}
