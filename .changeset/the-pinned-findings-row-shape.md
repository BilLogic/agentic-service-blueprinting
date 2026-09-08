---
'agentic-service-blueprinting': patch
---

The findings-row shape in `agents/auditor.md` names the columns it writes to.

It said `check_name` and `note` while claiming to be "the same shape
`audit_tools.py --help` documents", two renames after `21000116000000` made
those `check_key` and `summary`. An auditor following the document to the
letter produced a row `audit_tools.py` raises `KeyError: 'check_key'` on.

`findingFingerprint`'s parameter and the findings row in
`references/data-model.md` carried the same two retired words.

Shipped in #289 without a changeset; recorded here.
