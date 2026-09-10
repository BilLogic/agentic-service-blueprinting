---
'agentic-service-blueprinting': minor
---

Twenty contracts a deployment wrote against this code arrive here

A deployment held 43 test files this repository did not, every one of them
written against behaviour that lives here. They were about to be counted as a
cost of consolidating — tests that would be deleted when the deployment stops
keeping its own copy of the application. They are not a cost; they are
coverage this repository never received.

All 43 were classified by whether every module they import exists here. 38
did. Those 38 were run against this tree as they stood: **22 passed
untouched**. Two more were dropped for a type this repository's `BlueprintCell`
does not carry, leaving twenty.

The other sixteen failed, and that is the useful half of the result. A
contract written against shared code that fails here is a measurement of real
divergence between the two trees, named file by file, and it belongs to the
convergence work rather than to this changeset.

Six of the twenty named a deployment — a fixture called `PLUS App`, a slug,
a comment naming the bot that builds a link. Those are neutralised, which is
what the standalone guard is for, and one comment misused `lane` where it
meant a boot signal.

1782 tests to 1996.
