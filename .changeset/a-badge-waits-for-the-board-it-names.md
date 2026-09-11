---
'agentic-service-blueprinting': patch
---

A presentation cell badge lands on its cell when the slice tab was not open.

The pending focus was spent the moment the slice viewport registered, while
its board was still behind the loading skeleton, so the flight missed and the
tab opened at its default framing. A miss before the board settles now keeps
the request, and the viewport lands it once its first fit completes. A miss
after that is final.
