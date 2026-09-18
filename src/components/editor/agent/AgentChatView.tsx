import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
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
import { InputGroup, InputGroupTextarea } from '@/components/ui/input-group'
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
import {
  COMPOSER_FIELD_METRICS,
  ComposerSkillInk,
} from '@/components/editor/agent/ComposerSkillInk'
import { ChangeCount } from '@/components/editor/agent/ChangeCount'
import { RenameSessionDialog } from '@/components/editor/agent/SessionDialogs'
import { blockTranscript } from '@/components/editor/agent/transcriptBlocks'
import { TranscriptRow } from '@/components/editor/agent/TranscriptRow'
import { TranscriptStepsBlock } from '@/components/editor/agent/TranscriptStepsBlock'
import { useAgentChangeCount } from '@/components/editor/agent/useAgentChangeCount'
import { useOfflineBoard } from '@/contexts/DeploymentConfigContext'
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
  AGENT_SKILL_COMMANDS,
  completeSkillToken,
  draftWithoutSkillTokens,
  findSkillLookup,
  findSkillTokens,
  findUnrunSkillTokens,
  skillsInDraft,
  skillMatchesQuery,
  type AgentSkillCommand,
  type UnrunSkillToken,
} from '@/lib/agent/skills'
import {
  clearAgentDraft,
  renameAgentSession,
  setAgentDraft,
  setPendingAgentAttachment,
  takePendingAgentAttachment,
  useAgentDraft,
  usePendingAgentAttachment,
  type AgentSession,
} from '@/lib/agent/sessions'
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
  // The board the canvas beside this panel is drawing: a trial with no
  // database answers its reads from the same one.
  const offlineBoard = useOfflineBoard()
  const mode = useCanvasModeValue()
  const { activePathKeys } = usePathSelectionContext()
  const changes = useSyncExternalStore(subscribeToSession, sessionSnapshot)
  const keyed = hasKey(settings)
  // Same reason the panel keeps the open session outside the component,
  // plus a bonus: drafts are per session, so switching conversations no
  // longer eats what you were typing.
  const draft = useAgentDraft(session.id).text
  const setDraft = (text: string) => setAgentDraft(session.id, { text })
  // The skills this message names, read out of the text and nowhere else.
  // There is no picked-versus-mentioned distinction to keep, because nothing
  // outside the draft records a pick: a token that resolves is coloured, and a
  // coloured token runs.
  const skillTokens = findSkillTokens(draft)
  const attachment = usePendingAgentAttachment()
  const { events, running } = useAgentRun(session.id)
  // Same canAgent gate as the sessions list: without persistence the
  // "not yet hydrated" half of the flag would be a forever-skeleton.
  const transcriptHydrating =
    useAgentTranscriptHydrating(session.id) && canAgent && !isSampleTrial
  const changeCount = useAgentChangeCount(session.id)
  const [renaming, setRenaming] = useState(false)
  // The near misses the reader has been asked about — `/audit`, which names
  // no skill — waiting on the one choice only they can make: spell them
  // properly and run them, or send the sentence as prose. A token that DOES
  // resolve never lands here; it is coloured and it runs. Component state
  // rather than the draft store, because it is a question being asked right
  // now and not something the message carries.
  //
  // EVERY miss, not the first: a message carries as many skills as its text
  // names, so "check /audit then /map this" holds two, and a question about
  // one of them sends the other in silence.
  const [unrunSkills, setUnrunSkills] = useState<readonly UnrunSkillToken[]>(
    [],
  )
  // The slash menu is a portalled popover; this is what it anchors to (and
  // what --anchor-width measures).
  const composerRowRef = useRef<HTMLDivElement>(null)
  // The field and the coloured layer behind it. The layer's overflow is
  // hidden, so it is scrolled from here rather than by the reader: a message
  // past six lines scrolls the field, and a layer left at the top would show
  // the first line's colour against the sixth line's text.
  const fieldRef = useRef<HTMLTextAreaElement>(null)
  const inkRef = useRef<HTMLDivElement>(null)
  const syncInkScroll = () => {
    const field = fieldRef.current
    const ink = inkRef.current
    if (!field || !ink) return
    ink.scrollTop = field.scrollTop
    ink.scrollLeft = field.scrollLeft
  }
  // A keystroke at the bottom of a scrolled field moves its scrollTop without
  // ever firing a scroll event in time to matter, so the sync also runs after
  // the write that caused it — before paint, or the colour lags a frame behind
  // the caret on every character typed.
  useLayoutEffect(syncInkScroll, [draft])
  // Composition text lives in the field, and the field's own text is
  // transparent while the layer behind it is doing the drawing — so an IME
  // preedit string would be invisible for as long as it is being composed.
  // While composing, the field shows its own text and the layer stands down.
  const [composing, setComposing] = useState(false)
  const inking = skillTokens.length > 0 && !composing

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

  // A slash that opens a word starts a skill lookup, wherever in the draft
  // it sits — the rule and the spans it reports live in skills.ts, because
  // the strings it must NOT fire on (a reference path, a URL, `and/or`, a
  // date) are worth a table of tests and not a condition in a render body.
  const slashLookup = findSkillLookup(draft)
  const slashMatches = slashLookup
    ? AGENT_SKILL_COMMANDS.filter((command) =>
        skillMatchesQuery(command, slashLookup.query),
      )
    : []
  // Dismissal is the one fact about the menu the draft cannot carry: the
  // reader wants the token they typed to stay typed AND the menu gone, and
  // the draft that opened the menu is still the draft. It is cleared by the
  // next keystroke, so the menu is never shut for a token the reader has not
  // seen it open on.
  const [slashDismissed, setSlashDismissed] = useState(false)
  const slashOpen = slashMatches.length > 0 && !slashDismissed
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

  // Accepting a match COMPLETES the token in place — `/sb:aud` becomes
  // `/sb:audit `, exactly where the reader typed it, the way a shell
  // completion behaves. It neither clears the field nor removes the token: the
  // first ate the sentence a reader was half-way through, and the second
  // moved their word to the front of the message as a badge. The rewrite
  // itself is in skills.ts, with the spans it works on.
  const pickSkill = (command: AgentSkillCommand) => {
    if (!command.content || !slashLookup) return
    setUnrunSkills([])
    setDraft(completeSkillToken(draft, slashLookup, command))
  }

  /**
   * The send itself, once the one open question about the message is settled:
   * whether a near-miss token the reader was offered is going as prose. What
   * skills run is not a question here — the text answers it, at the moment it
   * is read, in the order the tokens appear.
   */
  const dispatch = (
    draftText: string,
    unrun: readonly UnrunSkillToken[],
  ) => {
    let text = draftText.trim()
    // The text decides, and it decides at send: EVERY resolved token runs, in
    // the order it appears, and a message may carry as many as it names. The
    // tokens stay in what goes to the model, because they are what the reader
    // wrote — "/sb:map my notes then /sb:audit it" reads as the two-step
    // instruction it is, and the order the sentence puts them in is the order
    // the loop works through.
    const skills = skillsInDraft(draftText)
    const attached = takePendingAgentAttachment()
    // Tokens and no words is a complete instruction — and with several, the
    // order is the instruction.
    if (skills.length > 0 && !draftWithoutSkillTokens(draftText))
      text =
        skills.length === 1
          ? `Run ${skills[0].label} from the top of its flow.`
          : `Run ${skills.map((skill) => skill.label).join(', then ')} — each from the top of its flow, in that order.`
    if (!text && attached) text = 'Here are my canvas annotations.'
    // The trial runs with NO client on purpose — sample reads, no writes.
    if (!text || running || (!client && !isSampleTrial)) {
      // Nothing usable to send — put a taken attachment back on the shelf.
      if (attached) setPendingAgentAttachment(attached)
      return
    }
    setUnrunSkills([])
    clearAgentDraft(session.id)
    void sendToAgent({
      client,
      sessionId: session.id,
      offlineBoard,
      settings,
      contextNote,
      text,
      skills,
      unrunSkills: unrun.map((miss) => ({
        token: miss.token,
        label: miss.command.label,
      })),
      attachment: attached,
      allowWrites: canAgentWrite,
    })
  }

  /**
   * The one gate every send passes through: a draft goes to the model only
   * once nothing in it nearly names a skill and runs nothing.
   *
   * `draftText` is an argument rather than the state, because the two callers
   * that rewrite the draft first — accepting an offer here, one token at a
   * time — would otherwise re-check the draft as it stood a render ago and
   * ask about the miss they have just fixed. Re-checking is the whole point:
   * it is what makes a rewrite that leaves a SECOND near miss standing ask
   * again instead of sending it in silence.
   *
   * A near miss is never silent. `/audit` names no skill, so it takes no
   * colour and it runs nothing, and a message carrying it would otherwise
   * send as prose with nobody told — which reads to the model as an audit it
   * was never given. A token that resolved needs no question: it is coloured
   * in the field the reader is looking at, and the colour says it will run.
   */
  const sendChecked = (draftText: string) => {
    const misses = findUnrunSkillTokens(draftText)
    if (misses.length > 0) {
      setUnrunSkills(misses)
      return
    }
    dispatch(draftText, [])
  }

  const send = () => {
    // Asked ALREADY, and pressed again: the reader has read the question and
    // means the message, so it goes as prose — with the model told about
    // every miss in it, not the first.
    if (unrunSkills.length > 0) {
      dispatch(draft, unrunSkills)
      return
    }
    sendChecked(draft)
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
          className="group/title flex min-w-0 flex-1 items-center gap-1 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                    <Skeleton className="ml-auto h-8 w-3/5 rounded-full" />
                    <Skeleton className="h-8 w-4/5 rounded-full" />
                    <Skeleton className="h-8 w-2/5 rounded-full" />
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
                        <TranscriptStepsBlock events={events} run={block} />
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
        onRename={renameAgentSession}
        onOpenChange={(open) => {
          if (!open) setRenaming(false)
        }}
      />

      {/* No border-t: the field draws its own edge, and a rule immediately
          above it read as a second line stacked on the first. The viewport's
          scroll fade already says "the transcript continues up there". */}
      <div className="shrink-0 p-3 pt-2">
        {attachment ? (
          <div className="mb-2 flex flex-col gap-2">
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
        {unrunSkills.length > 0 ? (
          /* The one thing that must not happen silently: a token that LOOKS
             like an invocation, spells only a skill's bare name, and runs
             nothing. Two choices and no default — running a skill off a
             spelling that does not invoke is as wrong as dropping one the
             reader meant. Accepting rewrites the token where it sits, so the
             reader can see in the text what they agreed to.

             EVERY miss is named in the sentence, because a message carries as
             many skills as its text names: "check /audit then /map this" is
             two, and a notice that mentioned one of them made the other one's
             silence look answered. Accepting takes the FIRST and sends the
             rewritten draft back through the same check, so the next miss
             asks in its turn rather than riding out on the accept. */
          <div
            role="status"
            className="mb-2 flex flex-col gap-2 rounded-lg border border-muted bg-muted/40 p-2"
          >
            <p className="text-xs text-muted-foreground">
              {unrunSkills.length === 1
                ? `“/${unrunSkills[0].token}” is not a skill name — the closest match is ${unrunSkills[0].command.label}.`
                : `${unrunSkills.map((miss) => `“/${miss.token}”`).join(' and ')} are not skill names — the closest matches are ${unrunSkills.map((miss) => miss.command.label).join(' and ')}. One at a time.`}
            </p>
            <div className="flex gap-2">
              <Button
                size="xs"
                variant="default"
                onClick={() => {
                  const [miss] = unrunSkills
                  const rewritten = completeSkillToken(
                    draft,
                    miss,
                    miss.command,
                  )
                  setDraft(rewritten)
                  // Back through the check, not straight to the send: the
                  // rewrite fixes one token and can leave another standing.
                  sendChecked(rewritten)
                }}
              >
                Run {unrunSkills[0].command.label}
              </Button>
              <Button
                size="xs"
                variant="outline"
                onClick={() => dispatch(draft, unrunSkills)}
              >
                Send as text
              </Button>
            </div>
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
          // Derived from the draft and one dismissal flag, and from nothing
          // else: an outside press is a no-op rather than a state that
          // disagrees with what is typed. Escape is handled in the textarea,
          // where it sets that flag and leaves the text alone.
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
                    size="sm"
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
        <div ref={composerRowRef} className="flex items-end gap-2">
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
              geometry every other input in the app has), and the recognised
              token is COLOURED where it was typed, by a mirrored layer behind
              the field (ComposerSkillInk). The badge row that used to sit in
              an addon here is gone: it lifted the token out of the prose and
              stood it at the front of the message.
              The old hand-rolled wrapper stacked a 1px border and a 2px ring
              on a borderless textarea: the box-around-a-box.

              `h-auto` is what the inner wrapper below costs: InputGroup grows
              for a DIRECT-child textarea (`has-[>textarea]:h-auto`) and the
              field is a grandchild now, so the height that lets the composer
              pass one line is spelled here instead of inferred. */}
          <InputGroup className="h-auto min-h-8 flex-1">
            {/* The layer and the field share ONE containing block, and the
                block is sized by the field: that is what keeps the two copies
                of the draft wrapping alike. The layer is `absolute inset-0`,
                so it measures its positioned ancestor — InputGroup, until
                this wrapper, and InputGroup coincides with the field only
                while the field is its sole child, which is the slot an addon
                occupied until this branch deleted it. Put any addon back and
                InputGroup's own `has-[>[data-align=inline-start]]` rules
                narrow the FIELD and not the layer: every line from the first
                wrap down breaks somewhere else, the colour drifts off the
                caret, and no shared metrics string can undo it. */}
            <div className="relative min-w-0 flex-1">
              {inking ? (
                <ComposerSkillInk ref={inkRef} draft={draft} tokens={skillTokens} />
              ) : null}
              <InputGroupTextarea
                ref={fieldRef}
                // The seam `focusAgentComposer` finds this by. The phone's
                // shell gives the caret back here after an agent-driven camera
                // move, so the reader keeps typing without hunting for the box.
                data-agent-composer=""
                rows={1}
                // No imperative height write: the DS Textarea is
                // `field-sizing-content`, so the browser grows it. max-h caps
                // it at ~6 lines and then it scrolls, as before.
                // geometry: min-h-7 is a 28px composer box; a 20px line sits in the padding.
                //
                // `relative` puts the field above the coloured layer, which is
                // absolutely positioned and therefore paints over a static
                // sibling however early it sits in the DOM. The selection band
                // is translucent for the same stacking reason: an opaque one
                // would cover the only copy of the text a reader can see.
                className={cn(
                  COMPOSER_FIELD_METRICS,
                  'relative selection:bg-primary/25',
                  inking && 'text-transparent caret-foreground',
                )}
                value={draft}
                onScroll={syncInkScroll}
                onCompositionStart={() => setComposing(true)}
                onCompositionEnd={() => setComposing(false)}
                onChange={(event) => {
                  const value = event.target.value
                  // The question was about the draft as it stood; editing it is
                  // an answer to neither choice, so it goes away.
                  if (unrunSkills.length > 0) setUnrunSkills([])
                  // A dismissal answers for the draft that was on screen; the
                  // next keystroke is a new draft, and the menu is free again.
                  if (slashDismissed) setSlashDismissed(false)
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
                    // The menu closes and the draft is UNTOUCHED. Escape used
                    // to clear the field, which was invisible while a draft
                    // could only ever be "/aud" and is text deletion with no
                    // undo the moment a sentence surrounds the token.
                    setSlashDismissed(true)
                    return
                  }
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    send()
                  }
                }}
                placeholder={
                  keyed
                    ? 'Message the agent… ("/" for skills)'
                    : 'Add an API key in agent settings first'
                }
                aria-label="Message the agent"
                disabled={!keyed}
              />
            </div>
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
                (draft.trim() === '' && !attachment)
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
