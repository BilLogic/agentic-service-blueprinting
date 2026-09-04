---
'agentic-service-blueprinting': minor
---

An entity has a status, and a lane names its actor.

Two things the panel editors need that the core never held. `cells.status`
and `paths.status` arrive on one shared `entity_status` domain — `proposed`,
`planned`, `built`, `live`, `at_risk`, `deprecated`, default `live` — so how
far along a thing is lives in a column a badge renders from, not in a name
prefix a reader has to parse. And `stakeholders` arrives: the deployment's
cast list, one row per name across the whole deployment, no `service_id`
(ADR 0003); a lane names its actor by a new nullable `lanes.stakeholder_id`,
and a structural lane names nobody.

Every change is additive. No row is touched, no IR field moves and the schema
version does not; the panel editors that write these columns follow.
