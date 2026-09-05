---
'agentic-service-blueprinting': patch
---

The standalone sweep sees what a commit would.

`npm run check:standalone` read tracked files only, so a changeset written
and checked before `git add` passed the script and failed `npm test` the
moment it was committed. The subject is now tracked plus untracked files
git would not ignore — one function, read by the script and the test alike —
with a test that builds a throwaway repository and proves an untracked file
is swept and an ignored one is not.
