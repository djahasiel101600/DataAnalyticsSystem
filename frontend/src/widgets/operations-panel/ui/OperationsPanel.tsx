import { useState } from "react";
import {
  ArrowLeftRight,
  BarChart3,
  Copy,
  Eraser,
  Filter,
  GitCompare,
  Layers,
  Regex,
  Search,
  Sparkles,
  Table2,
  Timer,
  type LucideIcon,
} from "lucide-react";
import { DuplicateCheckForm } from "@/features/duplicate-check";
import { LookupForm } from "@/features/lookup";
import { FilterSortForm } from "@/features/filter-sort";
import { RegexSearchForm } from "@/features/regex-search";
import { MergeJoinForm } from "@/features/merge-join";
import { AggregateForm } from "@/features/aggregate";
import { AskAIForm } from "@/features/ai-analytics";
import { CoverageCheckForm } from "@/features/coverage-check";
import { InactivityCheckForm } from "@/features/inactivity-check";
import { ExceptionReportForm } from "@/features/exception-report";
import { CleanDataForm } from "@/features/clean-data";
import { CompareDatasetsForm } from "@/features/compare-datasets";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Button } from "@/shared/ui/button";

interface Operation {
  value: string;
  label: string;
  icon: LucideIcon;
  form: React.ReactNode;
}

const operations: Operation[] = [
  { value: "duplicate", label: "Duplicates", icon: Copy, form: <DuplicateCheckForm /> },
  { value: "lookup", label: "Lookup", icon: Search, form: <LookupForm /> },
  { value: "filter", label: "Filter", icon: Filter, form: <FilterSortForm /> },
  { value: "merge", label: "Merge", icon: Layers, form: <MergeJoinForm /> },
  { value: "coverage", label: "Coverage", icon: Table2, form: <CoverageCheckForm /> },
  { value: "inactivity", label: "Inactive", icon: Timer, form: <InactivityCheckForm /> },
  { value: "exceptions", label: "Exceptions", icon: ArrowLeftRight, form: <ExceptionReportForm /> },
  { value: "compare", label: "Compare", icon: GitCompare, form: <CompareDatasetsForm /> },
  { value: "aggregate", label: "Aggregate", icon: BarChart3, form: <AggregateForm /> },
  { value: "clean", label: "Clean", icon: Eraser, form: <CleanDataForm /> },
  { value: "regex", label: "Regex", icon: Regex, form: <RegexSearchForm /> },
  { value: "ai", label: "Ask AI", icon: Sparkles, form: <AskAIForm /> },
];

export function OperationsPanel() {
  const [resetVersions, setResetVersions] = useState<Record<string, number>>({});

  return (
    <Tabs
      defaultValue="duplicate"
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex-none border-b border-border px-2 py-2">
        <TabsList
          aria-label="Choose an operation"
          className="grid w-full grid-cols-4 gap-1 border-0 bg-transparent p-0"
        >
          {operations.map(({ value, label, icon: Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="h-10 flex-col gap-1 rounded-md border border-transparent px-1 py-1 text-[10px] leading-none data-[state=active]:border-primary/30 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-none"
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="max-w-full truncate">{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {operations.map(({ value, label, form }) => (
          <TabsContent
            key={value}
            value={value}
            forceMount
            className="mt-0 focus-visible:outline-none data-[state=inactive]:hidden"
          >
            <div key={`${value}:${resetVersions[value] ?? 0}`}>
              <div className="mb-2 flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[10px] text-muted-foreground"
                  onClick={() => {
                    if (!window.confirm(`Reset the ${label} configuration?`)) {
                      return;
                    }
                    setResetVersions((versions) => ({
                      ...versions,
                      [value]: (versions[value] ?? 0) + 1,
                    }));
                  }}
                >
                  Reset configuration
                </Button>
              </div>
              {form}
            </div>
          </TabsContent>
        ))}
      </div>
    </Tabs>
  );
}
