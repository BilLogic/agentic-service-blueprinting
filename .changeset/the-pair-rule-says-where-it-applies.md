---
'agentic-service-blueprinting': patch
---

The pair rule says where it applies, and names the six policies outside it

Two sentences shipped in the last two releases claim slightly more than is
true, and both are in places a reader consults to decide what to write next.

The write-policy convention said the single-permissive spelling "is
deliberately not used here". The rule around it is scoped correctly — it says
*when you put a table on the write surface* — but "here" reads as the whole
schema, and `touchpoints` and `resources` carry six such policies off the
surface. They are reached only through RPCs, they admit exactly a service
account, and they are not holes. Nothing decided they should keep the older
spelling; the pair migrations simply scoped themselves to the surface and
these two are not on it.

So the clause is scoped, and the exception is named rather than left for
whoever greps `_service_only` and finds a shape the paragraph above says is
not used. Whether the pair should extend past the surface stays undecided —
written down as undecided, which is the part that was missing.

The second is smaller: the write surface's own header said the app "inserted
and deleted" `audit_findings`. The scan finds INSERT and UPDATE and no DELETE
anywhere — a finding is closed by its `status`. The list is derived, so
nothing behaved on the wrong claim; it was prose describing the derivation.
