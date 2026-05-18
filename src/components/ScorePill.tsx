import { scoreTier } from "@/lib/scoreEngine";
import { cn } from "@/lib/utils";

export function ScorePill({ score, className }: { score: number | null | undefined; className?: string }) {
  const t = scoreTier(score);
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", t.bg, t.color, className)}>
      <span>{t.emoji}</span>
      <span>{score == null ? "—" : `${score.toFixed(1)}%`}</span>
      <span className="opacity-70">· {t.label}</span>
    </span>
  );
}
