import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  SendHorizontal,
  Settings,
  Sparkles,
  Square,
  Trash2,
  X,
  XCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Bubble, BubbleContent } from '@/components/ui/bubble'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from '@/components/ui/input-group'
import {
  Marker,
  MarkerContent,
  MarkerIcon,
  markerVariants,
} from '@/components/ui/marker'
import { Message, MessageContent } from '@/components/ui/message'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { IconTooltip } from '@/components/editor/IconTooltip'
import { useSupabase } from '@/contexts/SupabaseProvider'
import {
  hydrateAgentTranscript,
  sendToAgent,
  stopAgent,
  useAgentRun,
  useAgentTranscriptHydrating,
  type TranscriptEvent,
} from '@/lib/agent/loop'
import { attachAgentPersistence } from '@/lib/agent/persistence'
import {
  clearAgentDraft,
  setAgentDraft,
  setOpenAgentSession,
  useAgentDraft,
  useOpenAgentSessionId,
} from '@/lib/agent/panelState'
import {
  AGENT_SKILL_COMMANDS,
  parseSkillDraft,
  skillMatchesQuery,
  type AgentSkillCommand,
} from '@/lib/agent/skills'
import { blockTranscript } from '@/lib/agent/transcriptBlocks'
import { listModels } from '@/lib/agent/providers/models'
import {
  createAgentSession,
  deleteAgentSession,
  hydrateAgentSessions,
  renameAgentSession,
  useAgentSessions,
  useAgentSessionsHydrating,
  type AgentSession,
} from '@/lib/agent/sessions'
import {
  AGENT_PROVIDERS,
  MODEL_OPTIONS,
  hasKey,
  modelFor,
  openAgentSettings,
  saveAgentSettings,
  setAgentSettingsOpen,
  useAgentSettings,
  useAgentSettingsOpen,
} from '@/lib/agent/settings'
import { cn } from '@/lib/utils'

/**
 * Case-insensitive subsequence match — every query character must appear,
 * in order, not necessarily adjacent ("dsp" finds "Draft the sample path").
 */
function fuzzyMatches(query: string, title: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const t = title.toLowerCase()
  let at = 0
  for (const char of q) {
    at = t.indexOf(char, at)
    if (at === -1) return false
    at += 1
  }
  return true
}

function isToday(iso: string): boolean {
  const then = new Date(iso)
  const now = new Date()
  return (
    then.getFullYear() === now.getFullYear() &&
    then.getMonth() === now.getMonth() &&
    then.getDate() === now.getDate()
  )
}

/**
 * The ✦ surface: two views, one at a time — session info never crowds the
 * conversation. Step 1 picks (or creates) a session; step 2 is the chat,
 * full height.
 */
export function AgentPanel() {
  const sessions = useAgentSessions()
  // Panel view state lives outside the component: both postures mount
  // their own AgentPanel, and toggling ✦ unmounts it entirely — local
  // state would drop you back to the session list every time.
  const openSessionId = useOpenAgentSessionId()
  const { client, canAgent } = useSupabase()

  // Persistence rides the authenticated client: signed-in, everything
  // lands in agent_sessions/agent_messages; anonymous visitors stay on
  // localStorage. Attaching also fires the replay signal for any parked
  // transcript hydrates.
  useEffect(() => {
    attachAgentPersistence(canAgent ? client : null)
    if (canAgent && client) void hydrateAgentSessions()
    return () => attachAgentPersistence(null)
  }, [canAgent, client])

  const openSession =
    openSessionId !== null
      ? (sessions.find((session) => session.id === openSessionId) ?? null)
      : null

  return openSession ? (
    <AgentChatView
      session={openSession}
      onBack={() => setOpenAgentSession(null)}
    />
  ) : (
    <AgentSessionsView
      sessions={sessions}
      onOpen={(id) => setOpenAgentSession(id)}
      onCreate={() => {
        const session = createAgentSession()
        // ＋ drops straight into the conversation.
        setOpenAgentSession(session.id)
      }}
    />
  )
}

