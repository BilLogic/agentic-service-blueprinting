---
'agentic-service-blueprinting': minor
---

`stakeholders.parent_id` becomes `stakeholders.part_of_id`.

`parent_id` names a shape, and the shape it names is a tree of any depth. The
column is held to exactly one level, so a reader who trusts the name reaches
for a recursive CTE, or nests a third level and is refused by a trigger the
name gave no warning about.

`part_of_id` names the relationship instead. Membership is flat by nature, and
it is the word the column comment and the glossary already used.

Forward-only rather than an amendment: 21000216000000 is released, and a
released migration is somebody else's applied history even when it is one
version old.
