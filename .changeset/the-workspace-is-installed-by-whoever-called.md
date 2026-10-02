---
'uno-blueprint': minor
---

The workspace is installed by whichever package manager called

`create-uno-blueprint` now finishes the job. Once the workspace is written it
installs the dependencies with the package manager that ran it, read from the
`npm_config_user_agent` each of them sets: `npm create`, `pnpm create`,
`yarn create` and `bun create` install with npm, pnpm, Yarn and Bun. Run any
other way, it is npm. The next steps it prints are that manager's own, and the
install is no longer one of them: `npm run dev`, `pnpm dev`, `yarn dev` or
`bun dev`.

`--no-install` now means what it says. The workspace is written, nothing is
installed, and the install is back in the next steps in the caller's words.

Yarn means Yarn 1. Yarn 2 and later do not run the `pre` scripts that `dev`
and `build` rely on, so under them the workspace is written, nothing is
installed, and the command exits non-zero with one line naming what can run
it: npm, pnpm, Bun and Yarn 1.

An install that fails leaves the workspace where it is. The command says so
in one line naming the folder, the command to run again and why it stopped
(the exit code, the signal that ended it, or that it could not be started),
and exits non-zero.

The entry function takes one more thing it would otherwise reach for:
`install({ pm, command, args, cwd })`, answering with an exit code. One table
holds each manager's command and arguments, and both what is run and what is
printed are read from it. The module also exports `installWith`, the install
when nothing replaces it, and `runInProcess`, which is `run` handed the real
process; the bin is now that one call.

The template declares two packages it already used. `scripts/app-module.mjs`
and the agent harness import `rolldown` by name, and the render walk's own
test resolves `playwright`; each was only ever installed because Vite and
`@playwright/test` depend on them. npm, Yarn and Bun hoist both to where the
import finds them; pnpm does not, so `npm run check:interface-map`, the
harness and that test failed there with `Cannot find package`. Both are
development dependencies now: `rolldown` at the range Vite asks for and
`playwright` at the version `@playwright/test` is pinned to, so the lock file
resolves what it already held.

CI has a `workspace` job, once each for npm, pnpm, Yarn 1 and Bun at pinned
versions. It writes a workspace from the commit under test, lets the
initialiser install it with that manager, and builds it. The script it runs,
`from-working-tree.mjs` beside the initialiser's source, hands the initialiser
a `git archive` of the checkout in place of the release tarball; it is not
published with the package.
