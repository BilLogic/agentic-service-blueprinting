// @vitest-environment jsdom
/**
 * A past turn reads back with every skill it invoked.
 *
 * A message can carry several skills, so a row that shows one of them
 * misreports the turn. The older spelling — a row persisted when a message
 * could only carry one skill — is pinned where it is handled, through the
 * hydrate in `src/slices/agentSession.slice.test.tsx`, because the read is
 * what settles it and a hand-built event would prove nothing about the read.
 */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { TranscriptRow } from '@/components/editor/agent/TranscriptRow'
import type { TranscriptEvent } from '@/lib/agent/loop'

const badges = () =>
  screen
    .getAllByText(/^\/sb:/)
    .map((element) => element.textContent)

afterEach(cleanup)

describe('a user turn that invoked skills', () => {
  it('shows one badge per skill, in the order the message invoked them', () => {
    const event: TranscriptEvent = {
      kind: 'user',
      text: 'build this from my notes, then check it',
      skills: ['sb:map', 'sb:audit'],
    }
    render(<TranscriptRow event={event} />)
    expect(badges()).toEqual(['/sb:map', '/sb:audit'])
  })
})
