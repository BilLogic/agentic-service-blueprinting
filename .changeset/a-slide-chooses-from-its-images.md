---
'agentic-service-blueprinting': minor
---

A slide chooses from its images; it does not swap one set for the other.

`slides.illustration` held ONE image and, when set, replaced the slide's strip
entirely. `21000115000000` kept that column and named what would settle it —
"if it should later become an append to the strip rather than a substitute".
Append is the wrong answer too: an author who wants one drawn image instead of
three fragments is not asking for four.

The slide keeps a pool and chooses from it. `illustrations text[]` is what an
author uploaded; `active_frame_cell_id` and `active_illustration` say which
member it shows, and both null means the whole strip — the default, and what
every existing row still does. A slide can now show ONE frame, which it could
not ask for before.

The choice is two columns rather than a jsonb reference so `on delete set
null` retires it when its cell goes; a check keeps them mutually exclusive and
a second keeps the shown illustration inside the pool.

Uploads stop overwriting each other, which retires the `{src, updated_at}`
cache-buster: a name minted per upload means a URL's content never changes.

Three modules stop calling this a storyboard. A storyboard is a LANE; this is
a slide's illustration, and `SliceStoryboardField`, `storyboardUpload.ts` and
`STORYBOARD_BUCKET` all said otherwise while the bucket itself was already
named `slice-illustrations`.
