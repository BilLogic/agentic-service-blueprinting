---
'agentic-service-blueprinting': patch
---

The test suite runs with the dev-server authoring flag off, whatever a
developer keeps in their own `.env.local`. `VITE_DEV_AUTHORING_UI` is read
once at module load, so a suite that inherits it starts with write flags
already up and fails only on the machine that has the flag.
