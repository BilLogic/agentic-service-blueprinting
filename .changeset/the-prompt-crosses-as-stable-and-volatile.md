---
'agentic-service-blueprinting': patch
---

The system prompt crosses to a provider as its stable part and its volatile
part, so the prompt is built once per call instead of twice.

The provider input used to carry the prompt as one string plus a character
index saying where its stable prefix ended — one provider's caching concept,
spelled as arithmetic, in the interface every provider shares. Only the
Anthropic adapter read the index, and it read it to cut the string back into
the two pieces the loop had just joined. The loop learned the number by
assembling the entire prompt a second time with an empty live context: once
per send, and again on the round-budget closing call. Every skill body a
message carried was rendered twice to measure something the assembly already
knew.

The input now carries `systemStable` and `systemVolatile`. The adapter that
caches puts its breakpoint between them and slices nothing; the two that do
not concatenate, through one shared function, so a prompt that reaches one of
them can never differ from the prompt that reaches the one that splits. The
prompt on the wire is byte-for-byte what it was.

What the arithmetic was protecting is now structural: a message carrying
several skill bodies has all of them inside the stable part, so the breakpoint
lands past every one rather than inside the second. An index could have landed
mid-skill, and a cache entry cut mid-skill matches nothing on the next round —
a failure that costs tokens on every round and never turns a test red. It is
pinned by a test at the adapter and another at the loop.
