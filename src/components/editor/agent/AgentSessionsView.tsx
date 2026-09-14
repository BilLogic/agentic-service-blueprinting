import { useMemo, useRef, useState } from 'react'
import { Eyebrow } from '@/components/blueprint/Eyebrow'
import { Pencil, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { IconTooltip } from '@/components/editor/IconTooltip'
import { NavSection } from '@/components/editor/SidebarNav'
import { AgentSessionsLoadingSkeleton } from '@/components/editor/EditorLoadingSkeletons'
import {
  DeferredSkeleton,
  EDITOR_BOOT_HOLD_KEY,
} from '@/components/ui/deferred-skeleton'
import { SessionRow } from '@/components/editor/agent/SessionRow'
import {
  DeleteSessionDialog,
  RenameSessionDialog,
} from '@/components/editor/agent/SessionDialogs'
import { useSupabase } from '@/contexts/SupabaseProvider'
import { usePendingAgentAttachment } from '@/lib/agent/attachments'
import {
  useAgentSessionsHydrating,
  type AgentSession,
} from '@/lib/agent/sessions'

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
 * Step 1 of the ✦ surface: the sessions a person has, grouped by whether
 * they started today, filterable by name, each row opening a conversation.
 * Which session is open is the panel's business, so this view reports a
 * pick rather than holding one.
 */
export function AgentSessionsView({
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
          <Eyebrow className="min-w-0 flex-1 truncate pl-1">
            Sessions
          </Eyebrow>
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
        <p className="mx-2 mb-1 flex items-start gap-1.5 rounded-md bg-muted px-2 py-1.5 text-xs text-muted-foreground">
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
          here — the sidebar's boot layer in EditorShell covers this panel
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
