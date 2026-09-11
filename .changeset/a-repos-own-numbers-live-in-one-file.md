---
'agentic-service-blueprinting': patch
---

The router, glossary, sweep and docs-index checks now read the numbers and paths that belong to one repository from a single file, `scripts/repo-config.mjs`: the router's character budget and slack, the recorded prohibition count, the folders the prose sweeps read, the interface map's path, and the docs index's routing table and reading paths. The scripts themselves carry no repository's values any more, so a deployment can keep the same scripts and write its own config file. Every check prints exactly what it printed before; the one generated change is the banner on `INDEX.md`, which now says to edit the routing table in the config file. Failure messages that told you which constant to change now name the config file.

The sweep no longer throws when a folder it is told to read does not exist. A repository without `references/`, `skills/` or `agents/` gets its docs swept and nothing else, and a test holds that. The sweep's list of skipped trees is now called `DATED_RECORDS`, because it holds decision records, not history in general.
