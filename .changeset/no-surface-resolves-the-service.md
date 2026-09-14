---
'agentic-service-blueprinting': patch
---

**No component or tool resolves the active service; the shell does, once.**
The four write surfaces that still resolved the URL's slug for themselves —
the evidence tab, the create-slice sheet, the sidebar's `+` phase and the row
menu's sibling phase — read the resolved store's id (`useActiveServiceId`)
and refuse, in their own error line, when none is active. The agent's
dispatcher hands each tool call the resolved service as `ctx.service`, read
from the same store, and the four write tools that create under the service
(`create_phase`, `create_evidence`, `create_slice`, `create_finding`) take it
through `requireActiveService(ctx)` — no tool resolves a slug. The
slug-to-id resolver module (`lib/service.ts`) has no caller left and is
deleted with its tests.

The per-site wrong-service regression tests collapse into one surface test:
with the store set to one service every write names it; switch the store
mid-session and the next write from the same mounted surface names the
other; with none active, a surface refuses rather than falling back. A step
belongs to a path and takes no service id, so no step write is asserted.

**Upgrading a deployment:** a surface of your own that imported
`resolveActiveServiceId` or `findActiveServiceId` from `@/lib/service` reads
`useActiveServiceId()` from `@/contexts/activeService` instead, and treats
`null` as "no service is active". A tool of your own that created under the
service takes `requireActiveService(ctx)`; a test that mocked `@/lib/service`
passes `service` on `fakeToolContext` instead (its default is `svc-1`).
