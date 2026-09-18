import type { CameraTransform } from '@/lib/cameraTransition'

/**
 * One camera move toward a named target, awaited by whoever asked for it, and
 * the single place the whole handshake lives.
 *
 * Three callers used to re-derive it: each armed a waiter, committed a
 * selection, raced a hand-tuned deadline of its own, invented its own word
 * for silence, and remembered — or forgot — to detach the loser. Everything
 * that had to be true for that to work was written in prose comments beside
 * the callers rather than in the channel they all used, which is why the same
 * ordering defect shipped twice. A caller now hands over the target and the
 * act that commits the selection; arming, committing, the race, detaching
 * both losers and the verdict all happen in here.
 *
 * The read runs ONE WAY, which the decision record for this handshake states
 * and which the separate-clocks record before it requires: the canvas
 * publishes where it got to, whoever asked decides what to do about it, and
 * nothing on the canvas waits on a shell state in return.
 */

/**
 * The four words a jump can answer in.
 *
 * `unanswered` is the one that is not the canvas talking. It is what the
 * deadline says when nobody ever answered — a phase whose scenario never
 * rendered, a background tab whose `requestAnimationFrame` is suspended
 * mid-flight, or a viewport that left the tree for good. Measured on real
 * hardware it is reachable rather than defensive: at a 6× CPU slowdown a real
 * scenario jump published at 2202 ms and the reader was told so honestly.
 */
export type JumpVerdict = 'landed' | 'cancelled' | 'superseded' | 'unanswered'

/**
 * What the canvas itself may say. `unanswered` is absent on purpose: silence
 * is the only way to reach it, so a viewport claiming it would be claiming
 * that nobody answered while answering.
 */
export type SettledJumpVerdict = Exclude<JumpVerdict, 'unanswered'>

export type Jump = {
  verdict: JumpVerdict
  /** Where the canvas reported it got to; null when nothing ever answered. */
  transform: CameraTransform | null
}

/** A jump whose commit hands its own answer back instead of publishing one. */
export type AnsweredJump<TAnswer> = {
  verdict: JumpVerdict
  /** The commit's own result; null when nothing ever answered. */
  answer: TAnswer | null
}

/**
 * How long a jump is awaited before the silence is called `unanswered`.
 *
 * ONE number, and the measurement is its justification rather than a feel for
 * it. Driven through the agent's scenario open against a live bridge on a
 * 390×844 viewport, read from the publisher itself: the verdict arrives at a
 * median of 366 ms and a maximum of 422 ms, which is the 200 ms fade plus the
 * canvas remount plus the fit — the flight itself is effectively free. At a 4×
 * CPU throttle the maximum is 1332 ms. This clears the median by about 5.5×
 * and still holds under that throttle; the first real failure appears around a
 * 5–6× slowdown.
 *
 * It replaces three hand-tuned numbers — 1800 ms for the agent's navigation
 * tools, 1500 ms for cell focus, 2000 ms for the phone's caret hand-back —
 * whose only relationship was that the phone's had to outlast the tool's or
 * the caret came back before the tool had answered. Nothing varies across
 * those three sites: cell focus has no remount to wait for, and the tool's
 * 1800 ms was never tight either. So there is no override parameter to pass.
 * A caller that genuinely differs can introduce one, with its measurement.
 *
 * Caveats the measurement carries: a dev build on a desktop-class CPU, one
 * sample blueprint, no physical phone, and neither the cold first navigation
 * nor the reduced-motion path (which skips the fade) was sampled.
 */
export const JUMP_DEADLINE_MS = 2000

/** The canvas's flight vocabulary, read into the verdict words. */
export function verdictOfFlight(
  completion: 'completed' | 'cancelled' | 'superseded',
): SettledJumpVerdict {
  return completion === 'completed' ? 'landed' : completion
}

type Waiter = (jump: Jump) => void

const waiters = new Map<string, Set<Waiter>>()

