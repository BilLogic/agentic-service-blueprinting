---
'agentic-service-blueprinting': patch
---

**The agent receives its scope in `ctx.scope`, reads default to the active
service, and the slug store is gone.** The dispatcher hands every tool call
the resolved active service as its scope — the same default the interface
has. A read that takes `service` covers that service when the argument is
omitted; naming another service moves the read, and `"all"` spans the
deployment (the single-service collapse to `all` stays, so the shared cast is
shown whole there). The reads with no `service` argument of their own —
`list_slices`, `list_findings`, `list_evidence`, `get_business_model` — are
confined to the scope's service by column. With no service active the scope
is nothing, as it is for the interface: such a call names its scope or is
refused with a sentence that says how, never widened to the deployment on
its own. The argument descriptions, the tool sentences and the canvas
adapter's service row say so, and the words are held to the behaviour by
test. A write that creates under the service lands on the scope's service;
the transitional `ctx.service` is folded into `ctx.scope`.

The requested-slug module store (`contexts/activeServiceStore`) is deleted:
the provider holds the requested slug as its own state, seeded from the boot
path and moved by a switch, and mirrors it into the URL itself. The resolved
store carries the service's name beside its id and slug, for the scope's
sentences. CONTEXT.md defines **Scope**.

**Upgrading a deployment:** a prompt or document of your own that told the
agent an omitted `service` reads every service should say it reads the
active one; a test that built a tool context with `service:` passes
`scope: scopeOf({ id, slug, name })`, `SCOPE_ALL`, or `null` for none. Nothing else changes: a
deployment with one service resolves every scope to the same set, as before.
