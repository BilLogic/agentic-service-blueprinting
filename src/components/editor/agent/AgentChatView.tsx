import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import {
  ChevronLeft,
  Loader2,
  Pencil,
  SendHorizontal,
  Sparkles,
  Square,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from '@/components/ui/input-group'
import { Popover, PopoverContent } from '@/components/ui/popover'
import { Marker, MarkerContent, MarkerIcon } from '@/components/ui/marker'
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from '@/components/ui/message-scroller'
import { IconTooltip } from '@/components/editor/IconTooltip'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentTitle,
} from '@/components/ui/attachment'
import { AgentTrialBanner } from '@/components/editor/AgentTrialBanner'
import { ChangeCount } from '@/components/editor/agent/ChangeCount'
import { RenameSessionDialog } from '@/components/editor/agent/SessionDialogs'
import { blockTranscript } from '@/components/editor/agent/transcriptBlocks'
import { TranscriptRow } from '@/components/editor/agent/TranscriptRow'
import { TranscriptStepsBlock } from '@/components/editor/agent/TranscriptStepsBlock'
import { useAgentChangeCount } from '@/components/editor/agent/useAgentChangeCount'
import { useSupabase } from '@/contexts/SupabaseProvider'
import { useCanvasModeValue } from '@/contexts/canvasModeContext'
import { usePathSelectionContext } from '@/hooks/usePathSelection'
import {
  describeChange,
  sessionSnapshot,
  subscribeToSession,
} from '@/lib/authoringSession'
import {
  hydrateAgentTranscript,
  sendToAgent,
  stopAgent,
  useAgentRun,
  useAgentTranscriptHydrating,
} from '@/lib/agent/loop'
import {
  setPendingAgentAttachment,
  takePendingAgentAttachment,
  usePendingAgentAttachment,
} from '@/lib/agent/attachments'
import {
  clearAgentDraft,
  setAgentDraft,
  useAgentDraft,
} from '@/lib/agent/panelState'
import {
  AGENT_SKILL_COMMANDS,
  parseSkillDraft,
  skillMatchesQuery,
  type AgentSkillCommand,
} from '@/lib/agent/skills'
import { type AgentSession } from '@/lib/agent/sessions'
import {
  hasKey,
  modelFor,
  openAgentSettings,
  useAgentSettings,
} from '@/lib/agent/settings'
import { cn } from '@/lib/utils'

/**
 * Step 2 of the ✦ surface: one conversation, full height — the transcript,
 * the composer with its slash menu, and the header that renames it. Which
 * session this is comes in as the session itself; going back is the panel's
 * to decide, so it comes in as a callback.
 */
