---
'agentic-service-blueprinting': patch
---

The last style guard takes the token model, and the widening finds what the
shape predicts.

`src/lib/tokenDiscipline.test.ts` was the one guard ADR 6 left on a reader of
its own: it walked `src/components/**.tsx`, 185 files out of 399, so anything a
class string said in `lib/`, `hooks/`, `contexts/`, `content/`, `types/` or
`dev/` was outside every style rule in this repository. It reads
`tokenModel` now, which means it reads the whole tree, and widening the sample
once widens every rule that asks.

Two defects were sitting in the unread part. `lib/filterToolbarButton.ts`
carried `border-border/60` and `border-border/50` — the exact pattern the
neutral-edge rule forbids, in a directory that rule did not look at; both
states take the named `border-muted` rung now, which is tuned to land on the
`/60` alpha, so the checked edge is pixel-identical. All twenty-seven hex
matches in the tree are in `src/dev/`: twenty-one real colours in the dev-only
`/proto/arrows` instrument, which Vite drops from a production build, and six
`(#NNN)` issue references in fixture prose. Both files are exempted by name and
with a reason, and a rule beside them fails if an exemption stops matching, so
a dead carve-out cannot outlive the thing it excused.

Three rules arrive with the conversion, and all three found call sites written
against rungs `styles/theme.css` already declares — the sheet converged with
the deployment's under #327 S3, so the vocabulary was there and nothing held
anything to it. Nine bare `rounded` utilities (Tailwind hardcodes 4px there and
`--radius` cannot reach it) take `rounded-sm`, which is the only one of the
three that moves a pixel: `calc(var(--radius) - 4px)` against `--radius:
0.625rem` is 6px, so those nine corners round two pixels more and, unlike
before, follow the dial when it turns. Five bracketed z-indexes take the bare
integer Tailwind v4 wants, compiling to the identical `z-index`; and four
font-size literals — `text-[8px]`, `text-[9px]`, `text-[2.5rem]` and
`sm:text-[2.25rem]` — take `text-5xs`, `text-4xs`, `text-5xl` and
`sm:text-4xl`, each compiling to the same size it replaced. The two
`text-[0.8rem]` in `components/ui/` are exempt: `components.json` points the
shadcn CLI at that directory, so a retune there is deleted by the next
`npx shadcn add`.

`stripComments` in `tokenModel` now blanks block comments instead of deleting
them, and `tokenModel.test.ts` holds it to that. Deleting them collapsed every
newline in a file's header, so every line number the model reported after it
was wrong — `dev/ArrowSituationCatalogPage.tsx` opens with a thirteen-line
header, and its `#2563eb` on line 28 was being reported at line 15, on an
import. Nothing failed while it was wrong, because a passing rule reports no
lines at all. A guard that names the wrong line is a guard someone stops
trusting, and converting this file is what made it start naming lines.
