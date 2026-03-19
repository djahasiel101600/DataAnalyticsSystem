import { Fragment } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { DuplicateCheckForm } from '@/features/duplicate-check'
import { LookupForm } from '@/features/lookup'
import { FilterSortForm } from '@/features/filter-sort'
import { RegexSearchForm } from '@/features/regex-search'
import { MergeJoinForm } from '@/features/merge-join'
import { AggregateForm } from '@/features/aggregate'
import { AskAIForm } from '@/features/ai-analytics'
import { CoverageCheckForm } from '@/features/coverage-check'
import { InactivityCheckForm } from '@/features/inactivity-check'
import { ExceptionReportForm } from '@/features/exception-report'
import { CleanDataForm } from '@/features/clean-data'
import { CompareDatasetsForm } from '@/features/compare-datasets'

export function OperationsPanel() {
  return (
    <Tabs defaultValue="duplicate" className="w-full min-w-0">
      <Fragment>
        <p className="text-xs font-medium text-muted-foreground mb-1.5">Operations</p>
        <TabsList className="w-full flex overflow-x-auto overflow-y-hidden flex-nowrap gap-1 h-auto min-h-10 p-1.5 rounded-lg bg-muted/80 mb-2">
          <TabsTrigger value="duplicate" className="flex-shrink-0 px-3 py-2 text-sm">Duplicate</TabsTrigger>
          <TabsTrigger value="lookup" className="flex-shrink-0 px-3 py-2 text-sm">Lookup</TabsTrigger>
          <TabsTrigger value="filter" className="flex-shrink-0 px-3 py-2 text-sm">Filter & sort</TabsTrigger>
          <TabsTrigger value="regex" className="flex-shrink-0 px-3 py-2 text-sm">Regex</TabsTrigger>
          <TabsTrigger value="merge" className="flex-shrink-0 px-3 py-2 text-sm">Merge</TabsTrigger>
          <TabsTrigger value="coverage" className="flex-shrink-0 px-3 py-2 text-sm">Coverage</TabsTrigger>
          <TabsTrigger value="inactivity" className="flex-shrink-0 px-3 py-2 text-sm">Inactivity</TabsTrigger>
          <TabsTrigger value="exceptions" className="flex-shrink-0 px-3 py-2 text-sm">Exceptions</TabsTrigger>
          <TabsTrigger value="clean" className="flex-shrink-0 px-3 py-2 text-sm">Clean</TabsTrigger>
          <TabsTrigger value="compare" className="flex-shrink-0 px-3 py-2 text-sm">Compare</TabsTrigger>
          <TabsTrigger value="aggregate" className="flex-shrink-0 px-3 py-2 text-sm">Aggregate</TabsTrigger>
          <TabsTrigger value="ai" className="flex-shrink-0 px-3 py-2 text-sm">Ask AI</TabsTrigger>
        </TabsList>
      </Fragment>
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
      <TabsContent value="coverage" className="mt-0 focus-visible:outline-none">
        <CoverageCheckForm />
      </TabsContent>
      <TabsContent value="inactivity" className="mt-0 focus-visible:outline-none">
        <InactivityCheckForm />
      </TabsContent>
      <TabsContent value="exceptions" className="mt-0 focus-visible:outline-none">
        <ExceptionReportForm />
      </TabsContent>
      <TabsContent value="clean" className="mt-0 focus-visible:outline-none">
        <CleanDataForm />
      </TabsContent>
      <TabsContent value="compare" className="mt-0 focus-visible:outline-none">
        <CompareDatasetsForm />
      </TabsContent>
      <TabsContent value="aggregate" className="mt-0 focus-visible:outline-none">
        <AggregateForm />
      </TabsContent>
      <TabsContent value="ai" className="mt-0 focus-visible:outline-none">
        <AskAIForm />
      </TabsContent>
    </Tabs>
  )
}