export function AgentChatView({
  session,
  onBack,
}: {
  session: AgentSession
  onBack: () => void
}) {
  const settings = useAgentSettings()
  const { client, canAgentWrite, canAgent, isSampleTrial } = useSupabase()
  const mode = useCanvasModeValue()
  const { activePathKeys } = usePathSelectionContext()
  const changes = useSyncExternalStore(subscribeToSession, sessionSnapshot)
  const keyed = hasKey(settings)
  // Same reason as openSessionId, plus a bonus: drafts are per session, so
  // switching conversations no longer eats what you were typing.
  const storedDraft = useAgentDraft(session.id)
  const draft = storedDraft.text
  const pendingSkill = storedDraft.skillId
    ? (AGENT_SKILL_COMMANDS.find(
        (entry) => entry.id === storedDraft.skillId,
      ) ?? null)
    : null
  const setDraft = (text: string) =>
    setAgentDraft(session.id, { text, skillId: storedDraft.skillId })
  const setPendingSkill = (command: AgentSkillCommand | null) =>
    setAgentDraft(session.id, {
      text: storedDraft.text,
      skillId: command?.id ?? null,
    })
  const attachment = usePendingAgentAttachment()
  const { events, running } = useAgentRun(session.id)
  // Same canAgent gate as the sessions list: without persistence the
  // "not yet hydrated" half of the flag would be a forever-skeleton.
  const transcriptHydrating =
    useAgentTranscriptHydrating(session.id) && canAgent && !isSampleTrial
  const changeCount = useAgentChangeCount(session.id)
  const [renaming, setRenaming] = useState(false)
  // The slash menu is a portalled popover; this is what it anchors to (and
  // what --anchor-width measures).
  const composerRowRef = useRef<HTMLDivElement>(null)

  // Reopening a session after a reload restores its transcript from
  // agent_messages (no-op for never-persisted sessions). `client` is a
  // dep on purpose: this child effect fires before the parent attaches
  // persistence, the hydrate self-guards on attachment, and the retry
  // happens HERE when the client lands.
  useEffect(() => {
    void hydrateAgentTranscript(session.id)
  }, [session.id, client])

  // React-side context. What the user is *looking at* (view, selection,
  // open panel, Design picks) comes from the UI-context bridge, collected
  // live per round in the loop — this covers the rest: posture, filters,
  // and the session's edit history.
  const contextNote = useMemo(() => {
    const lines: string[] = [
      `Canvas mode: ${mode}${mode === 'design' ? ' (authoring)' : ' (read-only posture)'}`,
    ]
    if (activePathKeys.length > 0)
      lines.push(`Visible path variants: ${activePathKeys.join(', ')}`)
    const recent = [...changes].reverse().slice(0, 5)
    if (recent.length > 0) {
      lines.push(
        'Recent changes this browser session, newest first (get_change_history has all):',
        ...recent.map(
          (entry) =>
            `- ${entry.author === 'agent' ? 'agent' : 'user'}: ${describeChange(entry)}`,
        ),
      )
    }
    return lines.join('\n')
  }, [activePathKeys, changes, mode])

  // "/" at the start of an otherwise word-only draft is a skill lookup.
  const slashQuery =
    !pendingSkill && draft.startsWith('/') && !draft.includes(' ')
      ? draft.slice(1).toLowerCase()
      : null
  const slashMatches =
    slashQuery !== null
      ? AGENT_SKILL_COMMANDS.filter((command) =>
          skillMatchesQuery(command, slashQuery),
        )
      : []
  const slashOpen = slashMatches.length > 0
  // Arrow keys and hover move one highlight through the *pickable* matches
  // (cmdk drives hover via onValueChange; the arrows below drive the rest).
  // Derived-with-a-guard, the house pattern: as typing reshapes the matches,
  // a highlight that fell out of them snaps back to the first pickable one.
  const slashPickable = slashMatches.filter((command) => command.content)
  const [slashHighlight, setSlashHighlight] = useState('')
  const nextHighlight = slashPickable.some(
    (command) => command.id === slashHighlight,
  )
    ? slashHighlight
    : (slashPickable[0]?.id ?? '')
  if (slashOpen && nextHighlight !== slashHighlight) {
    setSlashHighlight(nextHighlight)
  }
  const moveSlashHighlight = (delta: number) => {
    if (slashPickable.length === 0) return
    const index = slashPickable.findIndex(
      (command) => command.id === nextHighlight,
    )
    const next =
      slashPickable[
        (index + delta + slashPickable.length) % slashPickable.length
      ]
    setSlashHighlight(next.id)
  }

  const pickSkill = (command: AgentSkillCommand) => {
    if (!command.content) return
    setAgentDraft(session.id, { text: '', skillId: command.id })
  }

  const send = () => {
    let text = draft.trim()
    let skill = pendingSkill
    // Typed-through form: "/map turn my notes into a scenario" sends in one go.
    if (!skill) {
      const parsed = parseSkillDraft(text)
      if (parsed?.command.content) {
        skill = parsed.command
        text = parsed.rest
      }
    }
    const attached = takePendingAgentAttachment()
    if (!text && skill) text = `Run ${skill.label} from the top of its flow.`
    if (!text && attached) text = 'Here are my canvas annotations.'
    // The trial runs with NO client on purpose — sample reads, no writes.
    if (!text || running || (!client && !isSampleTrial)) {
      // Nothing usable to send — put a taken attachment back on the shelf.
      if (attached) setPendingAgentAttachment(attached)
      return
    }
    clearAgentDraft(session.id)
    void sendToAgent({
      client,
      sessionId: session.id,
      settings,
      contextNote,
      text,
      skill,
      attachment: attached,
      allowWrites: canAgentWrite,
    })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-agent-panel="chat">
      {/* Header: back + title + change count. Nothing else — the
          transcript owns the rest of the height. */}
      <div className="flex h-9 shrink-0 items-center gap-1 border-b border-muted px-2">
        <IconTooltip label="Back to sessions" side="bottom">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Back to sessions"
            className="text-muted-foreground hover:text-foreground"
            onClick={onBack}
          >
            <ChevronLeft className="size-3.5" aria-hidden />
          </Button>
        </IconTooltip>
        {/* The title is editable in place — auto-names are a default, not
            a decision. */}
        <button
          type="button"
          onClick={() => setRenaming(true)}
          title="Rename session"
          className="group/title flex min-w-0 flex-1 items-center gap-1 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="min-w-0 truncate text-sm font-medium text-foreground">
            {session.title}
          </span>
          <Pencil
            className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/title:opacity-100"
            aria-hidden
          />
        </button>
        {changeCount > 0 ? (
          <ChangeCount count={changeCount} className="text-muted-foreground" />
        ) : null}
      </div>

      {isSampleTrial ? <AgentTrialBanner /> : null}

      {/* MessageScroller owns the hard parts: anchored turns, streamed
          replies, jump-to-latest. */}
      <MessageScrollerProvider>
        <MessageScroller className="relative min-h-0 flex-1">
          {/* One rhythm: the viewport's p-3 is the transcript's gutter and
              the composer's too, so both columns share a left edge; rows sit
              on a gap-3 baseline and a NEW user turn opens a wider gap, so
              turns read as turns without a second bubble treatment. */}
          <MessageScrollerViewport className="p-3">
            <MessageScrollerContent className="gap-3">
              {events.length === 0 ? (
                transcriptHydrating ? (
                  // A persisted conversation is still on the wire —
                  // skeleton bubbles, not the "Ready" copy, which read as
                  // the agent having no loading state at all.
                  <div className="flex flex-col gap-3" aria-hidden>
                    <Skeleton className="ml-auto h-8 w-3/5 rounded-2xl" />
                    <Skeleton className="h-8 w-4/5 rounded-2xl" />
                    <Skeleton className="h-8 w-2/5 rounded-2xl" />
                  </div>
                ) : keyed ? (
                  isSampleTrial ? (
                    <p className="text-sm text-muted-foreground">
                      Ready ({modelFor(settings)}). Ask about the sample
                      blueprint — reading and navigation only.
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Ready ({modelFor(settings)}). Writes land live on the
                      canvas as{' '}
                      <Sparkles
                        className="inline size-3 align-[-0.1em]"
                        aria-hidden
                      />{' '}
                      rows in Changes — each revertible.
                    </p>
                  )
                ) : (
                  <div className="flex flex-col items-start gap-2">
                    <p className="text-sm text-muted-foreground">
                      No provider key yet — the key stays in this browser only.
                    </p>
                    <Button size="xs" variant="outline" onClick={openAgentSettings}>
                      Add API key…
                    </Button>
                  </div>
                )
              ) : (
                // Index keys are safe here: the transcript is append-only.
                // Finished step runs fold into an accordion; the live tail
                // (last block while running) always renders expanded so
                // streaming stays visible.
                blockTranscript(events).map((block, blockIndex, blocks) => {
                  const isLastBlock = blockIndex === blocks.length - 1
                  if (block.kind === 'steps' && !(running && isLastBlock)) {
                    return (
                      <MessageScrollerItem
                        key={`steps-${block.start}`}
                        scrollAnchor={!running && isLastBlock}
                      >
                        <TranscriptStepsBlock
                          events={events}
                          start={block.start}
                          end={block.end}
                          hasError={block.hasError}
                        />
                      </MessageScrollerItem>
                    )
                  }
                  const indices =
                    block.kind === 'steps'
                      ? Array.from(
                          { length: block.end - block.start + 1 },
                          (_, i) => block.start + i,
                        )
                      : [block.index]
                  return indices.map((index) => {
                    const event = events[index]
                    return (
                      <MessageScrollerItem
                        key={index}
                        // While a run streams, the working row below is the
                        // anchor — otherwise the last event is.
                        scrollAnchor={!running && index === events.length - 1}
                        className={cn(
                          event.kind === 'user' && index > 0 && 'mt-3',
                        )}
                      >
                        {/* Chat replies never fold — only completed
                            tool/status step runs do (TranscriptStepsBlock). */}
                        <TranscriptRow event={event} />
                      </MessageScrollerItem>
                    )
                  })
                })
              )}
              {/* A transcript row, not a loose glyph: it keeps the list's
                  rhythm, and it announces itself instead of spinning in
                  silence. */}
              {running ? (
                <MessageScrollerItem scrollAnchor>
                  <Marker role="status" aria-live="polite">
                    <MarkerIcon>
                      <Loader2 className="animate-spin" aria-hidden />
                    </MarkerIcon>
                    <MarkerContent>Working…</MarkerContent>
                  </Marker>
                </MessageScrollerItem>
              ) : null}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton />
        </MessageScroller>
      </MessageScrollerProvider>

      <RenameSessionDialog
        session={renaming ? session : null}
        onOpenChange={(open) => {
          if (!open) setRenaming(false)
        }}
      />

      {/* No border-t: the field draws its own edge, and a rule immediately
          above it read as a second line stacked on the first. The viewport's
          scroll fade already says "the transcript continues up there". */}
      <div className="shrink-0 p-3 pt-2">
        {attachment ? (
          <div className="mb-1.5 flex flex-col gap-1.5">
            {attachment ? (
              <Attachment size="sm" className="w-full">
                <AttachmentContent>
                  <AttachmentTitle className="text-sm">
                    {attachment.label}
                  </AttachmentTitle>
                  <AttachmentDescription className="text-xs">
                    {attachment.lines.join(' · ')}
                  </AttachmentDescription>
                </AttachmentContent>
                <AttachmentActions>
                  <AttachmentAction
                    aria-label="Remove attachment"
                    onClick={() => setPendingAgentAttachment(null)}
                  >
                    <X className="size-3" aria-hidden />
                  </AttachmentAction>
                </AttachmentActions>
              </Attachment>
            ) : null}
          </div>
        ) : null}
        {/* The slash menu: type "/" to see the four skills — the same
            SKILL.md files IDE agents run, minus their file mechanics.
            PORTALLED, anchored to the composer row. Two reasons, both
            defects it used to cause as an absolutely-positioned child:
            cmdk scrolls the highlighted item into view on every value
            change, and scrollIntoView walks EVERY scrollable ancestor —
            an overflow:hidden box included — which was silently scrolling
            the dock chrome and the sidebar aside; and a fixed w-72 menu
            does not fit a 272px docked panel, so it got clipped. A portal
            has no hidden-overflow ancestors, and --anchor-width sizes it
            to the field. */}
        <Popover
          open={slashOpen}
          // Purely derived from the draft: nothing but the text can open or
          // close it, so an outside press is a no-op rather than a state
          // that disagrees with what is typed. Escape is handled in the
          // textarea, where it also clears the draft.
          onOpenChange={() => undefined}
        >
          <PopoverContent
            anchor={composerRowRef}
            side="top"
            align="start"
            sideOffset={6}
            // The textarea keeps focus the whole time — it is still the
            // thing being typed into, and the arrow keys live there.
            initialFocus={false}
            finalFocus={false}
            className="w-(--anchor-width) max-w-(--available-width) gap-0 p-1"
            aria-label="Agent skills"
          >
            {/* The composer's textarea keeps focus and does the typing, so
                the Command runs headless: filtering stays ours (the same
                skillMatchesQuery the send path uses → shouldFilter=false)
                and selection is controlled, fed by the arrow keys in the
                textarea's onKeyDown and by cmdk's own hover tracking. The
                popup already supplies the surface and the radius, so the
                Command contributes neither. */}
            <Command
              shouldFilter={false}
              value={nextHighlight}
              onValueChange={setSlashHighlight}
              className="rounded-lg! bg-transparent p-0"
            >
              <CommandList>
                {slashMatches.map((command) => (
                  <CommandItem
                    key={command.id}
                    value={command.id}
                    disabled={!command.content}
                    onSelect={() => pickSkill(command)}
                    className="items-baseline gap-2 text-sm"
                  >
                    <span className="shrink-0 font-mono text-foreground">
                      {command.label}
                    </span>
                    <span className="min-w-0 flex-1 text-muted-foreground">
                      {command.summary}
                    </span>
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <div ref={composerRowRef} className="flex items-end gap-1.5">
          {running ? (
            <IconTooltip label="Stop — whatever landed stays, revertible">
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                aria-label="Stop"
                onClick={() => stopAgent(session.id)}
              >
                <Square className="size-3" aria-hidden />
              </Button>
            </IconTooltip>
          ) : null}
          {/* ONE field, the DS's own: InputGroup draws the border and the
              focus treatment (a single soft ring on the control, the same
              geometry every other input in the app has), and the recognized
              /command rides in an addon INSIDE it as an accent badge
              (Claude's grammar — the token visibly stopped being text).
              The old hand-rolled wrapper stacked a 1px border and a 2px ring
              on a borderless textarea: the box-around-a-box. */}
          <InputGroup className="min-h-8 flex-1">
            {pendingSkill ? (
              <InputGroupAddon align="inline-start" className="self-start py-1.5">
                <Badge
                  variant="secondary"
                  className="gap-0.5 border-primary/25 bg-primary/10 font-mono text-primary"
                >
                  {pendingSkill.label}
                  <IconTooltip label="Drop the skill from this message">
                    <button
                      type="button"
                      aria-label="Remove skill"
                      onClick={() => setPendingSkill(null)}
                      className="rounded-sm p-0.5 transition-colors hover:bg-primary/15"
                    >
                      <X className="size-2.5" aria-hidden />
                    </button>
                  </IconTooltip>
                </Badge>
              </InputGroupAddon>
            ) : null}
            <InputGroupTextarea
              rows={1}
              // No imperative height write: the DS Textarea is
              // `field-sizing-content`, so the browser grows it. max-h caps
              // it at ~6 lines and then it scrolls, as before.
              // geometry: min-h-7 is a 28px composer box; a 20px line sits in the padding.
              className="max-h-30 min-h-7 py-1.5 leading-5"
              value={draft}
              onChange={(event) => {
                const value = event.target.value
                // Typing a full command + space converts it into the badge
                // on the spot — the token is recognized, not just text.
                if (!pendingSkill) {
                  const token = /^\/([\w:]+)\s([\s\S]*)$/.exec(value)
                  const lowered = token?.[1].toLowerCase()
                  const command = lowered
                    ? AGENT_SKILL_COMMANDS.find(
                        (entry) =>
                          entry.id === lowered ||
                          entry.aliases.includes(lowered),
                      )
                    : undefined
                  if (command?.content) {
                    setAgentDraft(session.id, {
                      text: token![2],
                      skillId: command.id,
                    })
                    return
                  }
                }
                setDraft(value)
              }}
              onKeyDown={(event) => {
                if (slashOpen && event.key === 'ArrowDown') {
                  event.preventDefault()
                  moveSlashHighlight(1)
                  return
                }
                if (slashOpen && event.key === 'ArrowUp') {
                  event.preventDefault()
                  moveSlashHighlight(-1)
                  return
                }
                if (
                  slashOpen &&
                  (event.key === 'Enter' || event.key === 'Tab') &&
                  // Shift+Enter stays a newline even mid-menu — same
                  // exemption the closed-menu send path makes below.
                  !event.shiftKey
                ) {
                  event.preventDefault()
                  const highlighted = slashPickable.find(
                    (command) => command.id === nextHighlight,
                  )
                  if (highlighted) pickSkill(highlighted)
                  return
                }
                if (slashOpen && event.key === 'Escape') {
                  // Mark the event consumed: the canvas selection listener
                  // skips defaultPrevented Escapes, and closing this menu
                  // must not also wipe a cell selection.
                  event.preventDefault()
                  setDraft('')
                  return
                }
                if (
                  event.key === 'Backspace' &&
                  draft === '' &&
                  pendingSkill
                ) {
                  setPendingSkill(null)
                  return
                }
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  send()
                }
              }}
              placeholder={
                pendingSkill
                  ? pendingSkill.summary
                  : keyed
                    ? 'Message the agent… ("/" for skills)'
                    : 'Add an API key in agent settings first'
              }
              aria-label="Message the agent"
              disabled={!keyed}
            />
          </InputGroup>
          <IconTooltip label="Send">
            <Button
              type="button"
              size="icon-sm"
              variant="default"
              aria-label="Send"
              disabled={
                !keyed ||
                running ||
                (draft.trim() === '' && !pendingSkill && !attachment)
              }
              onClick={send}
            >
              <SendHorizontal className="size-3.5" aria-hidden />
            </Button>
          </IconTooltip>
        </div>
      </div>
    </div>
  )
}
