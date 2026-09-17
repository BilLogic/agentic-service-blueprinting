---
'agentic-service-blueprinting': patch
---

The theme is decided and stamped on the document by the app's own module graph
instead of by an inline script, so a strict Content Security Policy no longer
refuses it, and the stored theme takes the namespace prefix.

`next-themes` injected an inline `<script>` to set the class before the first
paint. The `public/_headers` this template ships serves `default-src 'self'`
with no `script-src`, which refused it — an inline script is not `'self'` — so
the guard did nothing, the class arrived from React after the first paint, and
every load carried a refusal in the console. `src/lib/theme.ts` replaces the library: it reads the stored
theme, resolves it and applies the class and `color-scheme` to the root while
the import graph evaluates, which is a hashed asset doing the work and
therefore allowed by `'self'`. No policy changes, no nonce, and no script in
any `index.html`. Behaviour is otherwise as it was, deliberately: the default is
light, `'system'` still resolves through `prefers-color-scheme` and still
tracks it live, and the theme still follows a second tab of the same
installation.

**One saved theme resets, once.** The key moved from the bare `theme` that
`next-themes` chose onto the namespace seam, so it is `<prefix>theme` from this
release — `sb-theme` in the template. Nothing migrates it: the first load after
upgrading reads no stored theme and opens light, and choosing a theme writes
the new key. That is also what takes the last stored value off the shared
origin — two installations on one host no longer read each other's theme, and
`npm run check:storage-keys` can now see the key at all, because it is built
under `src/` rather than inside a dependency.

Anything importing `useTheme` from `next-themes` imports it from
`@/lib/theme` instead; the hook's shape is the same, except that
`resolvedTheme` is a theme rather than `undefined` until an effect has run.
