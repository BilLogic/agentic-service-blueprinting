/**
 * The scripts that measure THIS REPOSITORY, and the scripts that measure the
 * APPLICATION — and how a walk tells which one it is in.
 *
 * A deployment installs this repository as a package and reads the application
 * out of `node_modules/agentic-service-blueprinting/src`, with no `src` of its
 * own. A check that finds its subject by writing `src/…` either crashes there
 * or, worse, sweeps an empty set and reports success — and goes on reporting it
 * every run after, because a check that has stopped looking prints the same
 * green line as one that looked and found nothing.
 *
 * So a script that measures the application resolves through
 * `app-source.mjs`. A script that measures this repository does not, and this
 * is where it says so — once, with the reason, so that the next sweep does not
 * re-litigate the same handful of files. `scripts/tests/every-sweep-knows-what-it-measures.test.mjs`
 * holds the two halves apart: a script that names an application path and is
 * neither on this list nor resolving through `app-source.mjs` is a new instance
 * of the defect, and the guard says so at the moment it is written.
 *
 * WHAT MAKES A SCRIPT REPOSITORY-ONLY. Not "it happens to live here" — that is
 * true of all of them. It is that the QUESTION it asks is about this tree:
 *
 *   - it WRITES into this repository's own application (a generator, a
 *     vendoring sync). A deployment has nothing to write into, and would be
 *     writing into its dependency if it did.
 *   - it asks what THIS COMMIT would carry (`git ls-files`). A deployment's
 *     commit is the deployment's, and the question — does this tree carry a
 *     particular deployment's identity or content — is one only the template
 *     can ask of itself.
 *
 * Being on this list is not an exemption from the second half of the rule. A
 * repository-only sweep still refuses an empty subject; what it does not do is
 * go looking in `node_modules` for it.
 */

/**
 * @type {ReadonlyArray<{ script: string, why: string }>}
 */
export const REPOSITORY_ONLY = [
  {
    script: 'scripts/generate_sample_blueprint.mjs',
    why:
      'it WRITES src/data/sampleBlueprint.ts and the seed beside it. The ' +
      'sample board is this repository’s own content, generated into its own ' +
      'application; a deployment brings its own board and would be editing ' +
      'its dependency.',
  },
  {
    script: 'scripts/generate_fallbacks.py',
    why:
      'it WRITES src/data/generatedBlueprints.ts, src/data/blueprintFallbacks.ts ' +
      'and src/data/sampleNav.ts. Same reason as the sample generator: the ' +
      'offline board is authored here, into this tree’s application.',
  },
  {
    script: 'scripts/sync-canvas-skills.mjs',
    why:
      'it VENDORS references/ and skills/ into src/lib/agent/skill/, holding ' +
      'the two byte-identical. Both sides are this repository’s — the source ' +
      'of the copy is this tree’s plugin surface, so the destination is this ' +
      'tree’s application and no other.',
  },
  {
    script: 'scripts/check-standalone.mjs',
    why:
      'its subject is `git ls-files` — what THIS commit would carry — and its ' +
      'question is whether a deployment’s name survived into the template. A ' +
      'deployment running it would be asked whether its own files name it, ' +
      'which they are entitled to.',
  },
  {
    script: 'scripts/check-content-coupling.mjs',
    why:
      'the same subject and the same reason as the standalone sweep: `git ' +
      'ls-files` over this commit, asking whether a deployment’s CONTENT — ' +
      'its ids, its cast, its vocabulary — survived into the template.',
  },
]

/** Just the paths. */
export const REPOSITORY_ONLY_SCRIPTS = REPOSITORY_ONLY.map((entry) => entry.script)