function SessionRow({
  session,
  onOpen,
  onRename,
  onDelete,
}: {
  session: AgentSession
  onOpen: () => void
  onRename: () => void
  onDelete: () => void
}) {
  return (
    <div className="group/session flex w-full min-w-0 items-center gap-0.5">
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          'flex min-w-0 flex-1 items-center gap-1.5 rounded-md py-1.5 pl-2 pr-1 text-left transition-colors',
          'hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
        )}
      >
        <span className="min-w-0 flex-1 truncate text-[13px] text-sidebar-foreground/85">
          {session.title}
        </span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              aria-label={`Session actions for ${session.title}`}
              className="flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground/0 transition-colors group-hover/session:text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <MoreHorizontal className="size-3.5" aria-hidden />
            </button>
          }
        />
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={onRename}>
            <Pencil className="size-3.5" />
            Rename…
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            <Trash2 className="size-3.5" />
            Delete session…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function AgentSessionsView({
  sessions,
  onOpen,
  onCreate,
}: {
  sessions: AgentSession[]
  onOpen: (id: string) => void
  onCreate: () => void
}) {
  // canAgent gates the pending flag: without persistence there is nothing
  // on the wire, so "not yet hydrated" must not read as loading forever.
  const { canAgent } = useSupabase()
  const hydrating = useAgentSessionsHydrating() && canAgent
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [renameTarget, setRenameTarget] = useState<AgentSession | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AgentSession | null>(null)

  const searching = searchOpen && query.trim() !== ''
  const filtered = useMemo(
    () => sessions.filter((session) => fuzzyMatches(query, session.title)),
    [query, sessions],
  )
  const today = filtered.filter((session) => isToday(session.createdAt))
  const earlier = filtered.filter((session) => !isToday(session.createdAt))

  const rowFor = (session: AgentSession) => (
    <SessionRow
      key={session.id}
      session={session}
      onOpen={() => onOpen(session.id)}
      onRename={() => setRenameTarget(session)}
      onDelete={() => setDeleteTarget(session)}
    />
  )

  const group = (title: string, rows: AgentSession[]) =>
    rows.length > 0 ? (
      <div className="flex flex-col gap-0.5">
        <p className="px-2 pt-2 pb-0.5 text-2xs font-medium tracking-wider text-sidebar-foreground/50 uppercase">
          {title}
        </p>
        {rows.map(rowFor)}
      </div>
    ) : null

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-agent-panel="sessions">
      {/* Header: title, hover-priority actions. */}
      <div className="flex h-9 shrink-0 items-center gap-1 px-2">
        {searchOpen ? (
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setQuery('')
                setSearchOpen(false)
              }
            }}
            placeholder="Filter sessions…"
            className="h-6 flex-1 text-xs"
            aria-label="Filter sessions"
          />
        ) : (
          <p className="min-w-0 flex-1 truncate pl-1 text-2xs font-medium tracking-wider text-sidebar-foreground/60 uppercase">
            Sessions
          </p>
        )}
        <IconTooltip label="Filter sessions by name" side="bottom">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={searchOpen ? 'Close session filter' : 'Filter sessions'}
            aria-pressed={searchOpen}
            className="text-muted-foreground hover:text-foreground"
            onClick={() => {
              setSearchOpen((open) => {
                if (open) setQuery('')
                return !open
              })
            }}
          >
            <Search className="size-3.5" aria-hidden />
          </Button>
        </IconTooltip>
        <IconTooltip label="Start a new session" side="bottom">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="New session"
            className="text-muted-foreground hover:text-foreground"
            onClick={onCreate}
          >
            <Plus className="size-3.5" aria-hidden />
          </Button>
        </IconTooltip>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {hydrating ? (
          // The DB merge is the list's source of truth, so until the first
          // merge lands the WHOLE list is a loading state — the localStorage
          // cache underneath may be missing sessions from other browsers.
          <div className="flex flex-col gap-3 px-2 pt-2" aria-hidden>
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="h-3.5 w-32" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="px-1.5 pt-2 text-xs text-muted-foreground">
            No sessions yet. A session is one conversation plus the changes
            it made.
          </p>
        ) : searching ? (
          // A filter answers "where is it", so groups get out of the way.
          <div className="flex flex-col gap-0.5">
            {filtered.length === 0 ? (
              <p className="px-1.5 pt-2 text-xs text-muted-foreground">
                No session matches “{query.trim()}”.
              </p>
            ) : (
              filtered.map(rowFor)
            )}
          </div>
        ) : (
          <>
            {group('Today', today)}
            {group('Earlier', earlier)}
          </>
        )}
      </div>

      <RenameSessionDialog
        session={renameTarget}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null)
        }}
      />
      <DeleteSessionDialog
        session={deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      />
    </div>
  )
}

