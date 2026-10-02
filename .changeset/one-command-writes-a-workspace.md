---
'uno-blueprint': minor
---

One command writes a workspace

The template now carries an initialiser, `create-uno-blueprint`, in
`packages/create-uno-blueprint/`. Given a folder name it downloads the release
tarball whose tag is its own version, unpacks it there and prints what to type
next; given none it uses `uno-blueprint`. It asks no questions, needs neither
git nor a system `tar`, and has no runtime dependencies. A folder that already
has files is refused, a Node below 22 is refused first, and a download that
fails says where it tried. The workspace it writes is the whole template minus
the initialiser's own folder.

It stops before installing: `--no-install` is accepted and changes nothing yet.
The package is not on npm until its first publish.

The version guard holds a fifth place. `npm run check:version` now fails when
`packages/create-uno-blueprint/package.json` states a different version from
`package.json`, and `npm run version` copies the number into it. A tree without
that folder, which is what the initialiser writes, is held to the other four.

The root manifest states the Node floor it has always had: `engines.node` is
`>=22`.
