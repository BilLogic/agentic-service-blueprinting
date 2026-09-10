import { cva, type VariantProps } from 'class-variance-authority'

/**
 * The size ladder a dense field asks for by name.
 *
 * `Button` has one — `xs`, `sm`, `default`, `lg` — so a dense button says
 * `size="sm"` and gets a height. `Input` had one shape, `h-8 … text-base
 * md:text-sm`, so sixteen dense fields improvised the same override by hand:
 * eleven `h-7 … text-xs`, five `h-6 … text-xs`, in six different orders and
 * none of them able to say which rung it was on. The rungs live here, beside
 * `blueprintCellStyle` and `filterToolbarButton`, because a class ladder is a
 * table rather than a component; `components/blueprint/FieldInput.tsx` is what
 * wears it, and says why it is a wrapper rather than an edit.
 *
 * THE HEIGHTS ARE `Button`'S, rung for rung, and `inputSizeContract.test.tsx`
 * asserts that by rendering both. These two share a row constantly — the
 * API-key field against Save, the paste-a-link field against Add — and a
 * ladder that agreed on `sm` but not on `xs` would be worse than no ladder.
 *
 * A RUNG SETS A HEIGHT AND A TYPE SIZE, and nothing else. `Button`'s rungs
 * also step padding and radius; the sixteen call sites this replaces changed
 * neither, so stepping them here would be a redesign smuggled in under a
 * refactor. Padding and radius stay the primitive's.
 *
 * THE TYPE DOES NOT MATCH `Button`'S, and that is the one deliberate
 * divergence. `Button`'s `sm` is `text-[0.8rem]` — 12.8px, an arbitrary
 * literal `tokenDiscipline.test.ts` exempts by name *because `button.tsx` is
 * vendored*. Reproducing it in an authored file would be asking for the same
 * exemption, which is exactly what that comment refuses, so the dense rungs
 * take `text-xs`, the named rung one step down, and a dense field sits 0.8px
 * off the dense button beside it. The two were never type-matched anyway: at
 * `default` the primitive carries `text-base md:text-sm` — 16px on a phone,
 * because a field under 16px makes iOS Safari zoom on focus — where `Button`
 * carries a flat `text-sm`.
 *
 * `md:text-xs` IS NOT A TYPO beside `text-xs`. The primitive's base sets
 * `md:text-sm`, and Tailwind emits every responsive variant after every
 * unvariant utility, so a bare `text-xs` from a call site loses above 768px:
 * all sixteen of those fields have been rendering at 14px in the desktop
 * editor where their author asked for 12. `tailwind-merge` settles
 * same-variant conflicts, so naming the rung at both widths is what makes it
 * hold at both — and converting the call sites therefore does change what is
 * on screen, in the direction each of them already asked for.
 */
export const fieldInputVariants = cva('', {
  variants: {
    size: {
      xs: 'h-6 text-xs md:text-xs',
      sm: 'h-7 text-xs md:text-xs',
      /** The primitive's own shape: `h-8`, and `text-base md:text-sm`. */
      default: '',
      lg: 'h-9',
    },
  },
  defaultVariants: {
    size: 'default',
  },
})

export type FieldInputSize = NonNullable<
  VariantProps<typeof fieldInputVariants>['size']
>

/** The ladder, in order, for anything that has to walk it. */
export const FIELD_INPUT_SIZES = [
  'xs',
  'sm',
  'default',
  'lg',
] as const satisfies readonly FieldInputSize[]
