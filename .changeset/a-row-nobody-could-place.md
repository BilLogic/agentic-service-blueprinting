---
'agentic-service-blueprinting': patch
---

A scoped ranked search no longer says rows are in another service when nobody could place them.

`search_blueprint` under a `service` scope said "are all outside *service*" whenever rows came back and none survived the filter — including when every returned row was dropped as ambiguous (a phase name two services share) or unplaceable (no phase breadcrumb). Those rows were placed nowhere and may belong to the scope, so the sentence asserted the one thing the tool cannot know. "Outside" is now said only of rows actually placed elsewhere. Also: the abort signal reaches the search call and the phase-ownership read, not only the embed, so Stop cancels the slowest read the agent makes; and three comments that claimed the model never sees a name it cannot call now describe what happens, since the shared read-surface reference is injected whole on every send.
