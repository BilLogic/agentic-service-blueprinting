import { z } from 'zod'

/**
 * The validation library's compiled-parser probe, turned off before it runs.
 *
 * zod builds a faster parser for object schemas by GENERATING one and handing
 * the source to the `Function` constructor. It only does that where the
 * constructor works, and it finds out the only way a feature detection can —
 * by attempting it, inside a `try`. `public/_headers` in this repository
 * serves `default-src 'self'` with no `script-src`, so the attempt is refused,
 * the throw is caught, and zod falls back to its runtime parser exactly as it
 * was designed to. Nothing is broken; validation has always been correct.
 *
 * What the attempt leaves behind is a report. A refused `eval` is a
 * `securitypolicyviolation` and a console error whether or not anybody catches
 * the error, so every load of every build carried one refusal that meant
 * nothing — sitting in the console ahead of whatever a deployment owner had
 * actually opened it to read.
 *
 * `jitless` is zod's own switch for this, and setting it costs NOTHING here.
 * It does not choose a slower parser: under this policy the probe was always
 * going to fail and the runtime parser was always going to run. All it changes
 * is that zod stops asking a question whose answer is already settled, in the
 * one kind of environment where the asking is itself the reported event. The
 * alternatives are the trade this repository will not make — `'unsafe-eval'`
 * in `script-src` buys the silence with the protection the policy exists for,
 * and suppressing the report hides a signal we rely on. That the policy stays
 * strict, and that this flag is what makes staying strict free, is a recorded
 * decision with those two alternatives written down as rejected — for the next
 * reader who proposes loosening the script policy for some other reason.
 *
 * ── WHY THIS IS A MODULE AND WHY `App` IMPORTS IT FIRST ────────────────────
 *
 * zod reads the flag when an object schema is CONSTRUCTED, and it memoises the
 * answer on first read. Every agent tool declares its arguments at module
 * scope, so the first schema is built while the import graph evaluates — long
 * before React renders. A statement in an entry file would therefore be too
 * late in one consumer and absent in the other: `src/main.tsx` is this
 * template's own entry, but a deployment mounts the package and owns a
 * `main.tsx` this repository never sees.
 *
 * So this is a module-scope effect, the same idiom `theme.ts` uses and for the
 * same reason — both consumers reach it through `App`'s import graph, and an
 * import graph finishes evaluating before anything renders. Unlike the theme,
 * though, this one is ORDERED: it has to evaluate before the first schema, so
 * it is the FIRST import in `App.tsx` rather than one among many. ES modules
 * evaluate depth-first in source order, which is what makes first mean first.
 * `validationJit.test.ts` holds that position, because a tidying pass that
 * sorted the import block would move it and nothing would fail.
 */
z.config({ jitless: true })
