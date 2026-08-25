# Changesets

A changeset is a note saying what changed and how big it was. Add one in the
same pull request as the change:

```bash
npx changeset
```

`npx changeset version` then consumes every pending note, bumps
`package.json`, and writes the CHANGELOG entry. Run `npm run version` instead
of calling it directly — that also copies the new number into
`.claude-plugin/plugin.json`, which is the version a consumer's plugin install
actually reads.

**Semver here is scoped to the plugin contract**, the identifier layer in
`identifiers.json`: skill names, reference filenames, schema filenames, agent
names, hook events, agent tool names. A rename there is a major. Refactoring
the template app is not, however much of it moves — a consumer forks that
surface and takes our changes as a visible merge conflict.
