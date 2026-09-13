---
'agentic-service-blueprinting': patch
---

**A cell's featured image is its frame, and a person can choose it.**

A cell had two ways to have "its picture": its frame, and an attachment marked
featured, which the detail panel led with regardless of the frame. A
touchpoint's logo lived only on the touchpoint, so getting one onto a slide
meant uploading a copy as the cell's frame — and the panel then drew the logo
twice.

Now the frame is the one slot. In a cell's Resources tab, a picture attachment
and the logo the cell inherits from its touchpoint each offer "Set as featured
image", which writes the frame through a new logged, undoable function,
`set_cell_featured_image`. The inherited logo is listed read-only and is never
saved as a resource row. Placing a cell on a touchpoint that has a logo fills an
empty frame with the logo's path; a frame that holds anything is left alone. The
panel draws one image, the frame, and no separate logo row. Attachments no
longer lead through `featured`; featured links are still the panel's buttons. A
slide image stored as a root-relative path, such as a stock logo, now renders.
Slides are otherwise unchanged: an untouched slide still shows its cited cells'
frames.

**Upgrading a deployment:** apply migration `21000227000000` before deploying
this release, because the app calls the new function and the migration rewrites
`sync_cell_touchpoints` and `set_placement_touchpoint`. No column changes.

Then move your data into frames, in this order:

1. **Freeze first.** For every untouched slide (`shows_all_images = true`)
   citing a cell whose frame you are about to change, make its image set
   explicit with the images it resolves to today, so what it shows does not
   move.
2. **Featured attachments.** For a cell with an attachment marked `featured`
   and an empty frame, or a frame that is only an uploaded copy of a logo, set
   the frame to that attachment's url. Leave the `featured` flag in place or
   clear it; it no longer has an image meaning.
3. **Uploaded logo copies.** Where a cell's frame is an uploaded copy of its
   touchpoint's logo, set the frame to the touchpoint's `icon_url` instead. You
   can delete the copies from storage once nothing else refers to them.

Until you do, a cell whose picture was only a featured attachment shows no
image in the panel.
