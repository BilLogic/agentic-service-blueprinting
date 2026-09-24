---
'agentic-service-blueprinting': patch
---

The README no longer promises a Slack bot

"Where the blueprint is used" listed the Slack bot as the fourth way in, beside
the app, the in-app agent and agentic tools, as though the template shipped it.
It does not, and guide/02 already said so. The README now names the three it
ships, and describes the fourth as a pattern a deployment can build: a reader
holding only the publishable key, bound by the read-consumer rules in
`references/adapter-contract.md`. "Connect your agents" says the same of a
Slack bot under "Everywhere else".
