---
'agentic-service-blueprinting': patch
---

`addLane` takes `atPosition`, and the cover drops one docs address

The lane insert's TypeScript argument was `atRow` while the SQL parameter it
maps to is `at_position`, and rows are not what it positions — a lane is one
row per version, and the number is its place in the lane order. Three call
sites, no behaviour.

`CoverPage`'s docblock also cited a plan section for a decision the same
sentence already explains, which is an address in one repository's docs tree
and resolves to nothing in another's.
