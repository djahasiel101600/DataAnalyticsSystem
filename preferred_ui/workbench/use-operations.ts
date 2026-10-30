import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { TableData } from "@/lib/data/types";
import { useWorkbench } from "@/store/workbench";

interface OperationOutcome {
  result: TableData;
  summary?: string;
}

/**
 * Runs an operation, pushes the result into the workbench and surfaces the outcome.
 * Kept in one place so every operation reports success and failure the same way.
 */
export function useOperation() {
  const { applyResult } = useWorkbench();
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const execute = useCallback(
    (label: string, operation: () => OperationOutcome) => {
      setError(null);
      setRunning(true);
      try {
        const outcome = operation();
        if (outcome.result.columns.length === 0) {
          setError("That produced no columns. Check the columns you selected.");
          return;
        }
        applyResult(outcome.result, label);
        if (outcome.summary) toast.success(outcome.summary, { duration: 4500 });
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "Something went wrong.";
        setError(message);
        toast.error(message);
      } finally {
        setRunning(false);
      }
    },
    [applyResult],
  );

  return { error, setError, running, execute };
}
