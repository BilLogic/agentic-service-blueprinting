/**
 * The no-database trial's one piece of chrome. Factual and short: what the
 * agent is reading, what it cannot do, and what would change that. No alarm
 * colour — nothing is wrong here; this is the kit working without a backend.
 */
export function AgentTrialBanner() {
  return (
    <div
      data-agent-trial-banner
      className="shrink-0 border-b border-border/60 bg-muted/40 px-3 py-2 text-2xs leading-snug text-muted-foreground"
    >
      <span className="font-medium text-foreground">Sample data, read-only.</span>{' '}
      No database is connected, so the agent reads the bundled sample
      blueprint and has no editing tools. Connect a database to author.
    </div>
  )
}
