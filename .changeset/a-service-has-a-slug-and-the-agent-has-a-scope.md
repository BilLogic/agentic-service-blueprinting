---
'agentic-service-blueprinting': minor
---

A service has a slug, and the agent has a scope module to read by it.

ADR 3 says a deployment may hold more than one service: the journey is a hard
per-service boundary, the catalog is the deployment's. The schema had the
boundary and nothing to name a side of it — no way for a URL, or an agent read,
to say *which* service. Two halves land here, and the read tools that will use
them do not.

**`services.slug`** (`21000130000000_a_service_has_a_slug`). A short, stable,
URL-safe identity of its own, `unique (slug)` across the deployment. Derived
from the name at read time would need no column and is the version worth
arguing against: it moves a service's URL every time somebody edits the name,
and it has nothing to say when two names slugify alike. The column fixes both.
It lands nullable, is backfilled through `public.key_slug` — the database's own
slugifier, the one `src/lib/serviceSlug.ts` documents itself as mirroring — and
takes the unique constraint only once it is populated. It STAYS nullable: the
reader keeps a name-derived fallback for a null, which is only meaningful if
null is reachable. No `grant update (slug)`, because nothing writes it yet; the
edit panel adds the grant and the policy together, the way the examples panel
did in `21000123000000` / `21000128000000`.

**The scope module.** `serviceSlug.ts` reads the column with that fallback,
`contexts/activeServiceStore.ts` (over `lib/serviceRoute.ts`) holds which slug
the app is looking at as a module-level fact — non-React fetchers resolve the
active service, which is the condition that rules context out — and
`lib/service.ts` gains `findActiveServiceId`, one shared lookup per slug.
`agent/tools/serviceScope.ts` is what a read will take: a `ServiceScope` that
is `all` or one named service, resolved from the tool's `service` argument and
the creator's default. A deployment with one service always resolves to `all`,
so single-service behaviour is byte-for-byte the unscoped read it is today and
none of the machinery runs. `serviceStakeholderIds` derives a service's cast by
walking phases → scenarios → paths → `lanes.stakeholder_id`, which is ADR 3's
implicit membership as a join — there is no `stakeholders.service_id` to filter
on, and the test asserts the catalog table is never queried.

**The creator's default is a setting.** `AgentSettings` gains
`serviceScope: 'active' | 'all'`, and `AgentScopeField` puts it beside the
provider and model rows. `active` keeps every answer inside the service on
screen so a large deployment does not search all of them on every question; a
per-call `service` filter overrides either way.

**The read tools are deliberately untouched.** Rewriting their bodies to take a
scope is the next step, and it wants a blueprint search that does not exist here
yet; this changeset delivers the module and its tests so that step has something
to build on. `touchpoints.service_id`, `touchpoints.stakeholder_id` and the
registry hook are out of scope too — the first is an owner call about whether
this template's per-service registry becomes the deployment-wide catalog ADR 3
gives stakeholders.

A schema column is a contract addition, so this is a minor. No identifier in
`identifiers.json` moves and no path in `check-reference-paths.mjs` does.
