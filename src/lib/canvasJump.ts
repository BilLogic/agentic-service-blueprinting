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

/**
 * What a self-answering jump hands back: the commit's own result, and the
 * verdict read off it.
 *
 * A union rather than one shape with two nullable fields, so the nonsense
 * combinations cannot be written down. `{ verdict: 'landed', answer: null }`
 * used to typecheck — a landing with nothing that landed — and so did an
 * `unanswered` carrying an answer, which is silence that spoke. With the arms
 * split, a reader who wants the answer has to ask the verdict whether there
 * is one, instead of testing the answer for `null` and inferring silence
 * privately. That private inference is what this handshake was cut to delete:
 * `null` meant "nobody answered" only for as long as no commit's own result
 * could itself be null, which is a fact about somebody else's return type
 * rather than anything this module guarantees.
 *
 * `verdict: null` is the case that never became a flight at all — a cell the
 * board does not hold. Something answered, so the answer is here to read;
 * there is no flight for the canvas to have settled, so there is no verdict,
 * and it borrows none. It used to borrow `cancelled`, which reported a flight
 * taken back from something that never left the ground.
 */
export type AnsweredJump<TAnswer> =
  | { verdict: SettledJumpVerdict | null; answer: TAnswer }
  | { verdict: 'unanswered' }

/**
 * How long a jump is awaited before the silence is called `unanswered`.
 *
 * ONE number for the CAMERA, and the measurement is its justification rather
 * than a feel for it. Driven through the agent's scenario open against a live
 * bridge on a 390×844 viewport, read from the publisher itself: the verdict
 * arrives at a median of 366 ms and a maximum of 422 ms, which is the 200 ms
 * fade plus the canvas remount plus the fit — the flight itself is
 * effectively free. At a 4× CPU throttle the maximum is 1332 ms. This clears
 * the median by about 5.5× and still holds under that throttle; the first
 * real failure appears around a 5–6× slowdown.
 *
 * It replaces three hand-tuned camera numbers — 1800 ms for the agent's
 * navigation tools, 1500 ms for cell focus, 2000 ms for the phone's caret
 * hand-back — whose only relationship was that the phone's had to outlast the
 * tool's or the caret came back before the tool had answered. Nothing varies
 * across those three sites: cell focus has no remount to wait for, and the
 * tool's 1800 ms was never tight either. So there is no override parameter to
 * pass. A caller that genuinely differs can introduce one, with its
 * measurement.
 *
 * It is the camera's deadline and NOTHING ELSE'S. A wait on some other thing
 * — the shell's reported selection, say — keeps its own named number, because
 * a measurement of the fade plus the remount plus the fit justifies nothing
 * about how long a different question takes to answer, and a sentence a model
 * reads would shift by the difference for no reason anybody measured.
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

type Waiter = (verdict: JumpVerdict) => void

const waiters = new Map<string, Set<Waiter>>()

/**
 * The canvas's half: answer every jump waiting on this target, once.
 *
 * Letting go of a flight is the deliberate ABSENCE of this call, and that
 * absence is load-bearing: the waiters stay listening, so the mount that
 * takes the camera over answers them. `relinquishCameraNavigation` in the
 * viewport is where that is done and why, and the decision record for this
 * handshake holds the full reasoning — it lived in four copies, and a
 * correction to any one of them left the other three wrong.
 *
 * @param target - The semantic destination the jump named.
 * @param verdict - What this canvas is in a position to claim.
 */
export function settleJump(target: string, verdict: SettledJumpVerdict): void {
  const listeners = waiters.get(target)
  if (!listeners) return
  waiters.delete(target)
  for (const answer of listeners) answer(verdict)
}

/**
 * Await one jump the CANVAS publishes against a target: arm, commit, race,
 * detach both losers, answer once.
 *
 * The published half of the handshake. It is the entry point whenever the
 * answer arrives through {@link settleJump} rather than through the call
 * itself, which is also why more than one listener can be waiting on the same
 * destination — the phone's sheet and a navigation tool both await the same
 * scenario and one verdict answers both. Its sibling
 * {@link awaitSelfAnsweringJump} is for a commit that hands its own result
 * back and names no target.
 *
 * The caller hands over the act that commits the selection rather than
 * performing it, because the verdict is published by the fit that selection
 * triggers and a waiter attached afterwards can miss it entirely. There is no
 * way to obtain a waiter without also handing over the commit, so arming
 * after the selection has committed is not something either entry point can
 * express.
 *
 * @param target - The semantic destination, as the canvas publishes it.
 * @param commit - Commits the selection that sets the camera moving.
 */
export function awaitPublishedJump(
  target: string,
  commit: () => void,
): Promise<JumpVerdict> {
  let answer: ((verdict: JumpVerdict) => void) | null = null
  const settled = new Promise<JumpVerdict>((resolve) => {
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
  const waiter: Waiter = (verdict) => {
    clearTimeout(deadline)
    detach(waiter)
    answer?.(verdict)
  }
  const listeners = waiters.get(target) ?? new Set<Waiter>()
  listeners.add(waiter)
  waiters.set(target, listeners)

  const deadline = setTimeout(() => {
    detach(waiter)
    answer?.('unanswered')
  }, JUMP_DEADLINE_MS)

  commit()
  return settled
}

/**
 * Await a jump whose commit answers for ITSELF — a cell focus, where the
 * viewport hands its flight result straight back through the call instead of
 * publishing it against a target.
 *
 * The self-answering half of the handshake: no waiter map, no target, and
 * nobody else can be listening, because the only route to this answer is the
 * call that started it. Same deadline and the same four words as
 * {@link awaitPublishedJump}, and the same mistake made unsayable — the
 * commit is handed over here too, so there is no arming step to get the wrong
 * side of. The shape of the answer is the only difference: the commit's own
 * result rides back with the verdict, so a caller can say what a result that
 * is no flight at all — a cell the board does not hold — means in its own
 * words.
 *
 * @param commit - Starts the move and resolves with whatever it found.
 * @param verdictOf - Reads that result as a settled verdict, or as `null`
 *   when the result is no flight at all and there is nothing to settle.
 */
export function awaitSelfAnsweringJump<TAnswer>(
  commit: () => TAnswer | Promise<TAnswer>,
  verdictOf: (answer: TAnswer) => SettledJumpVerdict | null,
): Promise<AnsweredJump<TAnswer>> {
  let deadline: ReturnType<typeof setTimeout> | undefined
  const unanswered = new Promise<AnsweredJump<TAnswer>>((resolve) => {
    deadline = setTimeout(
      () => resolve({ verdict: 'unanswered' }),
      JUMP_DEADLINE_MS,
    )
  })
  const flown = Promise.resolve(commit()).then((answer) => ({
    verdict: verdictOf(answer),
    answer,
  }))
  return Promise.race([flown, unanswered]).finally(() => clearTimeout(deadline))
}
