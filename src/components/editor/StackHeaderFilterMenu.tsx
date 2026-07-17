import { PathDescriptionTooltip } from '@/components/blueprint/PathDescriptionTooltip'
import { PathTypeColorKey } from '@/components/blueprint/PathTypeColorKey'
import {
  formatPathPickerLabel,
  type PathOption,
} from '@/components/blueprint/PathMultiSelect'
import {
  MenubarCheckboxItem,
  MenubarContent,
  MenubarGroup,
  MenubarLabel,
  MenubarMenu,
  MenubarTrigger,
} from '@/components/ui/menubar'

type StackHeaderFilterMenuProps = {
  paths: PathOption[]
  selectedPathIds: string[]
  onTogglePath: (pathId: string) => void
}

/** Path filters as a menubar menu — must be rendered inside `Menubar`. */
export function StackHeaderFilterMenu({
  paths,
  selectedPathIds,
  onTogglePath,
}: StackHeaderFilterMenuProps) {
  return (
    <div className="ml-auto flex shrink-0 items-center gap-0.5">
      <MenubarMenu>
        <MenubarTrigger>Paths</MenubarTrigger>
        <MenubarContent align="end" className="min-w-52">
          <MenubarGroup>
            <MenubarLabel>Visible paths</MenubarLabel>
            {paths.length === 0 ? (
              <MenubarLabel className="font-normal text-muted-foreground">
                No paths available
              </MenubarLabel>
            ) : (
              paths.map((path) => (
                <MenubarCheckboxItem
                  key={path.id}
                  checked={selectedPathIds.includes(path.id)}
                  onCheckedChange={() => onTogglePath(path.id)}
                  onSelect={(event) => event.preventDefault()}
                >
                  <PathTypeColorKey type={path.path_type} name={path.name} />
                  <PathDescriptionTooltip
                    description={path.description}
                    pathName={path.name}
                    side="left"
                  >
                    <span>{formatPathPickerLabel(path.name)}</span>
                  </PathDescriptionTooltip>
                </MenubarCheckboxItem>
              ))
            )}
          </MenubarGroup>
        </MenubarContent>
      </MenubarMenu>
    </div>
  )
}
