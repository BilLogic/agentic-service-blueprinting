import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { listModels } from '@/lib/agent/providers/models'
import {
  AGENT_PROVIDERS,
  MODEL_OPTIONS,
  modelFor,
  saveAgentSettings,
  useAgentSettings,
} from '@/lib/agent/settings'

/**
 * The agent's provider, model and key — the half of the settings surface
 * that only exists for a session which can use the agent. The gate is the
 * composer's (AgentSettingsFields); this component assumes it passed.
 *
 * The three fields are one job rather than three: the key is stored per
 * provider and the model list is fetched with it, so switching provider
 * clears the key draft and re-fetches. Cutting the key input off from the
 * two dropdowns would put that dependency across a component boundary and
 * buy nothing.
 *
 * Renders as a fragment into the settings column's `flex flex-col gap-2.5`,
 * the same as AdminSessionFields.
 *
 * `active` is only the model-list fetch gate: skip the provider round-trip
 * while the surface is closed.
 */
export function AgentProviderFields({ active = true }: { active?: boolean }) {
  const settings = useAgentSettings()
  const [keyDraft, setKeyDraft] = useState('')
  // Live model list from the provider's own list-models endpoint — current
  // by construction. The curated MODEL_OPTIONS list is only the no-key
  // fallback. null = not fetched (no key / failed / loading).
  const [liveModels, setLiveModels] = useState<{
    provider: string
    models: string[]
  } | null>(null)
  const provider = settings.provider
  const savedKeyForFetch = settings.keys[provider]
  useEffect(() => {
    if (!active || !savedKeyForFetch) return
    const controller = new AbortController()
    listModels(provider, savedKeyForFetch, controller.signal)
      .then((models) => {
        if (!controller.signal.aborted && models.length > 0)
          setLiveModels({ provider, models })
      })
      .catch(() => {
        // Fallback list stays; a failed listing is not worth an error state.
      })
    return () => controller.abort()
  }, [active, provider, savedKeyForFetch])
  // Stale fetches self-invalidate by provider tag — no reset effect needed.
  const modelChoices =
    liveModels && liveModels.provider === provider
      ? liveModels.models
      : MODEL_OPTIONS[provider]
  const providerLabel =
    AGENT_PROVIDERS.find((entry) => entry.id === settings.provider)?.label ??
    settings.provider
  const savedKey = settings.keys[settings.provider]

  return (
    <>
      <div className="flex items-center gap-2">
        <span className="w-14 shrink-0 text-2xs text-muted-foreground">
          Provider
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                className="h-7 min-w-0 flex-1 justify-start font-mono text-xs"
              >
                <span className="truncate">{providerLabel}</span>
              </Button>
            }
          />
          {/* Same values the trigger shows, so the same face. Size is the
              design system's menu default (12px). */}
          <DropdownMenuContent align="start" className="font-mono">
            {AGENT_PROVIDERS.map((entry) => (
              <DropdownMenuItem
                key={entry.id}
                onClick={() => {
                  saveAgentSettings({ provider: entry.id })
                  setKeyDraft('')
                }}
              >
                {entry.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-2">
        <span className="w-14 shrink-0 text-2xs text-muted-foreground">
          Model
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                className="h-7 min-w-0 flex-1 justify-start font-mono text-xs"
              >
                <span className="truncate">{modelFor(settings)}</span>
              </Button>
            }
          />
          <DropdownMenuContent
            align="start"
            className="max-h-64 overflow-y-auto font-mono"
          >
            {modelChoices.map((model) => (
              <DropdownMenuItem
                key={model}
                onClick={() =>
                  saveAgentSettings({
                    models: { [settings.provider]: model },
                  })
                }
              >
                {model}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-2">
        <span className="w-14 shrink-0 text-2xs text-muted-foreground">
          API key
        </span>
        <Input
          type="password"
          value={keyDraft}
          onChange={(event) => setKeyDraft(event.target.value)}
          placeholder={savedKey ? '••••••••  saved' : 'Paste key'}
          className="h-7 min-w-0 flex-1 font-mono text-xs"
          aria-label="API key"
        />
        <Button
          size="sm"
          className="h-7 text-xs"
          disabled={keyDraft.trim() === ''}
          onClick={() => {
            saveAgentSettings({
              keys: { [settings.provider]: keyDraft.trim() },
            })
            setKeyDraft('')
          }}
        >
          Save
        </Button>
      </div>
    </>
  )
}
