---
"agentic-service-blueprinting": patch
---

Seven of the eleven non-theme stylesheets become one implementation, and the
four that do not are all blocked by one thing.

The deployment this kit was generalised from measures the same stylesheets
through the same reader now that both repositories share `lib/tokenModel.ts`
(ADR 0006). That is what made this checkable rather than hopeful: every sheet
below was compared by what its declarations RESOLVE to at the root under each
theme, before and after, and no name in either theme changed value.

**What the template took, and why each was a gap rather than a preference.**

  `base.css`             the mono seam, filled. `theme.css` has always read
                         `var(--font-source-code-pro, …)` and this package has
                         always shipped the face; nothing ever injected it, so
                         the seam named in one file was answered in neither.
  `utilities.css`        a reduced-motion branch for `delayed-appear`, which
                         was the one animated surface in the tree with no
                         reduced-motion answer.
  `unset-tw-colors.css`  the reset list, corrected. `crimson`, `gold`,
                         `tomato` and `scale` are our own family names and
                         never Tailwind's, so those four lines cleared nothing
                         while stating something false about the framework.
  `compat.css`           the alias layer's rules, and one alias fewer:
                         `--color-foreground-contrast` sat here at exactly the
                         value `theme.css` registers, and `theme.css` imports
                         later, so this file's copy could never win. It was not
                         an alias at all.
  `animations.css`       the `--ease-camera` key beside the `--motion-camera`
                         duration that was already here, and the skeleton's
                         breath — `animate-pulse` snaps between both extremes,
                         which on a panel full of bars reads as flicker.
  `tailwind.config.css`  three `@source not` lines. Tailwind scans every
                         non-gitignored file from the project root, so a class
                         named in a document, a test or a script generates that
                         class — including, in a guard that lists the shapes it
                         FORBIDS, the very vocabulary it exists to forbid.
  `theme.css`            four type rungs the ladder was missing at both ends.

**Two comments went the other way**, because the template's wording was the
truer one for a file two repositories share: Ubuntu Sans is the *default* face
here, not a brand face, and a fork is told what to swap alongside it.

**The tests came with the files they pin.** A shared implementation whose test
stays behind is a shared implementation nobody holds to the same promise, so
`tailwindColorReset.test.ts` and `compatLayer.test.ts` arrive too — the first
reads Tailwind's own `theme.css` out of `node_modules` and holds the reset list
against it in both directions, the second forbids an alias that carries a value
and an alias shadowing a name `theme.css` already registers, which is what
keeps the deletion above from coming back.

`motion.test.ts` moved from a regex over one file to a question asked of the
token model. Its selector pattern could not read `[data-slot='skeleton']` — it
stopped at the hyphen and threw on the value — and a guard that names its own
files only ever covers the surfaces that existed when it was written. It reads
every stylesheet the entry imports now, so the next animated surface is covered
wherever someone puts it. `motion.ts` gains `MOTION_CAMERA_EASE` to match.

One census became an invariant: `tokenModel.test.ts` asserted that
`unset-tw-colors.css` holds seventeen resets. WHICH families belong there is a
question with an oracle — the framework's own theme file — and
`tailwindColorReset.test.ts` now answers it, so the count is gone and the shape
is what remains.

**What did not converge, and the single reason three of the four share.**
`colors.css` and `print.css` differ ONLY in per-deployment brand values —
seven ramp steps written as literals rather than as indirections through the
dials in `themes/`, and in `print.css` a block that must restate them because
`themes/dark.css` sets its own copies with no `@media screen` around them.
`semantic.css` differs in where three dials live, which is the same question
seen from the other side. All three wait on the brand seam, which is settled
separately and deliberately leaves `themes/*.css` each deployment's own.
`blueprint.css` is the fourth, and it waits on work still open elsewhere plus a
lane role the template's schema does not carry.
