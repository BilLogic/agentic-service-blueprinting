---
"agentic-service-blueprinting": patch
---

The canvas agent answers an identical read once a turn. A model that loops used to re-run the same board read round after round, and each repeat pushed another copy of the same payload into the conversation, crowding out the rounds that were left. The repeat now comes back as a pointer to the answer already in the conversation, naming the call and its arguments, and every suppressed call stays in the transcript so the loop is visible. A write clears the record, because a write can change anything a read described; moving the canvas clears only what the canvas reports, so pointing at a cell never costs the agent its place.
