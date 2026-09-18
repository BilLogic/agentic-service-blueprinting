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

The rule now lives in the module that owns the storage it reads. That module's
interface is two resolutions and one write: what a scenario opens on, what a
surface shows, and the reader's choice remembered. The read and the pure
default rule stop being exported — a caller that has to fetch a stored value
before it can ask a question is a caller that can fetch the wrong one, and no
test on either side would notice. The shell asks and reports what it is told;
it keeps no memory of its own. Behaviour is unchanged for a reader: the phone
opens on the same path it opened on before.

The coverage landed before the move and is the reason the move is safe. Four
cases drive the real shell at phone width by taps — a remembered path opens on
itself, an absent memory opens on the happy path, a remembered path that has
since been deleted falls back rather than leaving the reader on a board with
no path, and a choice survives as memory — and each asserts both the reported
reading line and the label the selector shows, because the selector alone
falls back to the first path and could not fail for the deleted case. The
module's own cases reach through storage rather than around it, and cover the
two answers a phone is awkward to drive into: a scenario with no paths at all,
and storage left unreadable. Every one of them was watched red against a
deliberate break before any of this landed.

The agent wiring in the shell is deliberately left where it is: it is already
three small modules with unit tests of their own, so pulling it out would move
code without concentrating anything.
