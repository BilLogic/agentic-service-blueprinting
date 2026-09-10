import type * as React from 'react'
import type { VariantProps } from 'class-variance-authority'

import { Input } from '@/components/ui/input'
import { fieldInputVariants } from '@/lib/fieldInputSizes'
import { cn } from '@/lib/utils'

/**
 * An `Input` that asks for its size by name.
 *
 * THIS IS A WRAPPER, NOT AN EDIT to `input.tsx`, and the rule is not a
 * preference. `components.json` points the shadcn CLI at `@/components/ui`, so
 * that file is regenerated rather than authored, and the standing rule in
 * `tokenDiscipline.test.ts` — written against `button.tsx`'s own vendored
 * sizing — is that a product need the primitive does not meet becomes a
 * wrapper in `components/blueprint/`. A `size` variant added to `input.tsx`
 * would be deleted by the next `npx shadcn add input`, and sixteen dense
 * fields would fall back to `h-8` silently.
 *
 * The primitive also could not carry this prop if it wanted to. `Input`'s
 * props are `React.ComponentProps<"input">`, where `size` is already taken: it
 * is the HTML attribute, and it is a number. A rung named `size` on the
 * vendored file collides with it outright; a rung named `size` out here
 * shadows it, which is why it is destructured off below rather than spread
 * onto the DOM. Nothing in this tree sets the HTML attribute — it sizes a text
 * input in characters, which no field here wants.
 *
 * The rungs themselves, and the argument for their values, are in
 * `lib/fieldInputSizes.ts`.
 */
export type FieldInputProps = Omit<React.ComponentProps<typeof Input>, 'size'> &
  VariantProps<typeof fieldInputVariants>

export function FieldInput({ className, size, ...props }: FieldInputProps) {
  return (
    <Input className={cn(fieldInputVariants({ size }), className)} {...props} />
  )
}
