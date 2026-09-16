---
"agentic-service-blueprinting": patch
---

The render walk waits for the shell to draw before deciding whether the cover is up. It used to ask at once, and on a slower first paint it saw no cover, skipped the dismissal, and then every sidebar click landed on the cover that had appeared behind the question.
