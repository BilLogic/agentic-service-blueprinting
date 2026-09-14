---
'agentic-service-blueprinting': patch
---

**An agent tool can now be one definition — name, surface, arguments, where it
may run, and what it does — and the first one is.** `get_cell` is a definition
under `src/lib/agent/tools/definitions/`; its spec is derived from its own zod
schema, it runs through `run(args, ctx)` with everything it touches handed in,
and its two dispatcher cases are gone. Every other tool is where it was.

The shape exists for one reason. Until now the schema a model was shown and the
keys a handler read were two string lists in two files that no compiler
compared, held together by a script that read both by regex — which is how a
tool once advertised one argument name and read another, and told the model the
write had happened. In a definition the handler receives the type the schema
infers, so a key the schema does not declare is a type error, and a call that
does not fit is refused at the seam with a message that names the argument
rather than carrying an `undefined` into a write.

`ctx` carries the client (or `null` in the no-database trial), the service
scope, the session and the canvas bridge. A tool never imports a registry or a
store of its own, so a test builds a context by hand and runs the tool without a
dispatcher, a document or a fake of the PostgREST call chain; `getCell.test.ts`
is the worked example, and `definitions/testContext.ts` is the context a test
starts from.

The dispatcher looks a definition up first and falls back to its switch, so the
switch shrinks one tool at a time. The scripts that count tools from source
(`check:manifest`, `check:read-surface`) read the spec table and the definitions
folder as one through `scripts/tool-sources.mjs`, and the evaluation harness's
bundler learned Vite's `?raw` import, which the definitions' readers reach and
the spec table alone never did.

zod joins the dependencies for tool arguments only.

**Upgrading a deployment:** the roster is what it was, in the order it was. One
schema changes by one word: `get_cell`'s `cell_id` now says `minLength: 1`,
which is the rule the dispatcher already enforced by hand — an empty id was
refused, not looked up — stated where the model can read it. If your tree carries its own
copy of `specs.ts` or `registry.ts`, take the package's — the definitions folder
is new and both files now import from it.
