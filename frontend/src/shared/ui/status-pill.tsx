import { cn } from '@/shared/lib';

export function StatusPill({
  label,
  value,
  tone = 'muted',
}: {
  label: string;
  value: string | number;
  tone?: 'muted' | 'primary';
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium',
        tone === 'primary'
          ? 'border-primary/30 bg-primary/10 text-primary'
          : 'border-border bg-muted/50 text-muted-foreground',
      )}
    >
      <span className="text-[10px] uppercase tracking-wide opacity-70">{label}</span>
      <span className="numeric text-foreground">{value}</span>
    </span>
  );
}
