// @vitest-environment jsdom
/**
 * THE SESSION MODULE, READ THROUGH ITS OWN INTERFACE.
 *
 * The agent-session slice drives this module from the panel, end to end, and
 * it is the instrument for anything that moves between these files. What it
 * does not do is exercise the two commands a person reaches for most once a
 * session exists — rename and delete — because the flow it drives never
 * renames and never deletes. That left the two verbs the dialogs call with no
 * cover at all, which is a poor position from which to move the code holding
 * them.
 *
 * So this file asks the module directly, one verb at a time: what the list
 * holds after each, what the storage layer the next boot reads holds, and —
 * below — which session is open once the open one is gone. jsdom, because the
 * module is a browser store with a localStorage layer; no persistence
 * attaches, which is the anonymous visitor's case and the one every assertion
 * here is written for.
 */
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  agentSessionsSnapshot,
  autoNameSession,
  closeAgentSession,
  createAgentSession,
  deleteAgentSession,
  openAgentSession,
  openAgentSessionId,
  renameAgentSession,
  setAgentDraft,
  useAgentDraft,
  useOpenAgentSession,
} from '@/lib/agent/sessions'
import { storageKey } from '@/lib/storageNamespace'

/** The module store outlives a file's cases, so each one starts from empty. */
beforeEach(() => {
  closeAgentSession()
  agentSessionsSnapshot().forEach((session) => deleteAgentSession(session.id))
})

afterEach(() => {
  closeAgentSession()
})

/** The list as the next boot would read it, out of localStorage. */
function storedSessions(): { id: string; title: string }[] {
  const raw = window.localStorage.getItem(storageKey('agent-sessions'))
  return raw ? (JSON.parse(raw) as { id: string; title: string }[]) : []
}

describe('the session list', () => {
  it('puts a new session at the top and hands it back', () => {
    const first = createAgentSession()
    const second = createAgentSession('Named on creation')

    expect(agentSessionsSnapshot().map((session) => session.id)).toEqual([
      second.id,
      first.id,
    ])
    expect(second.title).toBe('Named on creation')
    expect(first.title).toBe('New session')
  })
})

describe('renaming a session', () => {
  it('changes that session title and no other, and restamps it', () => {
    const target = createAgentSession('Before')
    const bystander = createAgentSession('Bystander')

    renameAgentSession(target.id, 'After')

    const renamed = agentSessionsSnapshot().find(
      (session) => session.id === target.id,
    )
    expect(renamed?.title).toBe('After')
    expect(renamed?.createdAt).toBe(target.createdAt)
    expect(Date.parse(renamed!.updatedAt)).toBeGreaterThanOrEqual(
      Date.parse(target.updatedAt),
    )
    expect(
      agentSessionsSnapshot().find((session) => session.id === bystander.id)
        ?.title,
    ).toBe('Bystander')
    expect(storedSessions().find((session) => session.id === target.id)?.title).toBe(
      'After',
    )
  })

  it('leaves the order alone — a rename is not a bump to the top', () => {
    const older = createAgentSession('Older')
    const newer = createAgentSession('Newer')

    renameAgentSession(older.id, 'Older, renamed')

    expect(agentSessionsSnapshot().map((session) => session.id)).toEqual([
      newer.id,
      older.id,
    ])
  })

  it('does nothing for an id the list does not hold', () => {
    createAgentSession('Only')

    renameAgentSession('not-a-session', 'Nothing to rename')

    expect(agentSessionsSnapshot().map((session) => session.title)).toEqual([
      'Only',
    ])
  })

  it('auto-names a default-titled session, and never overwrites a deliberate name', () => {
    const auto = createAgentSession()

    autoNameSession(auto.id, '  Draft   the intake call  ')
    expect(
      agentSessionsSnapshot().find((session) => session.id === auto.id)?.title,
    ).toBe('Draft the intake call')

    // The second message does not get to rename it: the session no longer
    // wears the default name, and the name it wears now is somebody's.
    autoNameSession(auto.id, 'And now something else')
    expect(
      agentSessionsSnapshot().find((session) => session.id === auto.id)?.title,
    ).toBe('Draft the intake call')
  })
})

describe('deleting a session', () => {
  it('takes that session out of the list and leaves the rest standing', () => {
    const kept = createAgentSession('Kept')
    const doomed = createAgentSession('Doomed')

    deleteAgentSession(doomed.id)

    expect(agentSessionsSnapshot().map((session) => session.id)).toEqual([
      kept.id,
    ])
  })

  it('does nothing for an id the list does not hold', () => {
    createAgentSession('Only')

    deleteAgentSession('not-a-session')

    expect(agentSessionsSnapshot()).toHaveLength(1)
  })

  it('writes the deletion through to the storage layer the next boot reads', () => {
    const doomed = createAgentSession('Doomed')
    createAgentSession('Kept')

    deleteAgentSession(doomed.id)

    expect(storedSessions().map((session) => session.title)).toEqual(['Kept'])
  })
})

/**
 * THE RULE THIS MODULE EXISTS TO HOLD.
 *
 * The open session is read as a session, not as an id, so the question "is
 * the session I am looking at still there" is answered here rather than by a
 * fallback in whatever component happens to render it. Which means the
 * deletion has to say so.
 */
describe('the open session', () => {
  it('is the session the list holds under the open id', () => {
    const session = createAgentSession('Open me')
    const { result } = renderHook(() => useOpenAgentSession())

    expect(result.current).toBeNull()
    act(() => openAgentSession(session.id))
    expect(result.current?.id).toBe(session.id)

    // A rename of the open session is a new object in the list, and the open
    // session is whatever the list holds now.
    act(() => renameAgentSession(session.id, 'Renamed while open'))
    expect(result.current?.title).toBe('Renamed while open')
  })

  it('clears when the open session is deleted', () => {
    const open = createAgentSession('Open me')
    const { result } = renderHook(() => useOpenAgentSession())
    act(() => openAgentSession(open.id))
    expect(result.current?.id).toBe(open.id)

    act(() => deleteAgentSession(open.id))

    // The id is CLEARED, not merely unresolvable against a list that no
    // longer holds it — which is the difference between a rule and a
    // fallback, and the only one of the two a reader of this module can rely
    // on. (`useOpenAgentSession` reads null either way, so asserting only
    // through the hook would hold nothing.)
    expect(openAgentSessionId()).toBeNull()
    expect(result.current).toBeNull()
  })

  it('stays open when some other session is deleted', () => {
    const open = createAgentSession('Open me')
    const bystander = createAgentSession('Not me')
    const { result } = renderHook(() => useOpenAgentSession())
    act(() => openAgentSession(open.id))

    act(() => deleteAgentSession(bystander.id))

    expect(result.current?.id).toBe(open.id)
  })

  it('closes on request, leaving the session in the list', () => {
    const session = createAgentSession('Open me')
    const { result } = renderHook(() => useOpenAgentSession())
    act(() => openAgentSession(session.id))

    act(() => closeAgentSession())

    expect(result.current).toBeNull()
    expect(agentSessionsSnapshot()).toHaveLength(1)
  })
})

describe('a deleted session takes its draft with it', () => {
  it('leaves nothing under an id that can never come back', () => {
    const session = createAgentSession('Drafting')
    const { result } = renderHook(() => useAgentDraft(session.id))
    act(() => setAgentDraft(session.id, { text: 'half a sentence', skillId: null }))
    expect(result.current.text).toBe('half a sentence')

    act(() => deleteAgentSession(session.id))

    expect(result.current).toEqual({ text: '', skillId: null })
  })
})
