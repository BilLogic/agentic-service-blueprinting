import { describe, expect, it } from 'vitest'
import { blockTranscript } from '@/lib/agent/transcriptBlocks'
import type { TranscriptEvent } from '@/lib/agent/loop'

const user = (text: string): TranscriptEvent => ({ kind: 'user', text })
const reply = (text: string): TranscriptEvent => ({ kind: 'assistant', text })
const tool = (name: string, isError = false): TranscriptEvent => ({
  kind: 'tool',
  name,
  summary: '',
  isError,
})
const status = (text: string): TranscriptEvent => ({ kind: 'status', text })

describe('blockTranscript (agent-surface fold rules)', () => {
  it('chat replies never fold — only tool/status runs do', () => {
    const events = [
      user('q'),
      reply('a1'),
      reply('a2'),
      reply('a3'),
      reply('a4'),
    ]
    const blocks = blockTranscript(events)
    expect(blocks.every((block) => block.kind === 'event')).toBe(true)
  })

  it('folds runs of >= 3 consecutive step rows', () => {
    const events = [
      user('build it'),
      tool('add_lane'),
      tool('upsert_cell'),
      tool('upsert_cell'),
      reply('done'),
    ]
    const blocks = blockTranscript(events)
    expect(blocks).toEqual([
      { kind: 'event', index: 0 },
      { kind: 'steps', start: 1, end: 3, hasError: false },
      { kind: 'event', index: 4 },
    ])
  })

  it('leaves runs of < 3 step rows unfolded', () => {
    const events = [user('q'), tool('get_blueprint'), tool('get_cell'), reply('a')]
    expect(blockTranscript(events).every((block) => block.kind === 'event')).toBe(
      true,
    )
  })

  it('marks a run containing an error so the panel opens it', () => {
    const events = [
      user('q'),
      tool('add_step'),
      tool('upsert_cell', true),
      status('Paused'),
      reply('a'),
    ]
    const steps = blockTranscript(events).find((block) => block.kind === 'steps')
    expect(steps).toMatchObject({ hasError: true })
  })

  it('a trailing run still flushes (the panel decides live-tail unfolding)', () => {
    const events = [user('q'), tool('a'), tool('b'), tool('c')]
    const blocks = blockTranscript(events)
    expect(blocks.at(-1)).toEqual({
      kind: 'steps',
      start: 1,
      end: 3,
      hasError: false,
    })
  })
})
