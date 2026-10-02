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

An install that fails leaves the workspace where it is. The command says so
in one line naming the folder and the command to run again, and exits
non-zero.

The entry function takes one more thing it would otherwise reach for:
`install({ pm, cwd })`, answering with an exit code. The bin leaves it to the
default, which runs `<pm> install` in the workspace with the terminal's own
streams.

The template declares `rolldown`. `scripts/app-module.mjs` and the agent
harness import it by name, and it was only ever installed because Vite depends
on it. npm, Yarn and Bun hoist it to where that import finds it; pnpm does
not, so `npm run check:interface-map` and the harness failed there with
`Cannot find package 'rolldown'`. It is a development dependency now, at the
version the lock file already held.

CI has a `workspace` job, once each for npm, pnpm, Yarn and Bun. It writes a
workspace from the commit under test, lets the initialiser install it with
that manager, and builds it. The script it runs,
`from-working-tree.mjs` beside the initialiser's source, hands the initialiser
a `git archive` of the checkout in place of the release tarball; it is not
published with the package.
