import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FormNote, SectionLabel } from "../controls";
import { useWorkbench } from "@/store/workbench";

const SUGGESTIONS = [
  "Summarize this table in a few lines.",
  "Which columns should I use to join these two files?",
  "What data quality problems should I fix first?",
  "Suggest a pivot that would be useful here.",
];

const SAMPLE_ROWS = 5;

export function AiForm() {
  const { result, activeDataset, datasets, selectDataset, resultLabel } =
    useWorkbench();
  const [question, setQuestion] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const table =
    result ??
    (activeDataset
      ? { columns: activeDataset.columns, rows: activeDataset.rows }
      : null);
  const label = result
    ? (resultLabel ?? "current result")
    : (activeDataset?.name ?? "no table");
  const columns = table?.columns ?? [];
  const rows = table?.rows ?? [];

  const ask = async (text: string) => {
    const prompt = text.trim();
    if (!prompt || !table) return;
    setLoading(true);
    setError(null);
    setReply(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        "ai-data-qa",
        {
          body: {
            question: prompt,
            columns,
            sampleRows: rows.slice(0, SAMPLE_ROWS),
            rowCount: rows.length,
            tableLabel: label,
          },
        },
      );

      const message =
        (data as { error?: string } | null)?.error ??
        (invokeError
          ? "The AI service could not be reached. Try again."
          : null);

      if (message) {
        setError(message);
        toast.error(message);
        return;
      }

      const answer = (data as { reply?: string } | null)?.reply;
      if (!answer) {
        setError("The AI returned an empty answer.");
        return;
      }
      setReply(answer);
    } catch {
      setError("The AI service could not be reached. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 rounded-lg border border-primary/25 bg-primary/5 p-2.5">
        <Sparkles className="mt-0.5 h-3.5 w-3.5 flex-none text-primary" />
        <p className="text-[11px] leading-snug text-muted-foreground">
          Ask about the table you are viewing. The column names and the first{" "}
          {SAMPLE_ROWS} rows are sent to answer; nothing else leaves this
          browser.
        </p>
      </div>

      {table ? (
        <p className="text-[11px] text-muted-foreground">
          Context: <span className="font-medium text-foreground">{label}</span>{" "}
          · {rows.length.toLocaleString()} rows · {columns.length} columns
        </p>
      ) : (
        <FormNote>Upload a file or run an operation first.</FormNote>
      )}

      {result && datasets.length > 0 && (
        <div className="space-y-1.5">
          <SectionLabel>Ask about a dataset instead</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {datasets.map((dataset) => (
              <button
                key={dataset.id}
                type="button"
                onClick={() => selectDataset(dataset.id)}
                className="max-w-full truncate rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-foreground"
                title={dataset.name}
              >
                {dataset.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <SectionLabel>Question</SectionLabel>
        <textarea
          className="min-h-[80px] w-full resize-y rounded-lg border border-input bg-background px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="e.g. Which rows look like duplicates?"
          disabled={loading}
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => setQuestion(suggestion)}
            className="rounded-md border border-border bg-background px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            {suggestion}
          </button>
        ))}
      </div>

      {error && <FormNote tone="error">{error}</FormNote>}

      <Button
        type="button"
        size="sm"
        className="w-full"
        onClick={() => ask(question)}
        disabled={loading || !question.trim() || !table}
      >
        {loading ? (
          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
        ) : (
          <Sparkles className="mr-2 h-3.5 w-3.5" />
        )}
        {loading ? "Thinking…" : "Ask"}
      </Button>

      {reply && (
        <div className="animate-rise whitespace-pre-wrap rounded-lg border border-border bg-muted/40 p-3 text-xs leading-relaxed text-foreground">
          {reply}
        </div>
      )}
    </div>
  );
}
