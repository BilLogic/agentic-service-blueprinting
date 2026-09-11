---
'agentic-service-blueprinting': minor
---

The canvas agent reads back more of what the board holds, and a deployment's
own adapter reaches the agent's prompt.

`get_blueprint` now lists each path's dependency edges after its grid,
source-first with the edge's kind and id. The board query always joined them;
the text dropped them, so the agent could write an arrow and not see it in the
grid. `get_cell` now includes the cell's resources, each one's name and url.
`list_findings` takes an optional `cell_id` and returns only the findings that
cite that cell. The no-database sample trial gives the same answers for all of
these.

`create_cell_dependency` now says in its description that `leads_to` and
`enables` are not inverses, since a precondition causes nothing. The tool
declarations gain a comment on how tools are named.

The `get_reference` description tells the agent to read `blueprint` first only
when a deployment has registered a document by that name. Standalone, the
wording is unchanged.

The canvas adapter now says what the code does: a read that takes a `service`
filter covers every service in the deployment when the filter is left out. It
used to say such a read stayed on the service on screen. A test holds every
tool description and the adapter to that behaviour.

The system prompt now takes the canvas adapter from the same record
`get_reference` serves. Before, a deployment that registered a replacement
adapter through `registerReferenceDocs` changed what `get_reference` returned
but not the prompt.

The eval harness takes its write list from the app's write roster instead of a
hand-written copy. The copy named one tool twice and left out the evidence and
stakeholder writes.
