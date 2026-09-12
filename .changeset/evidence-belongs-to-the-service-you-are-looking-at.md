---
'agentic-service-blueprinting': patch
---

A source added from a cell now belongs to the service the author is looking at. The evidence panel resolved its service with `resolveFirstServiceId` — the first row by `created_at`, whatever the URL said — while every other read on the same board moved to `findActiveServiceId` long ago. With two services and a slug naming the second, the panel drew the second service and wrote the evidence against the first.

**A deployment with two or more services may already have evidence attached to the wrong one.** Nothing in the UI revealed it: the row simply does not appear under the service it was written for, and it does appear under the oldest one. A deployment with a single service is unaffected — first and active are the same row there, which is why this survived. Evidence is authored content, so anyone running more than one service on this deployment may want to check `evidence.service_id` against the cells the rows cite before adding more.

This is the same defect `useServiceSpec` carries a comment about, fixed there once already: the header described one service while the canvas drew another.

The write-path resolver moved to where the reads live. `resolveActiveServiceId` was in `lib/agent/tools/serviceScope.ts`, reached only by the agent registry, and a UI component has no business importing from the agent's tool folder to ask which service is on screen; it now sits beside `findActiveServiceId` in `lib/service.ts` and both the panel and the registry call it there.

`resolveFirstServiceId` is retired rather than left in the tree. Its last caller was that resolver's own fallback, and the fallback was the bug in miniature: when a slug named no service, the write went to the first one. A board drawing nothing must not quietly file the author's work against a service they are not looking at, so the two causes of "no active service" now get the two sentences they deserve — `No service matches "<slug>" in the database` when the URL names one that does not exist, and `No service exists in the database` when the database is empty. `findFirstServiceId`, which answers the bare root and is not a write path, is untouched.

**Upgrading a deployment:** nothing to do. Single-service deployments see no behaviour change at all. On a multi-service deployment, new evidence lands on the service in the URL; evidence written before this release may need moving by hand.
