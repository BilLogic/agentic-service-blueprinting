---
'agentic-service-blueprinting': minor
---

The developer portal leaves shared source.

The tier simulator — the two controls that let someone building on the kit see
the Admin and the Regular surfaces without provisioning two accounts — was
never application code. It was authoring convenience for people working ON the
kit, and it sat in `src/`, the tree every deployment either copies or mounts
whole. No deployment has ever shipped a byte of it; each one only paid to
carry it, and its two mount points were the reason
`components/editor/EditorChrome.tsx` could never be held byte-identical across
the kit and its deployments.

**Where it went.** `dev/`, outside the application source, beside the kit's
other tooling. Nothing in `src/` imports it or knows it exists.

**How it mounts.** `App` takes a `sessionOverlay` — one component, absent by
default, mounted directly under `SupabaseProvider` and above everything that
reads it. It is the one seam an entry may open in the middle of the tree, and
it exists because tooling that shadows what the tree believes about the
session has to sit UNDER the database client, where no prop from outside can
reach. The kit's own `src/main.tsx` fills it behind `import.meta.env.DEV`; a
deployment passes nothing and pays a `Fragment`.

**What the shared provider stopped doing.** `SupabaseProvider` computes one
honest `canWrite` and stops there — `realCanWrite` and `devSimulation` are
gone from its value, because the simulation is no longer something the
application knows about. The overlay is where the lie is applied, and it
rewrites `canWrite` and `canAgentWrite` and passes every other field through
by identity.

**Both guarantees are unchanged, and still stated.** The gate is still
`import.meta.env.DEV` at the seam, where a test can put the production answer
in front of it; the directory is a second, coarser guard in front of that one,
not a replacement for it. And the simulation still cannot reach the server:
row-level security and the RPC grants never consult it, so simulating admin on
an account with no rights shows the editing UI and every save fails with the
database's own error.

**Where the portal now appears.** A strip of kit chrome over the bottom-left
corner, instead of a section inside the app's settings popover — the same two
controls, the same caveats behind the same ⓘ, hanging off the kit's chrome
rather than the app's.
