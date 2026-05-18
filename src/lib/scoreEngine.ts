export type UoMType = "MIN" | "MAX" | "TIMELINE" | "ZERO";

/**
 * Compute achievement score (0–150) for a goal.
 *  - MIN: higher actual is better. score = min(actual/target * 100, 150)
 *  - MAX: lower actual is better. score = min(target/actual * 100, 150)
 *  - TIMELINE: target = deadline (days from cycle start), achievement = actual completion (days).
 *    On-or-before deadline = 100; each late day deducts 1.
 *  - ZERO: actual must be 0 (e.g. zero defects). 100 if zero else 0.
 */
export function computeScore(
  uom: UoMType,
  target: number,
  achievement: number
): number {
  switch (uom) {
    case "MIN":
      if (target <= 0) return 0;
      return Math.round(Math.min((achievement / target) * 100, 150) * 10) / 10;
    case "MAX":
      if (achievement <= 0) return target > 0 ? 150 : 0;
      return Math.round(Math.min((target / achievement) * 100, 150) * 10) / 10;
    case "TIMELINE":
      if (achievement <= target) return 100;
      return Math.max(0, Math.round((100 - (achievement - target)) * 10) / 10);
    case "ZERO":
      return achievement === 0 ? 100 : 0;
  }
}

export function scoreTier(score: number | null | undefined): {
  label: string;
  color: string;
  bg: string;
  emoji: string;
} {
  if (score == null) return { label: "—", color: "text-muted-foreground", bg: "bg-muted", emoji: "•" };
  if (score >= 100) return { label: "Exceeds", color: "text-foreground", bg: "bg-accent/30 border border-accent", emoji: "💎" };
  if (score >= 80)  return { label: "On Target", color: "text-success-foreground", bg: "bg-success", emoji: "🟢" };
  if (score >= 50)  return { label: "At Risk", color: "text-warning-foreground", bg: "bg-warning", emoji: "🟡" };
  return                  { label: "Off Track", color: "text-destructive-foreground", bg: "bg-destructive", emoji: "🔴" };
}
