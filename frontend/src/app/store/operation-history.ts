import type { DataRow } from "@/entities/dataset";

export interface OperationResult {
  columns: string[];
  rows: DataRow[];
}

export interface OperationMetadata {
  name: string;
  configKey?: string;
  config?: Record<string, unknown>;
  datasetId?: string;
}

export interface OperationHistoryEntry extends OperationMetadata {
  id: string;
  timestamp: string;
  result: OperationResult;
}

let operationSequence = 0;
export const MAX_OPERATION_HISTORY = 100;

export function createOperationHistoryEntry(
  result: OperationResult,
  metadata: OperationMetadata,
): OperationHistoryEntry {
  return {
    ...metadata,
    config: metadata.config ? { ...metadata.config } : undefined,
    id: `operation-${++operationSequence}`,
    timestamp: new Date().toISOString(),
    result,
  };
}

export function appendOperationHistory(
  history: OperationHistoryEntry[],
  entry: OperationHistoryEntry,
): OperationHistoryEntry[] {
  return [...history, entry].slice(-MAX_OPERATION_HISTORY);
}
