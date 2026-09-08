---
'agentic-service-blueprinting': patch
---

The path classifier is spelled `kind` everywhere, not `type` in half the names.

`20260830190000` folded the schema's classifiers onto one word: `paths.path_type`
became `paths.kind`. The type followed — `PathKind` was already the spelling in
every file — but the constants, the theme module and seven camelCase members did
not, so one concept was spoken about in two words that a reader had to learn were
the same.

Renamed: `PATH_TYPE_COLORS`, `PATH_TYPE_ARROW_COLORS`, `PATH_TYPE_LABELS`,
`PATH_TYPE_SHORT_LABELS` and `BLUEPRINT_ARROW_PATH_TYPES` onto `KIND`;
`src/lib/pathTypeTheme.ts` to `pathKindTheme.ts`; and `showPathTypeBadge`,
`shouldShowPathTypeBadge`, `getPathTypeSectionBorderStyle`,
`isGenericPathTypeName`, `getPathTypeSuffixIfNeeded`, `defaultPathTypeMarkerIds`
and `defaultPathTypeMarkerColors` with them. `PathTypeBadgeProps` and
`PathTypeColorKeyProps` sat inside files already named `PathKind*`.

`pathColorTheme.ts` is untouched — "path colour theme" carries no classifier
word. Nor is `path_type` where it names history: `paths_path_type_check` is the
constraint's real name, and the rename map and the IR migration script have to
be able to say the retired word to retire it.

Behaviour is unchanged; every renamed symbol keeps its value and its callers.
