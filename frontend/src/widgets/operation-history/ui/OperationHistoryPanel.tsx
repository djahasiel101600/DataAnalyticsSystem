import type { OperationHistoryEntry } from "@/app/store/operation-history";
import { Button } from "@/shared/ui/button";

interface OperationHistoryPanelProps {
  entries: OperationHistoryEntry[];
  currentOperationId: string | null;
  onRestore: (id: string) => void;
}

function displayValue(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

export function OperationHistoryPanel({
  entries,
  currentOperationId,
  onRestore,
}: OperationHistoryPanelProps) {
  if (entries.length === 0) return null;

  return (
    <details className="mx-2 flex-none rounded-md border border-border bg-card/60">
      <summary className="cursor-pointer px-3 py-2 text-xs font-medium">
        Operations history · {entries.length}
      </summary>
      <ol className="max-h-72 space-y-1 overflow-y-auto border-t border-border p-2">
        {[...entries].reverse().map((entry, reverseIndex) => {
          const isCurrent = entry.id === currentOperationId;
          const previewColumns = entry.result.columns.slice(0, 6);
          const previewRows = entry.result.rows.slice(0, 5);
          const executionOrder = entries.length - reverseIndex;

          return (
            <li
              key={entry.id}
              className="rounded border border-border/70 px-2 py-1.5"
            >
              <details>
                <summary className="flex cursor-pointer flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
                  <span className="text-muted-foreground">
                    #{executionOrder}
                  </span>
                  <span className="font-medium">{entry.name}</span>
                  {isCurrent && (
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
                      Current state
                    </span>
                  )}
                  <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">
                    {entry.result.rows.length.toLocaleString()} rows ·{" "}
                    {entry.result.columns.length.toLocaleString()} columns
                  </span>
                </summary>
                <div className="mt-2 space-y-2 border-t border-border/70 pt-2">
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(entry.timestamp).toLocaleString()}
                  </p>
                  {entry.config && Object.keys(entry.config).length > 0 && (
                    <details>
                      <summary className="cursor-pointer text-[10px] font-medium">
                        Configuration
                      </summary>
                      <pre className="mt-1 max-h-32 overflow-auto rounded bg-muted/50 p-2 text-[10px]">
                        {JSON.stringify(entry.config, null, 2)}
                      </pre>
                    </details>
                  )}
                  <div className="overflow-auto">
                    <p className="mb-1 text-[10px] font-medium">Result preview</p>
                    {previewColumns.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground">
                        No columns in this result.
                      </p>
                    ) : (
                      <table className="min-w-full border-collapse text-left text-[10px]">
                        <thead>
                          <tr>
                            {previewColumns.map((column) => (
                              <th
                                key={column}
                                className="border border-border bg-muted/50 px-1.5 py-1 font-medium"
                              >
                                {column}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewRows.map((row, rowIndex) => (
                            <tr key={rowIndex}>
                              {previewColumns.map((column) => (
                                <td
                                  key={column}
                                  className="max-w-48 truncate border border-border px-1.5 py-1"
                                  title={displayValue(row[column])}
                                >
                                  {displayValue(row[column])}
                                </td>
                              ))}
                            </tr>
                          ))}
                          {previewRows.length === 0 && (
                            <tr>
                              <td
                                colSpan={previewColumns.length}
                                className="border border-border px-1.5 py-1 text-muted-foreground"
                              >
                                No rows in this result.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    )}
                    {entry.result.columns.length > previewColumns.length && (
                      <p className="mt-1 text-[9px] text-muted-foreground">
                        Showing {previewColumns.length} of{" "}
                        {entry.result.columns.length} columns and up to 5 rows.
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-[10px]"
                    disabled={isCurrent}
                    onClick={() => onRestore(entry.id)}
                  >
                    {isCurrent ? "Current result" : "Restore this result"}
                  </Button>
                </div>
              </details>
            </li>
          );
        })}
      </ol>
    </details>
  );
}
