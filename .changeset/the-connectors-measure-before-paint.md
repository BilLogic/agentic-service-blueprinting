---
'agentic-service-blueprinting': patch
---

The integrated overlay's connectors are measured before the browser paints
rather than after it. Every input the sweep reads — cell boxes, the band's
extent — is laid out by the same commit that scheduled it, so measuring in an
ordinary effect drew one frame of arrows against the previous layout. A compare
toggle is where that showed: the grid swaps to a different column set and the
overlay spent a frame anchored to the old one.
