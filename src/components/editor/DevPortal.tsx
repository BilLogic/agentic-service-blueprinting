import { Info } from 'lucide-react'
import { IconTooltip } from '@/components/editor/IconTooltip'
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@/components/editor/SegmentedControl'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { useSupabase } from '@/contexts/SupabaseProvider'
import { cn } from '@/lib/utils'
import {
  setDevSimulatedTier,
  setDevSimulationOn,
  type DevSimulatedTier,
} from '@/lib/devPortal'

const SIMULATED_TIER_LABEL: Record<DevSimulatedTier, string> = {
  admin: 'Admin',
  regular: 'Regular',
}

/**
 * The simulation's persistent tell, in the workspace badge row beside the
 * authoring / edit-preview chips.
 *
 * Its own colour on purpose. Amber there means "this is live, be careful";
 * this one means "what you are seeing is not your account" — a different
 * kind of caution, and the two must never be mistaken for each other.
 */
export function DevTierOverrideBadge() {
  const { devSimulation } = useSupabase()
  if (!devSimulation.on) return null
  return (
    <Badge
      variant="warning"
      data-dev-tier-badge={devSimulation.tier}
      className="h-auto shrink-0 px-1.5 py-0.5 text-3xs"
      title="Developer portal: the UI is simulating a tier. Your real account is unchanged, and the server still decides every write."
    >
      simulating {devSimulation.tier}
    </Badge>
  )
}

/** A row's ⓘ. The caveats live here, not in the popover as prose. */
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

const ROW_LABEL = 'w-20 shrink-0 text-2xs text-muted-foreground'

/**
 * Settings → "For developers".
 *
 * Someone building on the kit needs to see both tiers without provisioning
 * two accounts. This flips what the CLIENT believes; the server is untouched.
 *
 * Two controls, because there are exactly two decisions: is the simulation
 * running, and which tier does it play. Everything else this section used to
 * report — what the real session is, whether the no-database agent trial is
 * active — was status, not control. It is derivable from the workspace badges
 * and the agent panel, and reading it here made a settings popover into a
 * dashboard. The caveats stay, behind the ⓘ on the row each one qualifies.
 */
export function DevPortalSection() {
  const { devSimulation } = useSupabase()

  return (
    <div className="flex flex-col gap-2" data-dev-portal>
      <div className="my-0.5 border-t border-muted" />

      <div className="flex items-center gap-1">
        <p className="text-xs font-medium text-foreground">For developers</p>
        <InfoHint label="Simulates a permission tier in this browser only. Row-level security and the RPC grants are unchanged, so a write your real account cannot make still fails server-side." />
      </div>

      <div className="flex items-center gap-2">
        <span className={ROW_LABEL}>Simulate</span>
        <Switch
          checked={devSimulation.on}
          onCheckedChange={setDevSimulationOn}
          aria-label="Simulate a permission tier"
          data-dev-simulate
        />
        <InfoHint
          label="Off means the UI reflects your real account. On plays the tier below instead — in this browser only."
          className="ml-auto"
        />
      </div>

      <div className="flex items-center gap-2">
        <span className={ROW_LABEL}>User type</span>
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
        <InfoHint
          label="Admin shows the editing surfaces and the agent's write tools; Regular hides them. Interface only — the server still decides every write."
          className="ml-auto"
        />
      </div>
    </div>
  )
}
