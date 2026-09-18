---
'agentic-service-blueprinting': patch
---

The path memory owns which path a scenario opens on, and there are now tests
that can fail when it does not.

The phone shows one path at a time and remembers, per scenario, which one the
reader was on. The rule — an explicit selection, else the remembered path,
else the scenario's happy path — was composed twice: once inline in the
phone's shell, which read storage, resolved the default and wrote the memory
back for itself, and once through the selection seam that lands `openScenario`
on the same answer for the desktop. Two copies of a two-step rule is how one
surface comes to open a scenario on a different path from the other while each
looks correct on its own.

The rule now lives in the module that owns the storage it reads, and the
module is named for what it does rather than for the first surface to need it:
`pathMemory.ts`, since both the phone and the desktop resolve through it. Its
interface is two resolutions and one write — `resolvePathIdToOpen`,
`resolvePathIdToShow`, `writeLastViewedPath` — named as the precedence pair
they are, so a caller cannot read one as "the remembered path" and add a
fallback of its own, which is exactly the composed rule this removes. The read
and the pure default rule stop being exported. The selection seam's
same-shaped wrapper around the module is gone too; its caller imports the
module. Behaviour is unchanged for a reader: the phone opens on the same path
it opened on before, and the stored key is untouched, so nobody's remembered
path is forgotten by the upgrade.

The coverage landed before the move and is the reason the move is safe. Three
cases drive the real shell at phone width by taps — a remembered path opens on
itself, a remembered path that has since been deleted falls back rather than
leaving the reader on a board with no path, and a choice survives as memory —
and each asserts both the reported reading line and the label the selector
shows, because the selector alone falls back to the first path and could not
fail for the deleted case. The module's own cases reach through storage rather
than around it, on a fixture that lists the variant path first: with the happy
path first, "opens on its happy path" also passes for a resolve that returns
whichever path is first, which is a guard that cannot fail for the reason it
claims. Every case was watched red against a deliberate break — including the
happy-path default swapped for the first path in the list, which the
variant-first fixture is there to catch.

The agent wiring in the shell is deliberately left where it is: it is already
three small modules with unit tests of their own, so pulling it out would move
code without concentrating anything.
