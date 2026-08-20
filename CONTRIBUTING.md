# Contributing

Thanks for looking. Everything lands through a pull request — `main` is
protected, so that applies to maintainers too.

## The short version

1. Fork, branch, and open a PR against `main`.
2. CI has to pass: typecheck, lint, tests, build, and the blueprint
   round-trip suite.
3. A code-owner review is required before merge.

## Running it

```bash
npm install
npm run dev        # no database needed — renders the bundled sample
```

The gates, which are the same ones CI runs:

```bash
npm run typecheck  # tsc -b — see the note below
npm run lint
npm test
npm run build
bash scripts/tests/run_tests.sh
```

**On `typecheck`:** use `npm run typecheck`, not `npx tsc --noEmit`.
`tsconfig.json` uses `files: []` with project references, so a bare
`tsc --noEmit` typechecks nothing and exits 0. `tsc -b` is the real gate.

## What makes a change easy to accept

- **One concern per PR.** A rendering fix and a schema change in the same
  branch take twice as long to review as two branches would.
- **Say why in the commit message, not just what.** The diff already
  says what.
- **Keep the template org-agnostic.** This repo is generalized from an
  in-house deployment; anything that names a specific company, product,
  or scenario id belongs in your fork, not here.
- **If you change rendering, say what you looked at.** Screenshots or the
  measured before/after — "looks right" is not checkable by a reviewer.
- **If you touch the blueprint pipeline, the round-trip suite is the
  proof.** `bash scripts/tests/run_tests.sh`.

## Security

Don't open a public issue for a vulnerability — see [SECURITY.md](./SECURITY.md).
