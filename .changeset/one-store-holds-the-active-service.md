---
'agentic-service-blueprinting': patch
---

**One store holds the resolved active service, and the scoped reads take it
explicitly.** `contexts/activeService` holds the active service as its id and
slug together — get, set, subscribe, and two hooks over it. The provider is
its only writer: it reads the roster once, matches the URL's slug (or takes
the first service at the bare root), writes the answer to the store and the
service's own slug back to the URL. With no database the bundled sample's
service is active. A switch writes the slug and the resolved service in one
step and invalidates nothing: the reads are keyed by the service's id, so the
new service's reads are new keys and the old service's stay warm.

`useServicePhases`, `useSlices`, `useServiceSpec` and
`useServiceEntityExamples` take a `serviceId` parameter and resolve nothing
themselves; given `null` they build no key and fetch nothing — never the
first service, never every service's rows narrowed client-side. Their callers
hand them `useActiveServiceId()`. The `first` key placeholder is gone; the
service-spec key is `service-spec:<id>` (`:private` for the privileged read).
The editor's `slidesLoading` counts the roster's resolution as in flight, so a
service that never resolves — an empty database, a slug no service carries —
is a workspace with nothing in it, not a spinner.

Tests set the store and assert what the hooks read; a provider test covers a
boot slug, the bare root, a slug no service carries, a switch between two
services, and the no-database sample. The requested-slug store and the
slug-to-id cache in `lib/service.ts` remain for the components and agent
tools that still resolve for themselves; the next two tickets move them to
the store and delete both.

**Upgrading a deployment:** a call to one of the four hooks with no argument
becomes `useX(useActiveServiceId())`; a pinned id is passed as before. A key
built as `queryKeys.serviceSpec.of(privateRead)` becomes
`of(serviceId, privateRead)`.