/**
 * The canvas's half: answer every jump waiting on this target, once.
 *
 * Letting go of a flight is the deliberate absence of this call. A viewport
 * can vanish mid-flight while the destination the reader asked for is
 * unchanged — the path filter for a freshly opened scenario resolves a beat
 * after the selection, so the board is briefly replaced by its no-paths state
 * and the canvas remounts and refits the SAME target. Answering `cancelled`
 * from that cleanup told an agent its navigation had failed while the camera
 * flew exactly where it asked, and put the phone's sheet back over a canvas
 * still in the air. Publishing nothing leaves the waiters listening, so the
 * remount's own verdict reaches them; a canvas that is gone for good publishes
 * nothing either, and the deadline answers `unanswered` — which is honest in a
 * way a cancellation from a viewport that no longer owns the camera is not.
 *
 * @param target - The semantic destination the jump named.
 * @param verdict - What this canvas is in a position to claim.
 * @param transform - Where the camera got to, as this canvas last saw it.
 */
export function settleJump(
  target: string,
  verdict: SettledJumpVerdict,
  transform: CameraTransform,
): void {
  const listeners = waiters.get(target)
  if (!listeners) return
  waiters.delete(target)
  for (const answer of listeners) answer({ verdict, transform })
}

/**
 * Await one jump: arm, commit, race, detach both losers, answer once.
 *
 * The caller hands over the act that commits the selection rather than
 * performing it, because the verdict is published by the fit that selection
 * triggers and a waiter attached afterwards can miss it entirely. There is no
 * way to obtain a waiter without also handing over the commit, so arming after
 * the selection has committed is not something this interface can express.
 *
 * @param target - The semantic destination, as the canvas publishes it.
 * @param commit - Commits the selection that sets the camera moving.
 */
export function awaitJump(target: string, commit: () => void): Promise<Jump> {
  let answer: ((jump: Jump) => void) | null = null
  const settled = new Promise<Jump>((resolve) => {
    answer = resolve
  })

  const detach = (waiter: Waiter) => {
    const listeners = waiters.get(target)
    listeners?.delete(waiter)
    if (listeners?.size === 0) waiters.delete(target)
  }
  // Both losers of the race are cleaned up. A verdict that arrives first used
  // to leave a live 2 s timer behind and every superseded jump left another,
  // so a reader jumping around the board accumulated them; a deadline that
  // arrives first used to leave a waiter attached to a target for the life of
  // the session.
  const waiter: Waiter = (jump) => {
    clearTimeout(deadline)
    detach(waiter)
    answer?.(jump)
  }
  const listeners = waiters.get(target) ?? new Set<Waiter>()
  listeners.add(waiter)
  waiters.set(target, listeners)

  const deadline = setTimeout(() => {
    detach(waiter)
    answer?.({ verdict: 'unanswered', transform: null })
  }, JUMP_DEADLINE_MS)

  commit()
  return settled
}

/**
 * Await a jump whose commit answers for itself — a cell focus, where the
 * viewport hands its flight result straight back through the call instead of
 * publishing it against a target.
 *
 * Same deadline and the same four words; the shape of the answer is the only
 * difference. The answer rides back with the verdict so a caller can say what
 * a settled result that is no flight at all — a cell the board does not hold —
 * means in its own words.
 *
 * @param commit - Starts the move and resolves with whatever it found.
 * @param verdictOf - Reads that result as one of the settled verdict words.
 */
export function awaitAnsweredJump<TAnswer>(
  commit: () => TAnswer | Promise<TAnswer>,
  verdictOf: (answer: TAnswer) => SettledJumpVerdict,
): Promise<AnsweredJump<TAnswer>> {
  let deadline: ReturnType<typeof setTimeout> | undefined
  const unanswered = new Promise<AnsweredJump<TAnswer>>((resolve) => {
    deadline = setTimeout(
      () => resolve({ verdict: 'unanswered', answer: null }),
      JUMP_DEADLINE_MS,
    )
  })
  const flown = Promise.resolve(commit()).then((answer) => ({
    verdict: verdictOf(answer),
    answer,
  }))
  return Promise.race([flown, unanswered]).finally(() => clearTimeout(deadline))
}
