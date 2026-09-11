---
'agentic-service-blueprinting': patch
---

A section label and an eyebrow each have one spelling.

Two label primitives existed and both were being bypassed. A dependency group inlined its own capitalised label while every other panel section used `PanelSectionLabel`, so the cell panel showed two kinds of section heading at once. And the small capitalised label over a region of chrome — the eyebrow — had been written by hand in twenty-odd places at two different letterspacings, which is invisible in review because every utility in those strings is legal on its own.

Panel sections are sentence case; eyebrows are `Eyebrow`, one spelling in one file. The open question of whether an eyebrow should be monospace, as this type register's third face suggests, is now a single line in that file rather than a decision the tree answers twenty times. A test refuses a hand-spelled eyebrow in any authored component.
