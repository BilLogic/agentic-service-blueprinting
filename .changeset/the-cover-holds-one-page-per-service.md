---
'agentic-service-blueprinting': minor
---

The cover's services tab holds one page per service, and the active service
picks which one renders.

A tab used to be one thing: a `value`, a `label`, and a fixed `sections` list
shown to everyone. That is right for the tabs that describe the method — the
blueprint model, slices, the plugin — and wrong for the one tab that describes
the service itself, because a deployment can hold more than one service and
each of them has its own story to tell on the way in. Pointing every service at
one page makes the cover say something untrue about all but the first of them.

So `CoverTab` splits. `CoverContentTab` is the old shape, unchanged, and it is
what every tab in this repository's own content module still is.
`CoverServicesTab` carries a `CoverServicesIndex` instead of `sections`: a
`pluralLabel` and one `CoverServicePage` per service, each keyed by the route
slug `lib/serviceSlug` derives. `coverTabSections` flattens either kind, so the
walks that want every section a tab can ever render — the figure inventory, the
content contract's own assertions — ask one function and stop caring which kind
they were handed.

The page follows the active service rather than a second piece of tab state.
`CoverPageView` takes the roster and the active slug as props and matches the
page case-insensitively, the way routing resolves a slug, falling back to the
first page. `CoverPage` reads both from `ActiveServiceContext`, so picking a
service on the cover is the same act as picking one anywhere else: it writes
the URL slug, re-scopes the board, and the cover page under the selector
changes with it. There is no cover-local notion of "which service am I
reading about".

WITH ONE SERVICE, NOTHING MOVES. The selector row is rendered only when a
second service exists, the strip label stays the tab's singular `label` rather
than the plural, and the sole page renders below — including when no roster is
handed in at all, which is the shape every existing test and the provider-free
surface already use. A single-service deployment's cover is byte-for-byte what
it was.

The selector is the Skills tab's segmented control: a tab per service on a
recessed track, the active one lifted onto the background, the row labelled
"Services" so a test can tell it apart from the cover's own strip. It never
mounts on the single-service page.

Twelve cases arrive, driven through `CoverPageView` with the roster as props.
They assert the singular tab is untouched, that a second service pluralizes the
label and heads the panel with the selector, that clicking a service reports
its slug, and that the page swaps when the active service does — which is the
one thing a fixed `sections` list could never be asked.

`src/components/cover/CoverPage.tsx` and `coverModel.ts` are not enrolled in
the deployment's reconciled-files list; with this change they and the two new
files match the deployment's copies except where the deployment's prose cited
its own issue numbers and named its own service in a fixture, which is written
neutrally here and has to be rewritten there before any of the four can enrol.
