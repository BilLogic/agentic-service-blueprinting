---
'agentic-service-blueprinting': patch
---

A dense input asks for its size by name: `FieldInput` carries `Button`'s rung
ladder, and sixteen hand-written `h-7 … text-xs` fields ask for a rung instead.

**`Button` has `xs` / `sm` / `default` / `lg`; `Input` had one shape.** So
every dense field in the app improvised the same override — eleven `h-7 …
text-xs`, five `h-6 … text-xs`, in six different orders, none of them able to
say which rung it was on. A field and a `size="sm"` button share a row
constantly, and the next dense field was a fresh guess.

**This is a wrapper, not an edit.** `components.json` points the shadcn CLI at
`@/components/ui`, so `input.tsx` is regenerated rather than authored, and the
standing rule in `tokenDiscipline.test.ts` is that a product need the primitive
does not meet becomes a wrapper in `components/blueprint/`. A `size` variant
added to the vendored file would be deleted by the next `npx shadcn add input`
— and could not have been written anyway: `Input`'s props are
`React.ComponentProps<"input">`, where `size` is already the HTML attribute,
and a number.

**The heights are `Button`'s, rung for rung; the type deliberately is not.**
`Button`'s `sm` is `text-[0.8rem]`, an arbitrary literal `tokenDiscipline`
exempts *because that file is vendored*; reproducing it in an authored file
would be asking for the same exemption, so the dense rungs take `text-xs` and a
field sits 0.8px off the button beside it. The two were never type-matched: at
`default` the primitive carries `text-base md:text-sm` — 16px on a phone,
because a field under 16px makes iOS Safari zoom on focus — where `Button`
carries a flat `text-sm`.

**Converting the call sites does change what is on screen.** The primitive's
base sets `md:text-sm`, and Tailwind emits every responsive variant after every
unvariant utility — `.md\:text-sm` lands at byte 193767 of the compiled sheet
against `.text-xs` at 81430 — so a bare `text-xs` from a call site lost above
768px. All sixteen fields have been rendering at 14px in the desktop editor
where their author asked for 12. The rungs name the size at both widths, so it
now holds at both. `font-mono` and `flex-1` stay at the call sites: those are
per-field decisions, not part of a size rung.

`lib/inputSizeContract.test.tsx` pins the parity rather than today's class
strings. It renders both components at every rung and asks `tailwind-merge` —
the resolver `cn` runs — which class on each node is a height, so a re-vendor
that moves either primitive moves the rule with it. Three clauses: every rung
is the same height on both, the rungs are distinct heights, and no field
outside `components/ui` names a height or a type size of its own.
