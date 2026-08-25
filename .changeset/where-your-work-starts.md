---
'agentic-service-blueprinting': minor
---

**"Did the migration run" is answerable.** `npm run check:target` asks the live
database for `public.schema_version` over the same Data API and anon key the app
uses, and distinguishes *never migrated* from *stale* from *fine*. It matters
more here than elsewhere: without a configured project the app serves its no-DB
fallback and renders perfectly, so a misconfigured target looks exactly like a
working one. Not in CI — CI has no target, and a check that needs a live
database is a check that gets skipped and then trusted.

**A desync runbook** for forks whose migration history diverged before the
reserved band existed: read both histories, apply pending files out of order
with `db push --include-all` (safe, because no upstream migration depends on
anything a fork built), repair `supabase_migrations.schema_migrations` per
version when they genuinely disagree, and `db pull` as the last resort. Inside
the band it cannot recur.

**The boundary, stated as a boundary** rather than a list of apologies, beside
README's "Bring your own backend": no auth beyond the anon/authenticated split,
no multi-tenancy, no backup or restore, no migration ops beyond the shipped
chain — and the one operational failure the package does own, with the runbook
attached.

**The seed's role is on the record**: `supabase/seed.sql` is the META-BLUEPRINT,
the service blueprint of this template itself, and one generator emits it and
the no-DB fallback module from the same source. That is why "no database" is a
supported mode and not a degraded one.
