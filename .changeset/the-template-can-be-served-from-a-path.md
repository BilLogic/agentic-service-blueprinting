---
'uno-blueprint': minor
---

The template can be served from a path

The app no longer assumes it lives at the root of a domain. One build-time
variable, `BASE_PATH` (for example `/demo/`), sets where it is served. Vite
takes it as `base`, the build is written under it (`dist/demo/…`) with
`_headers` and `_redirects` moved back up to `dist/`, and every URL the app
reads or writes keeps the prefix: the service slug in the path, deep links and
the board address, the magic-link redirect, and root-relative image paths
stored in the data (storyboard frames, touchpoint logos, cover images).
`src/lib/basePath.ts` is where those cross the prefix.

`npm run check:hosting` reads the same setting, from the environment or from
`[build.environment]` in `netlify.toml`, and holds the prefixed rules to the
same order and cache (`/demo/assets/*` → 404 above `/demo/*` →
`/demo/index.html`). The render walk previews at the prefix and navigates
relative to it. A new case, `render-walk/served-from-a-path.spec.ts`, asserts
that the shareable address carries the prefix, that a cold load of it lands the
same board, and that no request leaves the prefix. CI runs the whole walk again
over a `/demo/` build.

Unset, nothing changes: `base` is `/`, the output is `dist/`, and every URL is
what it was. The recipe, including the Netlify rewrite for showing the app
under a path on another site, is in `docs/guide/04-operations.md` § Serving
from a path.

Upgrading a deployment:

- `vite.config.ts` changes, and a deployment holds it byte-identical: copy
  the new file in with the pin bump. At a domain root that is all it needs.
- A deployment served from a path sets `BASE_PATH` in `[build.environment]`,
  moves its redirects and its `/assets/*` cache block under the prefix, and
  adds the prefixed URL to its Supabase redirect allow-list (both origins, if
  it is also reached through a proxy on another site).
- A deployment that enrols the render walk runs it with the same `BASE_PATH`
  over a build made with it. The walk's specs now navigate to `./` rather than
  `/`.
