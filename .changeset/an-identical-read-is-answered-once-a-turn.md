---
"agentic-service-blueprinting": patch
---

The canvas agent answers an identical read once a turn. A model that loops used to re-run the same board read round after round, and each repeat pushed another copy of the same payload into the conversation, crowding out the rounds that were left. The repeat now comes back as a pointer to the answer already in the conversation, and every suppressed call stays in the transcript so the loop is visible. Anything that changes state — a write, or a move of the canvas — clears the record, so the re-read a write asks for still runs.
