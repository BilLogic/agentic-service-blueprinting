import { Info } from 'lucide-react'
import { IconTooltip } from '@/components/editor/IconTooltip'
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@/components/editor/SegmentedControl'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { useSupabase } from '@/contexts/SupabaseProvider'
import {
  describeAgentTrial,
  describeRealTier,
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
    <span
      data-dev-tier-badge={devSimulation.tier}
      className="shrink-0 rounded-full bg-violet-500/15 px-1.5 py-0.5 text-3xs font-medium text-violet-1100"
      title="Developer portal: the UI is simulating a tier. Your real account is unchanged, and the server still decides every write."
    >
      simulating {devSimulation.tier}
    </span>
  )
}

/** A row's ⓘ. The caveats live here, not in the popover as prose. */
function InfoHint({ label }: { label: string }) {
  return (
    <IconTooltip label={label} side="top">
      <button
        type="button"
        aria-label={label}
        className="shrink-0 rounded-sm p-0.5 text-muted-foreground/70 transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <Info className="size-3" aria-hidden />
      </button>
    </IconTooltip>
  )
}

const ROW_LABEL = 'w-16 shrink-0 text-2xs text-muted-foreground'
const ROW_BADGE = 'h-5 px-1.5 text-2xs font-normal'

/**
 * Settings → "For developers".
 *
 * Someone building on the kit needs to see both tiers without provisioning
 * two accounts. This flips what the CLIENT believes; the server is untouched.
 *
 * Three labelled rows in the popover's own register — what the session
 * really is, the simulation, the no-database trial — and nothing else
 * visible. Every caveat that used to be a paragraph is now behind the ⓘ on
 * the row it qualifies, which is where someone goes looking for it.
 */
export function DevPortalSection() {
  const {
    configured,
    session,
    isServiceAccount,
    isDevAuthoring,
    devSimulation,
    realCanWrite,
    isSampleTrial,
  } = useSupabase()
  const tier = describeRealTier({
    configured,
    signedIn: session !== null,
    isServiceAccount,
    isDevAuthoring,
  })
  const trial = describeAgentTrial({ isSampleTrial, configured })

  return (
    <div className="flex flex-col gap-2" data-dev-portal>
      <div className="my-0.5 border-t border-border/60" />

      <div className="flex items-center gap-1">
        <p className="text-xs font-medium text-foreground">For developers</p>
        <InfoHint label="Simulates a permission tier in this browser only. Row-level security and the RPC grants are unchanged, so a write your real account cannot make still fails server-side." />
      </div>

      <div className="flex items-center gap-2">
        <span className={ROW_LABEL}>Session</span>
        <Badge
          variant="secondary"
          className={ROW_BADGE}
          data-real-tier={tier.id}
        >
          {tier.label}
        </Badge>
        <Badge
          variant="outline"
          className={ROW_BADGE}
          data-real-can-write={realCanWrite}
        >
          {realCanWrite ? 'can edit' : 'read-only'}
        </Badge>
        <InfoHint label={tier.detail} />
      </div>

      <div className="flex items-center gap-2">
        <span className={ROW_LABEL}>Simulate</span>
        <Switch
          checked={devSimulation.on}
          onCheckedChange={setDevSimulationOn}
          aria-label="Simulate a permission tier"
          data-dev-simulate
        />
        <SegmentedControl
          value={devSimulation.tier}
          onValueChange={setDevSimulatedTier}
          disabled={!devSimulation.on}
          aria-label="Simulated tier"
          data-dev-simulated-tier
          className="ml-auto data-disabled:opacity-50"
        >
          {(['regular', 'admin'] as const).map((id) => (
            <SegmentedControlItem key={id} value={id}>
              {SIMULATED_TIER_LABEL[id]}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
        <InfoHint label="Admin shows the editing surfaces and the agent's write tools; Regular hides them. Interface only — the server still decides every write." />
      </div>

      <div className="flex items-center gap-2">
        <span className={ROW_LABEL}>Agent trial</span>
        <Badge variant="secondary" className={ROW_BADGE} data-agent-trial={trial.id}>
          {trial.label}
        </Badge>
        <InfoHint label={trial.detail} />
      </div>
    </div>
  )
}
