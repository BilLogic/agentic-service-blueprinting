---
'uno-blueprint': major
---

The package is `uno-blueprint`

The repository is `BilLogic/uno-blueprint` and the package it publishes is
named `uno-blueprint`. The plugin manifest's homepage and repository, the
cover page's repository link, the schema `$id`s, the bundled sample's source
links and every document point at the new URL. The naming guard fails on the
former repository slug wherever a commit carries it.

The seed generator's UUID namespace is a fixed constant, so every id a seed
mints is the same as before and a re-seed keys onto the rows already there.

A deployment pins the template as `github:BilLogic/uno-blueprint#v<version>`
under the dependency name `uno-blueprint`, and installs that explicit spec so
the lockfile moves to the new tag. Everything it reads out of the package
follows the name: imports such as `uno-blueprint/styles.css`,
`uno-blueprint/bootstrap`, `uno-blueprint/overlay` and
`uno-blueprint/vite-imports`, the `node_modules/uno-blueprint/src` paths in its
`tsconfig.json` and `vite.config.ts`, and any script it runs from
`node_modules/uno-blueprint/`.

The local Supabase `project_id` is `uno-blueprint`. Changing a local project id
resets the local Docker volumes, so the first `supabase start` after upgrading
begins from an empty local database; run `supabase db reset` to reseed it.
