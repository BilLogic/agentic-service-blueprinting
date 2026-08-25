import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Search,
  SendHorizontal,
  Settings,
  Sparkles,
  Square,
  Trash2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from '@/components/ui/input-group'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { Bubble, BubbleContent } from '@/components/ui/bubble'
import {
  Marker,
  MarkerContent,
  MarkerIcon,
  markerVariants,
} from '@/components/ui/marker'
import { Message, MessageContent } from '@/components/ui/message'
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from '@/components/ui/message-scroller'
/*
 * Lazy: AgentMarkdown is the only importer of react-markdown's unified
 * toolchain, and transcripts only render once the agent surface is open —
 * no reason for the landing page to pay for a markdown parser. The fallback
 * is the raw text, so a slow chunk shows content, not a spinner.
 */
const AgentMarkdownLazy = lazy(() =>
  import('@/components/editor/AgentMarkdown').then((m) => ({
    default: m.AgentMarkdown,
  })),
)

function AgentMarkdown(props: { text: string; className?: string }) {
  return (
    <Suspense
      fallback={
        <p className={cn('whitespace-pre-wrap', props.className)}>
          {props.text}
        </p>
      }
    >
      <AgentMarkdownLazy {...props} />
    </Suspense>
  )
}
import { IconTooltip } from '@/components/editor/IconTooltip'
import { NavSection } from '@/components/editor/SidebarNav'
import { Badge } from '@/components/ui/badge'
import { AgentSessionsLoadingSkeleton } from '@/components/editor/EditorLoadingSkeletons'
import {
  DeferredSkeleton,
  EDITOR_BOOT_HOLD_KEY,
} from '@/components/ui/deferred-skeleton'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentTitle,
} from '@/components/ui/attachment'
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
  type TranscriptEvent,
} from '@/lib/agent/loop'
import {
  setPendingAgentAttachment,
  takePendingAgentAttachment,
  usePendingAgentAttachment,
} from '@/lib/agent/attachments'
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
  hasKey,
  modelFor,
  openAgentSettings,
  setAgentSettingsOpen,
  useAgentSettings,
  useAgentSettingsOpen,
} from '@/lib/agent/settings'
import { AgentSettingsFields } from '@/components/editor/AgentSettingsFields'
import { AgentTrialBanner } from '@/components/editor/AgentTrialBanner'
import { cn } from '@/lib/utils'

/**
 * Case-insensitive subsequence match — the same forgiving filter the tag
 * pickers use: every query character must appear, in order, not necessarily
 * adjacent ("dic" finds "Draft the Intake Call").
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

  // Persistence rides the authenticated client: locally everything lands in
  // agent_sessions/agent_messages (viewers included — chat is their whole
  // surface); anonymous visitors stay on localStorage.
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

/**
 * "N changes this session" — the ledger count, spoken once, in one place.
 * The ✦ used to be a literal character in the copy; it is the Sparkles icon
 * everywhere else in the app, so it is the Sparkles icon here too.
 */