type ToolEvent = Extract<TranscriptEvent, { kind: 'tool' }>

/** One labelled payload block inside an opened tool row. */
function ToolDetail({ label, body }: { label: string; body: string }) {
  return (
    <div className="min-w-0">
      <p className="text-2xs font-medium tracking-wider text-muted-foreground uppercase">
        {label}
      </p>
      <pre className="mt-0.5 max-h-40 overflow-auto rounded-md bg-muted px-2 py-1.5 font-mono text-xs leading-snug whitespace-pre-wrap text-foreground/80">
        {body}
      </pre>
    </div>
  )
}

/**
 * A tool call. Collapsed it is a quiet one-liner; open it shows the
 * arguments the agent sent and what came back. Rows rehydrated from a
 * previous browser session carry no payload and stay flat.
 */
function ToolRow({ event }: { event: ToolEvent }) {
  const [open, setOpen] = useState(false)
  const expandable = Boolean(event.args || event.result)
  const face = (
    <>
      <MarkerIcon>
        {event.isError ? <XCircle aria-hidden /> : <CheckCircle2 aria-hidden />}
      </MarkerIcon>
      <MarkerContent className={cn(!open && 'truncate')}>
        <span className="font-mono">{event.name}</span>
        {event.summary ? (
          <span className="ml-1.5 text-muted-foreground">{event.summary}</span>
        ) : null}
      </MarkerContent>
    </>
  )

  if (!expandable) {
    return (
      <Marker className={cn(event.isError && 'text-destructive')}>{face}</Marker>
    )
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        render={
          <button
            type="button"
            className={cn(
              markerVariants({ variant: 'default' }),
              'cursor-pointer rounded-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              event.isError && 'text-destructive',
            )}
          >
            {face}
            <ChevronRight
              className={cn(
                'ml-auto size-3 shrink-0 opacity-60 transition-transform',
                open && 'rotate-90',
              )}
              aria-hidden
            />
          </button>
        }
      />
      <CollapsibleContent>
        <div className="mt-1 ml-6 flex flex-col gap-1.5">
          {event.args ? <ToolDetail label="Arguments" body={event.args} /> : null}
          {event.result ? <ToolDetail label="Result" body={event.result} /> : null}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function TranscriptRow({ event }: { event: TranscriptEvent }) {
  switch (event.kind) {
    case 'user':
      return (
        <Message align="end">
          <MessageContent>
            {event.skill ? (
              <div className="mb-0.5 flex justify-end gap-1">
                <Badge variant="secondary" className="font-mono">
                  /{event.skill}
                </Badge>
              </div>
            ) : null}
            <Bubble variant="tinted">
              <BubbleContent className="whitespace-pre-wrap">
                {event.text}
              </BubbleContent>
            </Bubble>
          </MessageContent>
        </Message>
      )
    case 'assistant':
      return (
        <Message>
          <MessageContent>
            <Bubble variant="ghost">
              <BubbleContent className="whitespace-pre-wrap text-foreground/90">
                {event.text}
              </BubbleContent>
            </Bubble>
          </MessageContent>
        </Message>
      )
    case 'tool':
      return <ToolRow event={event} />
    case 'status':
      return (
        <Marker variant="separator" className="italic">
          <MarkerContent>{event.text}</MarkerContent>
        </Marker>
      )
  }
}

function TranscriptStepsBlock({
  events,
  start,
  end,
  hasError,
}: {
  events: TranscriptEvent[]
  start: number
  end: number
  hasError: boolean
}) {
  // Errors start open — the fold must never hide a failure.
  const [open, setOpen] = useState(hasError)
  const count = end - start + 1
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="group/steps flex w-full items-center gap-1.5 rounded-md py-0.5 text-left text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <ChevronRight
          aria-hidden
          className={cn('size-3.5 transition-transform', open && 'rotate-90')}
        />
        <span>
          {count} steps{hasError ? ' — one failed' : ''}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="flex flex-col gap-3 pt-3 pl-1">
          {events.slice(start, end + 1).map((event, offset) => (
            <TranscriptRow key={start + offset} event={event} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function AgentChatView({
  session,
  onBack,
}: {
  session: AgentSession
  onBack: () => void
}) {
  const settings = useAgentSettings()
  const { client, canWrite, canAgent } = useSupabase()
  const keyed = hasKey(settings)
  // Drafts are per session, held outside the component — switching
  // conversations or re-docking the panel never eats what you were typing.
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
  const { events, running } = useAgentRun(session.id)
  // Same canAgent gate as the sessions list: without persistence the
  // "not yet hydrated" half of the flag would be a forever-skeleton.
  const transcriptHydrating = useAgentTranscriptHydrating(session.id) && canAgent
  const [renaming, setRenaming] = useState(false)
  const composerRowRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)

  // Reopening a session after a reload restores its transcript from
  // agent_messages (parks pre-attach; no-op for never-persisted sessions).
  useEffect(() => {
    void hydrateAgentTranscript(session.id)
  }, [session.id])

  // Keep the newest row in view while a run streams (only when the reader
  // is already near the bottom — never yank a scrolled-up reviewer down).
  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const nearBottom =
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 160
    if (nearBottom) viewport.scrollTop = viewport.scrollHeight
  }, [events.length, running])

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
      slashPickable[(index + delta + slashPickable.length) % slashPickable.length]
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
    if (!text && skill) text = `Run ${skill.label} from the top of its flow.`
    if (!text || running) return
    clearAgentDraft(session.id)
    void sendToAgent({
      client,
      sessionId: session.id,
      settings,
      contextNote: '',
      text,
      skill,
      allowWrites: canWrite,
    })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-agent-panel="chat">
      {/* Header: back + title. Nothing else — the transcript owns the
          rest of the height. */}
      <div className="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
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
          <span className="min-w-0 truncate text-xs font-medium text-foreground">
            {session.title}
          </span>
          <Pencil
            className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/title:opacity-100"
            aria-hidden
          />
        </button>
      </div>

      <div
        ref={viewportRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3"
      >
        <div className="flex min-h-full flex-col gap-3">
          {events.length === 0 ? (
            transcriptHydrating ? (
              // A persisted conversation is still on the wire — skeleton
              // bubbles, not the "Ready" copy, which read as the agent
              // having no loading state at all.
              <div className="flex flex-col gap-3" aria-hidden>
                <Skeleton className="ml-auto h-8 w-3/5 rounded-2xl" />
                <Skeleton className="h-8 w-4/5 rounded-2xl" />
                <Skeleton className="h-8 w-2/5 rounded-2xl" />
              </div>
            ) : keyed ? (
              <p className="text-sm text-muted-foreground">
                Ready ({modelFor(settings)}). Writes land live on the canvas
                as{' '}
                <Sparkles className="inline size-3 align-[-0.1em]" aria-hidden />{' '}
                edits.
              </p>
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
            // streaming stays visible. Chat replies never fold — only
            // completed tool/status step runs do (blockTranscript).
            blockTranscript(events).map((block, blockIndex, blocks) => {
              const isLastBlock = blockIndex === blocks.length - 1
              if (block.kind === 'steps' && !(running && isLastBlock)) {
                return (
                  <TranscriptStepsBlock
                    key={`steps-${block.start}`}
                    events={events}
                    start={block.start}
                    end={block.end}
                    hasError={block.hasError}
                  />
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
                  <div
                    key={index}
                    className={cn(event.kind === 'user' && index > 0 && 'mt-3')}
                  >
                    <TranscriptRow event={event} />
                  </div>
                )
              })
            })
          )}
          {running ? (
            <Marker role="status" aria-live="polite">
              <MarkerIcon>
                <Loader2 className="animate-spin" aria-hidden />
              </MarkerIcon>
              <MarkerContent>Working…</MarkerContent>
            </Marker>
          ) : null}
        </div>
      </div>

      <RenameSessionDialog
        session={renaming ? session : null}
        onOpenChange={(open) => {
          if (!open) setRenaming(false)
        }}
      />

      <div className="relative shrink-0 p-3 pt-2">
        {/* The slash menu: type "/" to see the four skills — the same
            SKILL.md files IDE agents run, minus their file mechanics.
            Rendered above the composer; the textarea keeps focus the whole
            time (the arrow keys live there), so this is a plain layer, not
            a focus-trapping popover. */}
        {slashOpen ? (
          <div
            role="listbox"
            aria-label="Agent skills"
            className="absolute inset-x-3 bottom-full z-10 mb-1.5 flex flex-col rounded-lg border border-border bg-popover p-1 shadow-md"
          >
            {slashMatches.map((command) => (
              <button
                key={command.id}
                type="button"
                role="option"
                aria-selected={command.id === nextHighlight}
                disabled={!command.content}
                onMouseEnter={() => setSlashHighlight(command.id)}
                onClick={() => pickSkill(command)}
                className={cn(
                  'flex items-baseline gap-2 rounded-md px-2 py-1.5 text-left text-xs disabled:opacity-50',
                  command.id === nextHighlight && 'bg-accent',
                )}
              >
                <span className="shrink-0 font-mono text-foreground">
                  {command.label}
                </span>
                <span className="min-w-0 flex-1 leading-snug text-muted-foreground">
                  {command.description}
                </span>
              </button>
            ))}
          </div>
        ) : null}
        <div ref={composerRowRef} className="flex items-end gap-1.5">
          {running ? (
            <IconTooltip label="Stop — whatever landed stays on the canvas">
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
          <InputGroup className="min-h-8 flex-1">
            {pendingSkill ? (
              <InputGroupAddon align="inline-start" className="self-start py-1.5">
                <Badge
                  variant="secondary"
                  className="gap-0.5 border-primary/25 bg-primary/10 pr-0.5 font-mono text-2xs text-primary"
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
              className="max-h-30 min-h-7 py-1.5 leading-5"
              value={draft}
              onChange={(event) => {
                const value = event.target.value
                // Typing a full command + space converts it into the chip
                // on the spot — the token is recognized, not just text.
                if (!pendingSkill) {
                  const token = /^\/([\w:]+)\s([\s\S]*)$/.exec(value)
                  const lowered = token?.[1].toLowerCase()
                  const command = lowered
                    ? AGENT_SKILL_COMMANDS.find(
                        (entry) =>
                          entry.id === lowered || entry.aliases.includes(lowered),
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
                  event.preventDefault()
                  setDraft('')
                  return
                }
                if (event.key === 'Backspace' && draft === '' && pendingSkill) {
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
                  ? pendingSkill.description
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
                !keyed || running || (draft.trim() === '' && !pendingSkill)
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

function RenameSessionDialog({
  session,
  onOpenChange,
}: {
  session: AgentSession | null
  onOpenChange: (open: boolean) => void
}) {
  const [title, setTitle] = useState('')
  // Freeze the incoming title per dialog opening.
  const [lastId, setLastId] = useState<string | null>(null)
  if (session && session.id !== lastId) {
    setLastId(session.id)
    setTitle(session.title)
  }
  if (!session && lastId !== null) setLastId(null)

  const submit = () => {
    if (!session) return
    const trimmed = title.trim()
    if (trimmed && trimmed !== session.title)
      renameAgentSession(session.id, trimmed)
    onOpenChange(false)
  }

  return (
    <Dialog open={session !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">Rename session</DialogTitle>
        </DialogHeader>
        <div className="px-6 py-4">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submit()
            }}
            aria-label="Session title"
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={submit} disabled={title.trim() === ''}>
            Rename
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DeleteSessionDialog({
  session,
  onOpenChange,
}: {
  session: AgentSession | null
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={session !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">
            Delete “{session?.title}”?
          </DialogTitle>
        </DialogHeader>
        <p className="px-6 py-4 text-xs text-muted-foreground">
          Changes it already made to the blueprint stay on the canvas.
        </p>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (session) deleteAgentSession(session.id)
              onOpenChange(false)
            }}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * The ⚙ settings popover: admin sign-in (when Supabase is configured) and
 * provider/model/key. BYO key: localStorage only, never rendered back —
 * the field shows a saved-state placeholder, not the key.
 */
export function AgentSettingsButton() {
  const settings = useAgentSettings()
  const { client, configured, session } = useSupabase()
  const [keyDraft, setKeyDraft] = useState('')
  const [emailDraft, setEmailDraft] = useState('')
  const [passwordDraft, setPasswordDraft] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  const signIn = () => {
    if (!client || authBusy) return
    const email = emailDraft.trim()
    if (!email || !passwordDraft) return
    setAuthBusy(true)
    setAuthError(null)
    void client.auth
      .signInWithPassword({ email, password: passwordDraft })
      .then(({ error }) => {
        setAuthBusy(false)
        if (error) {
          setAuthError(error.message)
          return
        }
        setEmailDraft('')
        setPasswordDraft('')
      })
  }

  const signOut = () => {
    if (!client || authBusy) return
    setAuthBusy(true)
    void client.auth.signOut().then(() => {
      setAuthBusy(false)
      setAuthError(null)
    })
  }

  const open = useAgentSettingsOpen()
  const setOpen = setAgentSettingsOpen
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
    if (!open || !savedKeyForFetch) return
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
  }, [open, provider, savedKeyForFetch])
  const modelChoices =
    liveModels && liveModels.provider === provider
      ? liveModels.models
      : MODEL_OPTIONS[provider]
  const providerLabel =
    AGENT_PROVIDERS.find((entry) => entry.id === settings.provider)?.label ??
    settings.provider
  const savedKey = settings.keys[settings.provider]

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <IconTooltip label="Agent settings" side="bottom">
        <PopoverTrigger
          render={
            <button
              type="button"
              aria-label="Agent settings"
              className="flex size-6 items-center justify-center rounded-md text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            >
              <Settings className="size-3.5" aria-hidden />
            </button>
          }
        />
      </IconTooltip>
      <PopoverContent side="right" align="end" className="w-72 p-3">
        <div className="flex flex-col gap-2.5">
          {configured ? (
            <>
              <p className="text-xs font-medium text-foreground">Account</p>
              {session ? (
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-2xs text-muted-foreground">
                    {session.user.email ?? 'Signed in'}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    disabled={authBusy}
                    onClick={signOut}
                  >
                    Sign out
                  </Button>
                </div>
              ) : (
                <>
                  <Input
                    type="email"
                    value={emailDraft}
                    onChange={(event) => setEmailDraft(event.target.value)}
                    placeholder="you@…"
                    className="h-7 text-xs"
                    aria-label="Account email"
                    autoComplete="email"
                  />
                  <div className="flex items-center gap-2">
                    <Input
                      type="password"
                      value={passwordDraft}
                      onChange={(event) => setPasswordDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') signIn()
                      }}
                      placeholder="Password"
                      className="h-7 flex-1 text-xs"
                      aria-label="Account password"
                      autoComplete="current-password"
                    />
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      disabled={
                        authBusy || emailDraft.trim() === '' || passwordDraft === ''
                      }
                      onClick={signIn}
                    >
                      Sign in
                    </Button>
                  </div>
                  {authError ? (
                    <p className="text-3xs leading-snug text-destructive">
                      {authError}
                    </p>
                  ) : (
                    <p className="text-3xs leading-snug text-muted-foreground">
                      Signing in unlocks agent persistence and (for service
                      accounts) writes.
                    </p>
                  )}
                </>
              )}
              <div className="my-0.5 border-t border-border/60" />
            </>
          ) : null}

          <p className="text-xs font-medium text-foreground">Agent</p>

          <div className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-2xs text-muted-foreground">
              Provider
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 flex-1 justify-start text-xs"
                  >
                    {providerLabel}
                  </Button>
                }
              />
              <DropdownMenuContent align="start">
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
            <span className="w-16 shrink-0 text-2xs text-muted-foreground">
              Model
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 flex-1 justify-start font-mono text-xs"
                  >
                    {modelFor(settings)}
                  </Button>
                }
              />
              <DropdownMenuContent
                align="start"
                className="max-h-64 overflow-y-auto"
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
                    <span className="font-mono text-xs">{model}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-2xs text-muted-foreground">
              API key
            </span>
            <Input
              type="password"
              value={keyDraft}
              onChange={(event) => setKeyDraft(event.target.value)}
              placeholder={savedKey ? '••••••••  saved' : 'Paste key'}
              className="h-7 flex-1 text-xs"
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
        </div>
      </PopoverContent>
    </Popover>
  )
}
