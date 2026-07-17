import { useEffect, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar'
import {
  getMainSlides,
  getSlideById,
  getSlideDisplayLabel,
  getSubslides,
  type Slide,
} from '@/types/slides'
import { cn } from '@/lib/utils'

type SlideNavProps = {
  slides: Slide[]
  activeSlideId: string
  onSelect: (id: string) => void
  isHome?: boolean
}

export function SlideNav({
  slides,
  activeSlideId,
  onSelect,
  isHome = false,
}: SlideNavProps) {
  const mains = getMainSlides(slides)
  const [openParents, setOpenParents] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    if (isHome) return
    const active = getSlideById(activeSlideId, slides)
    if (active?.parentId) {
      setOpenParents((prev) => new Set(prev).add(active.parentId!))
    }
  }, [activeSlideId, slides, isHome])

  const toggleParent = (parentId: string, open: boolean) => {
    setOpenParents((prev) => {
      const next = new Set(prev)
      if (open) next.add(parentId)
      else next.delete(parentId)
      return next
    })
  }

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {mains.map((main) => {
            const children = getSubslides(main.id, slides)
            const hasChildren = children.length > 0
            const isMainActive = !isHome && activeSlideId === main.id
            const childActive =
              !isHome && children.some((c) => c.id === activeSlideId)
            const isOpen = openParents.has(main.id)
            const mainLabel = getSlideDisplayLabel(main, slides)

            if (!hasChildren) {
              return (
                <SidebarMenuItem key={main.id}>
                  <SidebarMenuButton
                    isActive={isMainActive}
                    onClick={() => onSelect(main.id)}
                  >
                    <span>{mainLabel}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            }

            return (
              <Collapsible
                key={main.id}
                open={isOpen}
                onOpenChange={(open) => toggleParent(main.id, open)}
              >
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={isMainActive || childActive}
                    onClick={() => onSelect(main.id)}
                  >
                    <span>{mainLabel}</span>
                  </SidebarMenuButton>
                  <CollapsibleTrigger
                    render={<SidebarMenuAction showOnHover={false} />}
                    aria-label={
                      isOpen ? `Collapse ${mainLabel}` : `Expand ${mainLabel}`
                    }
                  >
                    <ChevronRight
                      className={cn(
                        'transition-transform',
                        isOpen && 'rotate-90',
                      )}
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {children.map((child) => (
                        <SidebarMenuSubItem key={child.id}>
                          <SidebarMenuSubButton
                            render={<button type="button" />}
                            isActive={!isHome && activeSlideId === child.id}
                            onClick={() => onSelect(child.id)}
                          >
                            <span>{getSlideDisplayLabel(child, slides)}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