function ChangeCount({
  count,
  className,
}: {
  count: number
  className?: string
}) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center gap-0.5 text-2xs tabular-nums',
        className,
      )}
      title={`${count} change${count === 1 ? '' : 's'} from this session`}
    >
      <Sparkles className="size-2.5" aria-hidden />
      {count}
      <span className="sr-only">
        {' '}
        change{count === 1 ? '' : 's'} from this session
      </span>
    </span>
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
  const changeCount = useAgentChangeCount(session.id)
  const row = (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        // pl-6 = the NavSection title's own text indent (pl-1 + size-4
        // chevron slot + gap-1), so rows left-align with TODAY / EARLIER.
        'group/session flex w-full min-w-0 items-center gap-1.5 rounded-md py-1.5 pl-6 pr-2 text-left transition-colors',
        'hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
      )}
    >
      {/* No per-row glyph: a column of identical ✦ marks says nothing the
          SESSIONS header hasn't already said. */}
      <span className="min-w-0 flex-1 truncate text-sm text-sidebar-foreground/85 group-hover/session:text-sidebar-accent-foreground">
        {session.title}
      </span>
      {changeCount > 0 ? (
        <ChangeCount
          count={changeCount}
          className="text-sidebar-foreground/50"
        />
      ) : null}
    </button>
  )

  return (
    <ContextMenu>
      <ContextMenuTrigger className="block w-full">{row}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={onRename}>
          <Pencil className="size-3.5" />
          Rename…
        </ContextMenuItem>
        <ContextMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 className="size-3.5" />
          Delete session…
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
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
  // The no-database trial passes canAgent with NO client — persistence can
  // never attach there, so it must not wait for it either.
  const { canAgent, isSampleTrial } = useSupabase()
  const hydrating = useAgentSessionsHydrating() && canAgent && !isSampleTrial
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [todayOpen, setTodayOpen] = useState(true)
  const [earlierOpen, setEarlierOpen] = useState(true)
  const [renameTarget, setRenameTarget] = useState<AgentSession | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AgentSession | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const pendingAttachment = usePendingAgentAttachment()
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

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-agent-panel="sessions">
      {/* Header: title, hover-priority actions — the Figma Pages row. */}
      <div className="flex h-9 shrink-0 items-center gap-1 px-2">
        {searchOpen ? (
          <Input
            ref={searchRef}
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

      {pendingAttachment ? (
        <p className="mx-2 mb-1 flex items-start gap-1.5 rounded-md bg-muted px-2 py-1.5 text-2xs text-muted-foreground">
          <Pencil className="mt-px size-3 shrink-0" aria-hidden />
          <span>
            {pendingAttachment.label} ready — open or start a session to send
            them.
          </span>
        </p>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {/*
          Same loading contract as the phases nav, on the same boot session.

          The DB merge is the list's source of truth, so until the first
          merge lands the WHOLE list is a loading state — the localStorage
          cache underneath may be missing sessions from other browsers. What
          changed is the packaging: this was a bare ternary, so it painted
          its rows the instant the merge landed rather than holding and
          fading like every other surface. The BOOT case is not handled
          here — the sidebar's boot lane in EditorShell covers this panel
          whole and lifts with the canvas, so nothing in the sidebar can
          resolve ahead of the board.
        */}
        <DeferredSkeleton
          loading={hydrating}
          holdKey={EDITOR_BOOT_HOLD_KEY}
          skeleton={<AgentSessionsLoadingSkeleton />}
        >
          {sessions.length === 0 ? (
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
            {today.length > 0 ? (
              <NavSection
                title="Today"
                open={todayOpen}
                onOpenChange={setTodayOpen}
              >
                {today.map(rowFor)}
              </NavSection>
            ) : null}
            {earlier.length > 0 ? (
              <NavSection
                title="Earlier"
                open={earlierOpen}
                onOpenChange={setEarlierOpen}
              >
                {earlier.map(rowFor)}
              </NavSection>
            ) : null}
          </>
          )}
        </DeferredSkeleton>
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

/** Live count of ledger entries this agent session produced. */
function useAgentChangeCount(sessionId: string): number {
  const changes = useSyncExternalStore(subscribeToSession, sessionSnapshot)
  return changes.filter((entry) => entry.agentSessionId === sessionId).length
}

/**
 * One transcript row, built from the DS chat primitives: user turns are
 * tinted bubbles on the right, agent prose is a ghost bubble, tool calls
 * and status lines are Markers — the chat vocabulary shadcn ships, not a
 * hand-rolled lookalike.
 */

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
 * A tool call. Collapsed it is the same quiet one-liner it always was; open
 * it shows the arguments the agent sent and what came back — the same
 * disclosure vocabulary as the folded steps block, so a reviewer only has
 * to learn one gesture. Rows rehydrated from a previous browser session carry
 * no payload and stay flat.
 */
function ToolRow({ event }: { event: ToolEvent }) {
  const [open, setOpen] = useState(false)
  const expandable = Boolean(event.args || event.result)
  const face = (
    <>
      <MarkerIcon>
        {event.isError ? (
          <XCircle aria-hidden />
        ) : (
          <CheckCircle2 aria-hidden />
        )}
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
      <Marker className={cn(event.isError && 'text-destructive')}>
        {face}
      </Marker>
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
          {event.result ? (
            <ToolDetail label="Result" body={event.result} />
          ) : null}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function TranscriptRow({
  event,
}: {
  event: TranscriptEvent
}) {
  switch (event.kind) {
    case 'user':
      return (
        <Message align="end">
          <MessageContent>
            {event.skill || event.attachmentLabel ? (
              <div className="mb-0.5 flex justify-end gap-1">
                {event.skill ? (
                  <Badge variant="secondary" className="font-mono">
                    /{event.skill}
                  </Badge>
                ) : null}
                {event.attachmentLabel ? (
                  <Badge variant="outline">
                    <Pencil aria-hidden />
                    {event.attachmentLabel}
                  </Badge>
                ) : null}
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
              <BubbleContent className="text-foreground/90">
                <AgentMarkdown text={event.text} />
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

/**
 * Transcript grouping (2026-08-17): a finished run's tool/status rows fold
 * into one "N steps" accordion — a long build otherwise leaves a wall of
 * upsert_cell rows between the question and the answer. Rules: only runs of
 * ≥3 consecutive step rows fold; the LIVE tail never folds (streaming stays
 * visible); a run containing an error starts open — collapsing a failure
 * would hide the thing that most needs reading.
 */
type TranscriptBlock =
  | { kind: 'event'; index: number }
  | { kind: 'steps'; start: number; end: number; hasError: boolean }

const MIN_FOLDED_STEPS = 3

function blockTranscript(events: TranscriptEvent[]): TranscriptBlock[] {
  const blocks: TranscriptBlock[] = []
  let runStart = -1
  let runHasError = false
  const flush = (end: number) => {
    if (runStart === -1) return
    if (end - runStart >= MIN_FOLDED_STEPS) {
      blocks.push({
        kind: 'steps',
        start: runStart,
        end: end - 1,
        hasError: runHasError,
      })
    } else {
      for (let i = runStart; i < end; i += 1)
        blocks.push({ kind: 'event', index: i })
    }
    runStart = -1
    runHasError = false
  }
  events.forEach((event, index) => {
    const isStep = event.kind === 'tool' || event.kind === 'status'
    if (isStep) {
      if (runStart === -1) runStart = index
      if (
        (event.kind === 'tool' && event.isError) ||
        (event.kind === 'status' && /error/i.test(event.text))
      )
        runHasError = true
      return
    }
    flush(index)
    blocks.push({ kind: 'event', index })
  })
  flush(events.length)
  return blocks
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
          className={cn(
            'size-3.5 transition-transform duration-(--motion-fade) motion-reduce:transition-none',
            open && 'rotate-90',
          )}
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
          <span className="min-w-0 truncate text-xs font-medium text-foreground">
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
                  <AttachmentTitle className="text-xs">
                    {attachment.label}
                  </AttachmentTitle>
                  <AttachmentDescription className="text-2xs">
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
                    className="items-baseline gap-2 text-xs"
                  >
                    <span className="shrink-0 font-mono text-foreground">
                      {command.label}
                    </span>
                    <span className="min-w-0 flex-1 leading-snug text-muted-foreground">
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
              /command rides in an addon INSIDE it as an accent chip
              (Claude's grammar — the token visibly stopped being text).
              The old hand-rolled wrapper stacked a 1px border and a 2px ring
              on a borderless textarea: the box-around-a-box. */}
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
              // No imperative height write: the DS Textarea is
              // `field-sizing-content`, so the browser grows it. max-h caps
              // it at ~6 lines and then it scrolls, as before.
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
        {/* Body content carries its own gutter — DialogContent is
            deliberately unpadded so p-0 surfaces (command palette,
            walkthrough) don't fight it. */}
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
          Changes it already made to the blueprint stay — revert those from
          Changes.
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
 * The ⚙ at the rail's bottom: admin sign-in always; provider/model/key only
 * when this session can write. On the deployed site the gear is therefore
 * the front door — sign in as an admin (accounts are hand-created; public
 * sign-ups stay disabled) and the authoring surface + agent appear. RLS is
 * still the authority; this UI only starts a session.
 */
export function AgentSettingsRailButton() {
  const open = useAgentSettingsOpen()
  const setOpen = setAgentSettingsOpen

  return (
    <TooltipProvider delay={300}>
      <Popover open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger
            render={
              <PopoverTrigger
                render={
                  <button
                    type="button"
                    aria-label="Agent settings"
                    className="flex size-9 items-center justify-center rounded-md text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                  >
                    <Settings className="size-4" aria-hidden />
                  </button>
                }
              />
            }
          />
          <TooltipContent side="right" className="text-xs">
            Agent settings
          </TooltipContent>
        </Tooltip>
        <PopoverContent side="right" align="end" className="w-72 p-3">
          <AgentSettingsFields active={open} />
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  )
}
