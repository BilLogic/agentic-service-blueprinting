import type { TranscriptEvent } from '@/lib/agent/loop'

/**
 * Transcript grouping: a finished run's tool/status rows fold into one
 * "N steps" accordion — a long build otherwise leaves a wall of
 * upsert_cell rows between the question and the answer. BINDING rules
 * (2026-08-17 agent-surface lessons):
 *  - chat replies (user/assistant rows) NEVER fold — only completed
 *    tool/status step runs do;
 *  - only runs of ≥3 consecutive step rows fold;
 *  - a run containing an error starts open (the panel reads hasError) —
 *    collapsing a failure would hide the thing that most needs reading;
 *  - the LIVE tail never folds (the panel skips folding the last block
 *    while a run streams).
 *
 * A module of its own so the fold rules are testable without mounting the
 * panel.
 */
export type TranscriptBlock =
  | { kind: 'event'; index: number }
  | { kind: 'steps'; start: number; end: number; hasError: boolean }

export const MIN_FOLDED_STEPS = 3

export function blockTranscript(events: TranscriptEvent[]): TranscriptBlock[] {
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
