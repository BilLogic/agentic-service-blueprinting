---
'agentic-service-blueprinting': patch
---

The service header and the definition examples now describe the service the board is drawing. Both used to read the first service by creation date, so with more than one service the header could name a different service from the one on the canvas. They now resolve the active service the same way the board does, wait for the session before asking, and send the counts and the business model together.

The new-cell form names its row with the real lane badge, tinted in that lane's colour; it used to paint a role name as a colour and render untinted. The evidence form uses the panel's own select for Kind and sets Kind and Title on one row. The Value editor suggests audiences from the stakeholder registry first, then anything already written that the registry does not know. Storyboard frames are rounded concentrically inside their cell, so selection no longer pinches the corners.

Tests now cover the role select, a name-only touchpoint's interactive face, and the stakeholder, status, field-label and divider definitions, and their fixtures no longer carry one deployment's vocabulary.
