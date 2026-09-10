---
'agentic-service-blueprinting': minor
---

The agent searches every service, and nothing configures that.

The ⚙ settings popover carried a `Scope` row — `Active service` or
`All services` — offered as the creator's default when a question names no
service. It configured nothing. `resolveServiceScope` returned the
whole-deployment scope before the setting was ever read whenever the
deployment held one service, which is the kit's sample and every deployment
that exists. A control that cannot change an outcome is worse than no control:
it invites a reader to believe the app has a behaviour it does not have.

**The default is now every service.** A question that names none reads across
the whole deployment. A creator who wants one names it, which the per-call
`service` argument already does — a service name narrows, `"all"` widens, and
an unknown name still throws with the real names listed. `resolveServiceScope`
no longer takes a `defaultMode`, and `AgentServiceScopeMode`, the stored
`serviceScope` setting, `serviceScopeMode`, `getAgentServiceScopeMode` and
`AgentScopeField.tsx` are gone. A scope left in a browser's localStorage is
simply never read again; nothing migrates it.

**Where this is felt.** On a one-service deployment it is a no-op — that is
what the short-circuit already guaranteed. On a deployment with several it is a
real behaviour change: a question naming no service now reads across all of
them where it previously read the one the URL slug names. The agent's own tool
description is where a model finds that out, so the `service` parameter now
says that omitting it searches EVERY service and that the default is the whole
deployment, not the one on screen.

**The row also mis-taught the vocabulary.** "Active service" here meant the ONE
service the URL slug names, singular. There is no `active` column on
`services` and no such thing as an inactive one, so a reader who took the
phrase for "the ones switched on" got a plural where the code meant a
singular.

**What is pinned.** `serviceScope.test.ts` asserts the multi-service default
the old short-circuit hid: on a two-service fixture, a call naming no service
resolves to the whole deployment — including when a slug names one, because
the URL scopes the canvas and not the agent's reach. The single-service
short-circuit stays as an OPTIMISATION and says so: the default no longer needs
it, and what it still buys is the explicitly-named case, where narrowing to the
only service would pay a join per read and hide catalog rows no lane picks.
