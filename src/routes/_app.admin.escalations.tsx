import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, PlayCircle, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";

export function Escalations() {
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);

  const { data: logs = [], refetch } = useQuery({
    queryKey: ["escalations"],
    queryFn: async () =>
      (await supabase.from("escalation_logs").select("*").order("triggered_at", { ascending: false })).data ?? [],
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () =>
      (await supabase.from("profiles").select("id, name, email").order("name")).data ?? [],
  });

  const nameOf = (id: string | null) =>
    (profiles as any[]).find((p) => p.id === id)?.name ?? "—";
  const emailOf = (id: string | null) =>
    (profiles as any[]).find((p) => p.id === id)?.email ?? "";

  const runCheck = async () => {
    setRunning(true);
    try {
      // Call the server-side function which is comprehensive and idempotent
      const { data, error } = await supabase.rpc("run_escalation_check");
      if (error) throw error;
      const result = data as any;
      if (result.inserted === 0) {
        toast.success("Escalation check complete — no new violations");
      } else {
        toast.success(`Logged ${result.inserted} new escalation(s)`);
      }
      qc.invalidateQueries({ queryKey: ["escalations"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRunning(false);
    }
  };

  const resolve = async (id: string) => {
    const { error } = await supabase
      .from("escalation_logs")
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Resolved");
    qc.invalidateQueries({ queryKey: ["escalations"] });
  };

  const resolveAll = async () => {
    const openIds = open.map((l: any) => l.id);
    if (!openIds.length) return;
    const { error } = await supabase
      .from("escalation_logs")
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .in("id", openIds);
    if (error) return toast.error(error.message);
    toast.success(`Resolved ${openIds.length} escalation(s)`);
    qc.invalidateQueries({ queryKey: ["escalations"] });
  };

  const LEVEL_LABEL: Record<number, string> = {
    1: "Employee",
    2: "Manager",
    3: "HR",
  };
  const LEVEL_COLOR: Record<number, string> = {
    1: "bg-warning/20 text-warning-foreground border-warning/30",
    2: "bg-destructive/20 text-destructive-foreground border-destructive/30",
    3: "bg-destructive border-destructive text-destructive-foreground",
  };

  const open = (logs as any[]).filter((l) => !l.resolved);
  const closed = (logs as any[]).filter((l) => l.resolved);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <AlertTriangle className="h-7 w-7" /> Escalations
        </h1>
        <div className="flex gap-2">
          {open.length > 0 && (
            <Button variant="outline" onClick={resolveAll}>
              <CheckCircle2 className="mr-1 h-4 w-4" /> Resolve All
            </Button>
          )}
          <Button onClick={runCheck} disabled={running}>
            {running ? (
              <><RefreshCw className="mr-1 h-4 w-4 animate-spin" /> Checking…</>
            ) : (
              <><PlayCircle className="mr-1 h-4 w-4" /> Run Escalation Check</>
            )}
          </Button>
        </div>
      </div>

      <Card className="border-0 shadow-card">
        <CardHeader><CardTitle>Escalation rules</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>• <strong className="text-foreground">Level 1 (Employee):</strong> No goals submitted 7+ days after goal-setting cycle opened.</p>
          <p>• <strong className="text-foreground">Level 2 (Manager):</strong> Goals submitted but not approved within 5 days.</p>
          <p>• <strong className="text-foreground">Level 1 (Employee):</strong> No quarterly check-in 3+ days after the check-in window opened.</p>
          <p className="pt-1 text-xs">Duplicate open violations are skipped automatically. Click "Run Escalation Check" to re-evaluate all rules.</p>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Open escalations
            {open.length > 0 && <Badge variant="destructive">{open.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!open.length && (
            <p className="text-sm text-muted-foreground">No open escalations 🎉</p>
          )}
          <div className="space-y-2">
            {open.map((l: any) => (
              <div
                key={l.id}
                className="flex items-start justify-between rounded-lg border border-destructive/30 bg-destructive/5 p-3 gap-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="text-sm font-medium">{l.reason}</div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{nameOf(l.user_id)}</span>
                    {emailOf(l.user_id) && <span className="opacity-60">· {emailOf(l.user_id)}</span>}
                    <span>· {format(new Date(l.triggered_at), "MMM d, HH:mm")}</span>
                    {l.auto_triggered && <Badge variant="outline" className="text-[10px]">Auto</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    className={`border text-[10px] ${LEVEL_COLOR[l.escalation_level ?? 1]}`}
                  >
                    {LEVEL_LABEL[l.escalation_level ?? 1]}
                  </Badge>
                  <Button size="sm" variant="outline" onClick={() => resolve(l.id)}>
                    <CheckCircle2 className="mr-1 h-4 w-4" /> Resolve
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-card">
        <CardHeader>
          <CardTitle>Resolved ({closed.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {!closed.length && <p className="text-sm text-muted-foreground">None yet.</p>}
          <div className="space-y-2">
            {closed.slice(0, 30).map((l: any) => (
              <div key={l.id} className="flex items-center justify-between rounded-lg border p-3 text-sm gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{l.reason}</div>
                  <div className="text-xs text-muted-foreground">
                    {nameOf(l.user_id)} · Triggered {format(new Date(l.triggered_at), "MMM d")}
                    {l.resolved_at && ` · Resolved ${format(new Date(l.resolved_at), "MMM d")}`}
                  </div>
                </div>
                <Badge variant="secondary">Resolved</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
