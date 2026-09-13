---
'agentic-service-blueprinting': patch
---

**The presentation page lays each slide out in one left-aligned column, and
every image frame on a slide is the same size.**

A slide with several images used to shrink each picture to a percentage of
its own button, so a 300px source rendered at about 80px and no two pictures
matched. Now the column reads, top to bottom: the slide counter, the title,
the caption, the images, and an `N cells` button.

- **Images** sit in even 4:3 frames with the picture fitted inside. One image
  takes two-thirds of the column; two, three and four share a row; more than
  four wrap in quarters. A picture is never drawn above twice its natural
  size, and on a short window the frames shrink before the title and caption
  are pushed off. Clicking a frame still enlarges it.
- **Cells**: the row of pills at the bottom of the stage is gone. The `N cells`
  button opens a list of the slide's cells, including cells with no image;
  each row opens that cell in the slice exactly as a pill did.
- **Type**: the counter reads `Slide 1 of 3` in sentence case. A slide with no
  images now uses the same title and caption sizes as one with images.
- **Filmstrip** starts on the column's left edge instead of centring itself.

The header band, the prev/next arrows and the mini-map are unchanged.

**Upgrading a deployment:** nothing to do. No data, schema or stored slide
changes; this is the presentation page's layout only.
