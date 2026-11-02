import { describe, expect, it } from "vitest";
import {
  appendOperationHistory,
  createOperationHistoryEntry,
  MAX_OPERATION_HISTORY,
} from "./operation-history";

describe("operation history", () => {
  it("keeps operation results by reference and snapshots their configuration", () => {
    const result = { columns: ["name"], rows: [{ name: "Ada" }] };
    const config = { sourceId: "source-1" };
    const entry = createOperationHistoryEntry(result, {
      name: "Lookup",
      config,
    });

    config.sourceId = "source-2";
    expect(entry.result).toBe(result);
    expect(entry.config?.sourceId).toBe("source-1");
    expect(entry.id).toBeTruthy();
    expect(Number.isNaN(Date.parse(entry.timestamp))).toBe(false);
  });

  it("bounds the timeline while retaining the newest operations", () => {
    const entries = Array.from({ length: MAX_OPERATION_HISTORY + 1 }, (_, index) =>
      createOperationHistoryEntry(
        { columns: [], rows: [] },
        { name: `Operation ${index}` },
      ),
    );
    const history = entries.reduce(
      (current, entry) => appendOperationHistory(current, entry),
      [] as typeof entries,
    );

    expect(history).toHaveLength(MAX_OPERATION_HISTORY);
    expect(history[0]).toBe(entries[1]);
    expect(history[history.length - 1]).toBe(entries[entries.length - 1]);
  });
});
