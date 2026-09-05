import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  saveAgentSettings,
  serviceScopeMode,
  useAgentSettings,
  type AgentServiceScopeMode,
} from '@/lib/agent/settings'

/**
 * The creator's default search scope — which service(s) the agent holds in
 * scope when a question names none.
 *
 * `Active service` (the default) keeps every answer within the service on
 * screen, so a large multi-service deployment does not search everything on
 * every question; `All services` opts the whole deployment in. A per-call
 * `service` filter still overrides either way. On a single-service deployment
 * the choice has no effect — every scope is the same one service — but it lives
 * in the agent settings, which only a creator who can use the agent ever sees.
 *
 * Renders as a fragment into the settings column's `flex flex-col gap-2.5`,
 * beside the provider/model/key rows.
 */
const SCOPE_LABELS: Record<AgentServiceScopeMode, string> = {
  active: 'Active service',
  all: 'All services',
}

const SCOPE_ORDER: AgentServiceScopeMode[] = ['active', 'all']

export function AgentScopeField() {
  const settings = useAgentSettings()
  const scope = serviceScopeMode(settings)

  return (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 text-2xs text-muted-foreground">Scope</span>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              className="h-7 min-w-0 flex-1 justify-start font-mono text-xs"
            >
              <span className="truncate">{SCOPE_LABELS[scope]}</span>
            </Button>
          }
        />
        <DropdownMenuContent align="start" className="font-mono">
          {SCOPE_ORDER.map((mode) => (
            <DropdownMenuItem
              key={mode}
              onClick={() => saveAgentSettings({ serviceScope: mode })}
            >
              {SCOPE_LABELS[mode]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
