---
'uno-blueprint': patch
---

The template can say its own name

The template is called Uno Blueprint, and the naming guard used to fail on the
word `uno` wherever it appeared, so the template could not name itself.
`check:standalone` now reads the deployment's slug, its owner's name and its
bot, and nothing else: `uno`, `Uno Blueprint` and `ub:map` pass, while the
deployment's names still fail. The bot's pattern is bounded at both ends so it
cannot catch the template's name or the English words that begin with the same
three letters. The cover-content test imports the guard's patterns rather than
keeping a copy of them.

The glossary gains the naming rule: the Template is called Uno Blueprint, and a
Deployment is named for its owner.
