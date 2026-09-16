import * as React from "react"
import { Command as CommandPrimitive } from "cmdk"

import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { SearchIcon } from "lucide-react"
import { ground } from "@/lib/ground"

/*
 * DIVERGENCE from the vendored source, allowed only with a stated reason.
 *
 * Structure follows Supabase's command menu — `ui/command.tsx` under their
 * shadcn layer and the `ui-patterns/CommandMenu` that dresses it — because a
 * search surface a reader already knows beats one we invent: the root is the
 * popover surface with no inner plate, the input is borderless on a bottom
 * hairline, a group heading is mono uppercase chrome, and a row is one line
 * whose selected state is the overlay tint. Their mobile sheet, pages stack
 * and telemetry are not taken.
 *
 * Colour jobs on top of that: an empty palette search takes hint grey, like
 * every other empty field; the heading and the shortcut are hint grey as
 * chrome, the list body stays caption grey, and a separator inside a floating
 * menu uses the overlay edge rather than the page divider.
 */

function Command({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      {...ground("popover")}
      className={cn(
        "flex size-full flex-col overflow-hidden rounded-lg bg-popover text-popover-foreground",
        className
      )}
      {...props}
    />
  )
}

function CommandDialog({
  title = "Command Palette",
  description = "Search for a command to run...",
  children,
  className,
  showCloseButton = false,
  ...props
}: Omit<React.ComponentProps<typeof Dialog>, "children"> & {
  title?: string
  description?: string
  className?: string
  showCloseButton?: boolean
  children: React.ReactNode
}) {
  return (
    <Dialog {...props}>
      <DialogContent
        className={cn(
          // Width and height stated here since DialogContent defaults
          // neither; the list inside grows to the cap and then scrolls.
          "top-1/3 max-h-[70vh] translate-y-0 overflow-hidden rounded-lg border border-border p-0 shadow-md ring-0 sm:max-w-xl",
          className
        )}
        showCloseButton={showCloseButton}
      >
        {/* Inside the popup, where the dialog's own labelling looks for
            them — as siblings they named nothing. */}
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">{description}</DialogDescription>
        {children}
      </DialogContent>
    </Dialog>
  )
}

function CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div
      data-slot="command-input-wrapper"
      className="flex items-center gap-2 border-b px-4"
    >
      <SearchIcon className="size-5 shrink-0 opacity-50" aria-hidden />
      <CommandPrimitive.Input
        data-slot="command-input"
        className={cn(
          "h-12 w-full bg-transparent text-sm outline-hidden placeholder:text-tertiary-foreground disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    </div>
  )
}

function CommandList({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn(
        "no-scrollbar max-h-full scroll-py-1 overflow-x-hidden overflow-y-auto outline-none",
        className
      )}
      {...props}
    />
  )
}

function CommandEmpty({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className={cn("py-6 text-center text-sm", className)}
      {...props}
    />
  )
}

function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(
        "overflow-hidden px-2 py-3 text-muted-foreground **:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:pb-2 **:[[cmdk-group-heading]]:font-mono **:[[cmdk-group-heading]]:text-xs **:[[cmdk-group-heading]]:font-normal **:[[cmdk-group-heading]]:tracking-wider **:[[cmdk-group-heading]]:uppercase **:[[cmdk-group-heading]]:text-tertiary-foreground",
        className
      )}
      {...props}
    />
  )
}

function CommandSeparator({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      className={cn("-mx-1 h-px bg-border-overlay", className)}
      {...props}
    />
  )
}

function CommandItem({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        "group/command-item relative flex cursor-default items-center gap-2 rounded-md px-2 py-3 text-sm outline-hidden select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-selected:bg-accent data-selected:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 data-selected:*:[svg]:text-foreground",
        className
      )}
      {...props}
    />
  )
}

function CommandShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn(
        "ml-auto text-xs tracking-widest text-tertiary-foreground group-data-selected/command-item:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}
