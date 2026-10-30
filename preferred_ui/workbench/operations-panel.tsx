import { useState, type ComponentType } from "react";
import {
  ArrowLeftRight,
  BarChart3,
  Copy,
  Eraser,
  Filter,
  GitCompare,
  Layers,
  Regex,
  SearchCheck,
  Sparkles,
  Table2,
  Timer,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AggregateForm } from "./forms/aggregate-form";
import { AiForm } from "./forms/ai-form";
import { CleanForm } from "./forms/clean-form";
import { CompareForm } from "./forms/compare-form";
import { CoverageForm } from "./forms/coverage-form";
import { DuplicateForm } from "./forms/duplicate-form";
import { ExceptionForm } from "./forms/exception-form";
import { FilterSortForm } from "./forms/filter-sort-form";
import { InactivityForm } from "./forms/inactivity-form";
import { LookupForm } from "./forms/lookup-form";
import { MergeForm } from "./forms/merge-form";
import { RegexForm } from "./forms/regex-form";

interface Operation {
  key: string;
  label: string;
  icon: LucideIcon;
  title: string;
  description: string;
  Form: ComponentType;
}

const OPERATIONS: Operation[] = [
  {
    key: "duplicate",
    label: "Duplicates",
    icon: Copy,
    title: "Duplicate check",
    description: "Find or remove rows that repeat on the columns you choose.",
    Form: DuplicateForm,
  },
  {
    key: "lookup",
    label: "Lookup",
    icon: SearchCheck,
    title: "Lookup",
    description: "Bring columns across from another file, like VLOOKUP.",
    Form: LookupForm,
  },
  {
    key: "filter",
    label: "Filter",
    icon: Filter,
    title: "Filter & sort",
    description: "Keep the rows that matter and put them in order.",
    Form: FilterSortForm,
  },
  {
    key: "merge",
    label: "Merge",
    icon: Layers,
    title: "Merge / join",
    description: "Combine two tables side by side on a shared key.",
    Form: MergeForm,
  },
  {
    key: "coverage",
    label: "Coverage",
    icon: Table2,
    title: "Coverage check",
    description: "See which rows are missing from a master list.",
    Form: CoverageForm,
  },
  {
    key: "inactivity",
    label: "Inactive",
    icon: Timer,
    title: "Inactivity check",
    description: "Flag rows with no activity beyond a number of days.",
    Form: InactivityForm,
  },
  {
    key: "exceptions",
    label: "Exceptions",
    icon: ArrowLeftRight,
    title: "Exception report",
    description: "Duplicates, inactivity and coverage in one table.",
    Form: ExceptionForm,
  },
  {
    key: "compare",
    label: "Compare",
    icon: GitCompare,
    title: "Compare datasets",
    description:
      "List what was added, removed or changed between two versions.",
    Form: CompareForm,
  },
  {
    key: "aggregate",
    label: "Aggregate",
    icon: BarChart3,
    title: "Aggregate / pivot",
    description: "Group, total and pivot your data into a summary.",
    Form: AggregateForm,
  },
  {
    key: "clean",
    label: "Clean",
    icon: Eraser,
    title: "Clean data",
    description: "Trim, change case, fill blanks and standardize values.",
    Form: CleanForm,
  },
  {
    key: "regex",
    label: "Regex",
    icon: Regex,
    title: "Regex search",
    description: "Find pattern matches across one or more datasets.",
    Form: RegexForm,
  },
  {
    key: "ai",
    label: "Ask AI",
    icon: Sparkles,
    title: "Ask AI",
    description: "Ask questions about the table you are viewing.",
    Form: AiForm,
  },
];

export function OperationsPanel() {
  const [activeKey, setActiveKey] = useState(OPERATIONS[0].key);
  const active = OPERATIONS.find((op) => op.key === activeKey) ?? OPERATIONS[0];
  const ActiveForm = active.Form;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="scroll-slim flex-none overflow-y-auto px-3 pt-3">
        <div className="grid grid-cols-4 gap-1">
          {OPERATIONS.map((operation) => {
            const Icon = operation.icon;
            const selected = operation.key === activeKey;
            return (
              <button
                key={operation.key}
                type="button"
                onClick={() => setActiveKey(operation.key)}
                aria-pressed={selected}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg border px-1 py-2 transition-colors",
                  selected
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-transparent text-muted-foreground hover:border-border hover:bg-muted/60 hover:text-foreground",
                )}
                title={operation.title}
              >
                <Icon className="h-4 w-4" />
                <span className="w-full truncate text-center text-[10px] font-medium leading-tight">
                  {operation.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-none px-3 pb-2 pt-3">
        <h2 className="text-sm font-semibold text-foreground">
          {active.title}
        </h2>
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
          {active.description}
        </p>
      </div>

      <div className="scroll-slim min-h-0 flex-1 overflow-y-auto border-t border-border px-3 py-3">
        <ActiveForm key={active.key} />
      </div>
    </div>
  );
}
