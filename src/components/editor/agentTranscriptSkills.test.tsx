// @vitest-environment jsdom
/**
 * A past turn reads back with every skill it invoked.
 *
 * A message can carry several skills, so a row that shows one of them
 * misreports the turn — and the rows a reopened session hydrates from the
 * database are the ones nobody can correct by looking at the composer. The
 * second case is the older spelling: a row persisted when a message could
 * only carry one skill still carries the single field, and it still has to
 * render the badge it was sent with.
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

  it('still shows the badge on a row an earlier release persisted', () => {
    const event: TranscriptEvent = {
      kind: 'user',
      text: 'audit the intake',
      skill: 'sb:audit',
    }
    render(<TranscriptRow event={event} />)
    expect(badges()).toEqual(['/sb:audit'])
  })
})
