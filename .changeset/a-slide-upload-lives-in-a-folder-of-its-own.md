---
'agentic-service-blueprinting': patch
---

A slide upload lives in a folder of its own, and the bucket admits it.

**A stock install of this kit could not accept a slide image at all.**
`illustrationPath` writes `slices/<slice>/<slide>/<id>.<ext>` — three path
segments, because a slide's images became a set and a set needs a folder per
slide — and `slice_illustrations_insert` had matched exactly two ever since
the bucket was made. So every upload was refused by row-level security *after
the whole file had gone over the wire*: a 403 at the end of an upload, from a
policy no screen can explain, and nothing an adopter could do about it short
of writing the policy by hand.

The policy moved rather than the key, because the key is what the app and the
rows depend on. The older spellings — one image per slide, `frame-N`,
`character-ref` — stay accepted, so objects already in the bucket keep
resolving.

**The same bucket had never had a DELETE policy.** Deleting a slice calls
`removeSlideUploadObjects` on each of its slides, and with no policy that call
matched nothing, returned no error, and left every image where it was. There
is now a DELETE policy, bounded by the same name pattern as the insert and
taking its tier gate from the same restrictive companion — and the sweep
**counts the rows it removed** instead of reading a non-error return as a yes,
which is the exact trap that hid this for a release.

A revertible slide drop still leaves its folder alone. `replaceSlides` does
not sweep, and `restore_slides` only sweeps the slides its inverse does not
put back: those `image_url`s are written back verbatim, so an object deleted
there would restore a row pointing at nothing. A slice deleted outright has no
inverse to protect, and its objects go.

**What compares them now.** The pattern and the path builder drifted because
nothing ever put them side by side. `src/lib/storageKeyPolicies.test.ts` reads
every `storage.objects` policy that matches on `name` out of the migrations,
runs the real key builders, and asserts the pattern accepts the key each one
produces and admits exactly the path depths that bucket declares. A policy
matching on a name with no key builder pinned to it fails that file, so a new
bucket cannot repeat this quietly. The migration carries the second half in
SQL: the pattern decides correctly about nine names, and the pattern it
decided about is the one the three policies actually carry, read back out of
the catalogue.

The CI shim now carries the grants Supabase itself holds on `storage.objects`,
without which no rehearsal here could ever have asked a bucket policy anything
— it would have met `permission denied` before reaching the policy's answer.
