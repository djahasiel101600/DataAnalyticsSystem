import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { DuplicateCheckForm } from '@/features/duplicate-check'
import { LookupForm } from '@/features/lookup'
import { FilterSortForm } from '@/features/filter-sort'
import { RegexSearchForm } from '@/features/regex-search'
import { MergeJoinForm } from '@/features/merge-join'
import { AggregateForm } from '@/features/aggregate'

export function OperationsPanel() {
  return (
    <Tabs defaultValue="duplicate" className="w-full min-w-0">
      <div className="mb-2">
        <p className="text-xs font-medium text-muted-foreground mb-1.5">Operations</p>
        <TabsList className="w-full flex overflow-x-auto overflow-y-hidden flex-nowrap gap-1 h-auto min-h-10 p-1.5 rounded-lg bg-muted/80">
          <TabsTrigger value="duplicate" className="flex-shrink-0 px-3 py-2 text-sm">Duplicate</TabsTrigger>
          <TabsTrigger value="lookup" className="flex-shrink-0 px-3 py-2 text-sm">Lookup</TabsTrigger>
          <TabsTrigger value="filter" className="flex-shrink-0 px-3 py-2 text-sm">Filter & sort</TabsTrigger>
          <TabsTrigger value="regex" className="flex-shrink-0 px-3 py-2 text-sm">Regex</TabsTrigger>
          <TabsTrigger value="merge" className="flex-shrink-0 px-3 py-2 text-sm">Merge</TabsTrigger>
          <TabsTrigger value="aggregate" className="flex-shrink-0 px-3 py-2 text-sm">Aggregate</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="duplicate" className="mt-0 focus-visible:outline-none">
        <DuplicateCheckForm />
      </TabsContent>
      <TabsContent value="lookup" className="mt-0 focus-visible:outline-none">
        <LookupForm />
      </TabsContent>
      <TabsContent value="filter" className="mt-0 focus-visible:outline-none">
        <FilterSortForm />
      </TabsContent>
      <TabsContent value="regex" className="mt-0 focus-visible:outline-none">
        <RegexSearchForm />
      </TabsContent>
      <TabsContent value="merge" className="mt-0 focus-visible:outline-none">
        <MergeJoinForm />
      </TabsContent>
      <TabsContent value="aggregate" className="mt-0 focus-visible:outline-none">
        <AggregateForm />
      </TabsContent>
    </Tabs>
  )
}
