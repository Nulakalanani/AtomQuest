import { motion } from "framer-motion";

export function WeightageGauge({ total }: { total: number }) {
  const pct = Math.max(0, Math.min(total, 150));
  const color =
    total === 100 ? "var(--color-success)" :
    total > 100   ? "var(--color-destructive)" :
                    "var(--color-warning)";
  const status =
    total === 100 ? "Perfect — totals 100%" :
    total > 100   ? `${total}% — over by ${total - 100}%` :
                    `${total}% — ${100 - total}% remaining`;

  return (
    <div className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-card">
      <div className="relative h-16 w-16 shrink-0">
        <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--color-muted)" strokeWidth="3" />
          <motion.circle
            cx="18" cy="18" r="15.9" fill="none" stroke={color} strokeWidth="3"
            strokeLinecap="round" strokeDasharray="100 100"
            initial={{ strokeDashoffset: 100 }}
            animate={{ strokeDashoffset: 100 - Math.min(pct, 100) }}
            transition={{ duration: 0.4 }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center font-display text-sm font-semibold">
          {total}%
        </div>
      </div>
      <div className="min-w-0">
        <div className="font-display text-sm font-semibold">Total Weightage</div>
        <div className="text-xs text-muted-foreground">{status}</div>
      </div>
    </div>
  );
}
