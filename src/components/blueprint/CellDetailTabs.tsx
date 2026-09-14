import { FileSearch, Link2, Plus, Workflow } from 'lucide-react'
import { CellDependencyEditor } from '@/components/blueprint/CellDependencyEditor'
import { CellDependencySections } from '@/components/blueprint/CellDependencySections'
import { CellEvidenceTab } from '@/components/blueprint/CellEvidenceTab'
import { CellResourcesTab } from '@/components/blueprint/CellResourcesTab'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { CellDetailFacts } from '@/components/blueprint/cellDetailFacts'
import type { ComponentProps } from 'react'

/** The three tabs, in reading order; Dependencies is where a cell opens. */
export type PanelTab = 'dependencies' | 'evidence' | 'resources'

const PANEL_TABS: Array<{
  value: PanelTab
  label: string
  icon: typeof Workflow
}> = [
  { value: 'dependencies', label: 'Dependencies', icon: Workflow },
  { value: 'evidence', label: 'Evidence', icon: FileSearch },
  { value: 'resources', label: 'Resources', icon: Link2 },
]

/**
 * The tab row below the overview, and whichever tab is showing.
 *
 * `dependencyEditing` is the whole of the read-only/editable distinction for
 * the dependency rows — null is what makes the list read-only, the same
 * component either way — and it arrives already decided, because only the
 * panel knows whether this reader may write.
 */
export function CellDetailTabs({
  activeTab,
  onTabChange,
  facts,
  dependencyEditing,
  addingDependency,
  onAddingDependencyChange,
  canAddDependency,
  onCellSelect,
  onTechSelect,
}: {
  activeTab: PanelTab
  onTabChange: (tab: PanelTab) => void
  facts: CellDetailFacts
  dependencyEditing: ComponentProps<typeof CellDependencySections>['editing']
  addingDependency: boolean
  onAddingDependencyChange: (adding: boolean) => void
  canAddDependency: boolean
  onCellSelect: (cellId: string) => void
  onTechSelect: (cellId: string, techItem: string) => void
}) {
  const {
    resolvedCellId,
    connections,
    otherTechEntries,
    selectedLaneRowPosition,
    selectedCell,
    cellResourceList,
    cellTouchpointList,
    dependencySource,
    dependencyCandidates,
    existingDependencies,
  } = facts
  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => onTabChange(value as PanelTab)}
      className="gap-0"
    >
      <TabsList
        variant="line"
        className="h-auto w-full justify-start gap-4 rounded-none border-b border-muted px-4 pb-0"
      >
        {PANEL_TABS.map(({ value, label, icon: TabIcon }) => (
          <TabsTrigger
            key={value}
            value={value}
            className="h-auto flex-none gap-1.5 rounded-none px-0 pb-2 pt-0 text-xs font-normal text-tertiary-foreground hover:text-muted-foreground data-active:text-foreground after:bottom-[-1px] after:bg-foreground/70"
          >
            <TabIcon className="size-3" aria-hidden />
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
      {/*
        Reserved height: the three tabs have very different
        content lengths, and without a floor the panel jumped a
        couple of hundred pixels on every switch. Cheaper and
        steadier than easing the height.
      */}
      <div className="flex min-h-56 flex-col gap-5 px-4 pt-4 pb-4">
        {activeTab === 'dependencies' ? (
          <>
            <CellDependencySections
              // Keyed on the cell, so the row whose note field is
              // open does not carry over to the next cell.
              key={resolvedCellId ?? 'no-cell'}
              connections={connections}
              otherTech={otherTechEntries}
              selectedLaneRowPosition={selectedLaneRowPosition}
              editing={dependencyEditing}
              onCellSelect={onCellSelect}
              onTechSelect={onTechSelect}
            />
            {canAddDependency && dependencySource ? (
              addingDependency ? (
                <CellDependencyEditor
                  source={dependencySource}
                  candidates={dependencyCandidates}
                  existing={existingDependencies}
                  onDone={() => onAddingDependencyChange(false)}
                />
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="self-start px-2 text-muted-foreground hover:text-foreground"
                  onClick={() => onAddingDependencyChange(true)}
                >
                  <Plus className="size-3" aria-hidden />
                  Add dependency
                </Button>
              )
            ) : null}
          </>
        ) : null}
        {activeTab === 'evidence' ? (
          <CellEvidenceTab cellId={resolvedCellId} />
        ) : null}
        {activeTab === 'resources' ? (
          <CellResourcesTab
            cellId={resolvedCellId}
            resources={cellResourceList}
            touchpoints={cellTouchpointList}
            frame={selectedCell?.frame ?? null}
          />
        ) : null}
      </div>
    </Tabs>
  )
}
