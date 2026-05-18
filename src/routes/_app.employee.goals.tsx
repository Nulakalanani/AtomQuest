import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { WeightageGauge } from "@/components/WeightageGauge";
import { Plus, Trash2, ChevronRight, ChevronLeft, Lock, Send, Info } from "lucide-react";
import { toast } from "sonner";
import type { UoMType } from "@/lib/scoreEngine";

type Draft = {
  id?: string;
  thrust_area: string;
  title: string;
  description: string;
  uom_type: UoMType;
  target: number;
  weightage: number;
  // Per-quarter planned targets
  planned_q1?: number;
  planned_q2?: number;
  planned_q3?: number;
  planned_q4?: number;
  status?: string;
  locked?: boolean;
  is_shared?: boolean;
  return_comment?: string | null;
};

const empty: Draft = {
  thrust_area: "", title: "", description: "",
  uom_type: "MIN", target: 0, weightage: 0,
  planned_q1: 0, planned_q2: 0, planned_q3: 0, planned_q4: 0,
};

function evenSplit(target: number): Pick<Draft,"planned_q1"|"planned_q2"|"planned_q3"|"planned_q4"> {
  const q = Math.round((target / 4) * 100) / 100;
  return { planned_q1: q, planned_q2: q, planned_q3: q, planned_q4: q };
}

export function GoalSheetWizard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [goals, setGoals] = useState<Draft[]>([]);
  const [busy, setBusy] = useState(false);

  const { data: thrustAreas = [] } = useQuery({
    queryKey: ["thrust"],
    queryFn: async () =>
      (await supabase.from("thrust_areas").select("*").eq("active", true).order("name")).data ?? [],
  });

  const { data: existing = [] } = useQuery({
    queryKey: ["my-goals-edit", user?.id],
    enabled: !!user,
    queryFn: async () =>
      (await supabase.from("goals").select("*").eq("employee_id", user!.id).order("created_at")).data ?? [],
  });

  const { data: activeCycle } = useQuery({
    queryKey: ["active-cycle"],
    queryFn: async () =>
      (await supabase.from("cycles").select("*").eq("is_active", true).maybeSingle()).data,
  });

  const goalSettingOpen = activeCycle?.phase === "GOAL_SETTING";

  useEffect(() => {
    if (existing.length && goals.length === 0) {
      setGoals(
        existing.map((g: any) => ({
          ...g,
          planned_q1: g.planned_q1 ?? Number(g.target) / 4,
          planned_q2: g.planned_q2 ?? Number(g.target) / 4,
          planned_q3: g.planned_q3 ?? Number(g.target) / 4,
          planned_q4: g.planned_q4 ?? Number(g.target) / 4,
        }))
      );
    }
  }, [existing]);

  const totalWeight = useMemo(
    () => goals.reduce((s, g) => s + Number(g.weightage || 0), 0),
    [goals]
  );
  const allLocked = goals.length > 0 && goals.every((g) => g.locked);
  const someReturned = goals.some((g) => g.status === "RETURNED");

  const addGoal = () => {
    if (goals.length >= 8) return toast.error("Maximum 8 goals allowed");
    setGoals([...goals, { ...empty }]);
  };

  const removeGoal = (i: number) => setGoals(goals.filter((_, idx) => idx !== i));

  const updateGoal = (i: number, patch: Partial<Draft>) => {
    setGoals(goals.map((g, idx) => {
      if (idx !== i) return g;
      const updated = { ...g, ...patch };
      // Auto-split planned targets when target changes
      if ("target" in patch && updated.uom_type !== "ZERO") {
        const split = evenSplit(Number(patch.target));
        return { ...updated, ...split };
      }
      return updated;
    }));
  };

  const validate = (final: boolean): string | null => {
    if (!goals.length) return "Add at least 1 goal";
    if (goals.length > 8) return "Maximum 8 goals";
    const titles = new Set<string>();
    for (const g of goals) {
      if (!g.thrust_area) return "Each goal needs a thrust area";
      if (!g.title.trim()) return "Each goal needs a title";
      if (titles.has(g.title.trim().toLowerCase())) return `Duplicate goal title: "${g.title}"`;
      titles.add(g.title.trim().toLowerCase());
      if (Number(g.weightage) < 10) return `"${g.title || "A goal"}": weightage must be ≥ 10%`;
      if (Number(g.weightage) > 100) return `"${g.title}": weightage cannot exceed 100%`;
      if (g.uom_type !== "ZERO" && Number(g.target) <= 0) return `"${g.title}": target must be > 0`;
    }
    if (final && totalWeight !== 100)
      return `Total weightage must be exactly 100% (currently ${totalWeight}%)`;
    return null;
  };

  const saveDraft = async () => {
    if (!user) return;
    const err = validate(false);
    if (err) return toast.error(err);
    setBusy(true);
    try {
      const keptIds = goals.filter((g) => g.id).map((g) => g.id!);
      const toDelete = (existing as any[])
        .filter((g) => !g.locked && !g.is_shared && !keptIds.includes(g.id))
        .map((g) => g.id);
      if (toDelete.length) await supabase.from("goals").delete().in("id", toDelete);

      for (const g of goals) {
        if (g.locked) continue;
        if (g.is_shared && g.id) {
          // Shared goals: only weightage and per-quarter plans are editable
          await supabase.from("goals").update({
            weightage: Number(g.weightage),
            planned_q1: Number(g.planned_q1),
            planned_q2: Number(g.planned_q2),
            planned_q3: Number(g.planned_q3),
            planned_q4: Number(g.planned_q4),
          }).eq("id", g.id);
          continue;
        }
        const payload = {
          employee_id: user.id,
          thrust_area: g.thrust_area,
          title: g.title,
          description: g.description,
          uom_type: g.uom_type,
          target: Number(g.target),
          weightage: Number(g.weightage),
          planned_q1: Number(g.planned_q1 ?? Number(g.target) / 4),
          planned_q2: Number(g.planned_q2 ?? Number(g.target) / 4),
          planned_q3: Number(g.planned_q3 ?? Number(g.target) / 4),
          planned_q4: Number(g.planned_q4 ?? Number(g.target) / 4),
        };
        if (g.id) {
          await supabase.from("goals").update(payload).eq("id", g.id);
        } else {
          await supabase.from("goals").insert({ ...payload, status: "DRAFT" });
        }
      }
      toast.success("Draft saved");
      qc.invalidateQueries({ queryKey: ["my-goals-edit"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    const err = validate(true);
    if (err) return toast.error(err);
    await saveDraft();
    const { error } = await supabase.from("goals")
      .update({ status: "SUBMITTED" })
      .eq("employee_id", user!.id)
      .neq("status", "APPROVED")
      .eq("locked", false);
    if (error) return toast.error(error.message);
    toast.success("Submitted for approval ✓");
    qc.invalidateQueries({ queryKey: ["my-goals-edit"] });
    qc.invalidateQueries({ queryKey: ["my-goals"] });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Goal Sheet</h1>
        <p className="text-muted-foreground">
          Step {step} of 3 —{" "}
          {step === 1 ? "Thrust Areas" : step === 2 ? "Goal Details" : "Review & Submit"}
        </p>
        <div className="mt-3 flex gap-1">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-1 flex-1 rounded ${s <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>
      </div>

      {allLocked && (
        <div className="rounded-lg border border-accent bg-accent/10 px-4 py-3 text-sm">
          <Lock className="mr-2 inline h-4 w-4" /> Your goals are approved and locked. Contact admin to make changes.
        </div>
      )}

      {someReturned && goals.find((g) => g.status === "RETURNED" && g.return_comment) && (
        <div className="rounded-lg border border-warning bg-warning/10 px-4 py-3 text-sm space-y-1">
          <div className="font-semibold">Manager returned your goals for revision:</div>
          <div>{goals.find((g) => g.status === "RETURNED")?.return_comment}</div>
        </div>
      )}

      {/* STEP 1 */}
      {step === 1 && (
        <Card className="border-0 shadow-card">
          <CardHeader><CardTitle>Choose your thrust areas</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Available thrust areas are configured by the admin. Pick one for each goal in the next step.
            </p>
            <div className="flex flex-wrap gap-2">
              {(thrustAreas as any[]).map((t) => (
                <Badge key={t.id} variant="secondary" className="text-sm">{t.name}</Badge>
              ))}
            </div>
            {!(thrustAreas as any[]).length && (
              <p className="text-sm text-muted-foreground italic">No thrust areas configured yet. Ask your admin.</p>
            )}
            <div className="flex justify-end pt-4">
              <Button onClick={() => setStep(2)}>
                Continue <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="sticky top-0 z-10 -mx-4 bg-background/95 px-4 py-2 backdrop-blur md:-mx-8 md:px-8">
            <WeightageGauge total={totalWeight} />
          </div>

          {goals.map((g, i) => {
            const editable = !g.locked && !g.is_shared;
            return (
              <Card
                key={i}
                className={`border-0 shadow-card ${g.locked ? "opacity-70" : ""} ${g.is_shared ? "border-l-4 border-l-accent" : ""}`}
              >
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between">
                    <div className="font-display font-semibold">
                      Goal {i + 1}
                      {g.locked && <Lock className="ml-1 inline h-3 w-3" />}
                      {g.is_shared && <Badge variant="secondary" className="ml-2">Shared from Admin</Badge>}
                      {g.status === "RETURNED" && <Badge variant="destructive" className="ml-2">Returned</Badge>}
                      {g.status === "SUBMITTED" && <Badge className="ml-2">Pending Approval</Badge>}
                    </div>
                    {editable && (
                      <Button size="icon" variant="ghost" onClick={() => removeGoal(i)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <Label>Thrust Area</Label>
                      <Select value={g.thrust_area} onValueChange={(v) => updateGoal(i, { thrust_area: v })} disabled={!editable}>
                        <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                        <SelectContent>
                          {(thrustAreas as any[]).map((t) => (
                            <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Goal Title</Label>
                      <Input value={g.title} onChange={(e) => updateGoal(i, { title: e.target.value })} disabled={!editable} maxLength={120} placeholder="Clear, measurable goal title" />
                    </div>
                  </div>

                  <div>
                    <Label>Description</Label>
                    <Textarea value={g.description} onChange={(e) => updateGoal(i, { description: e.target.value })} disabled={!editable} maxLength={500} rows={2} placeholder="Additional context…" />
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <Label>UoM Type</Label>
                      <RadioGroup value={g.uom_type} onValueChange={(v) => updateGoal(i, { uom_type: v as UoMType })} disabled={!editable} className="mt-2 grid grid-cols-2 gap-1 text-xs">
                        {(["MIN","MAX","TIMELINE","ZERO"] as UoMType[]).map((u) => (
                          <Label key={u} className="flex cursor-pointer items-center gap-2 rounded border px-2 py-1.5">
                            <RadioGroupItem value={u} /> {u}
                          </Label>
                        ))}
                      </RadioGroup>
                    </div>
                    <div>
                      <Label>Annual Target {g.uom_type === "TIMELINE" && "(days)"}</Label>
                      <Input
                        type="number"
                        value={g.target || ""}
                        onChange={(e) => updateGoal(i, { target: Number(e.target.value) })}
                        disabled={!editable || g.uom_type === "ZERO"}
                        min={g.uom_type === "ZERO" ? 0 : 0.01}
                        step="any"
                      />
                      {g.uom_type === "ZERO" && (
                        <p className="mt-1 text-[10px] text-muted-foreground">Zero-based — target locked to 0</p>
                      )}
                    </div>
                    <div>
                      <Label>Weightage (%)</Label>
                      <Input
                        type="number"
                        value={g.weightage || ""}
                        onChange={(e) => updateGoal(i, { weightage: Number(e.target.value) })}
                        disabled={g.locked}
                        min={10}
                        max={100}
                      />
                    </div>
                  </div>

                  {/* Per-quarter planned targets */}
                  {g.uom_type !== "ZERO" && (
                    <div>
                      <div className="flex items-center gap-1 mb-2">
                        <Label className="text-xs">Quarterly Planned Milestones</Label>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {(["planned_q1","planned_q2","planned_q3","planned_q4"] as const).map((key, qi) => (
                          <div key={key}>
                            <Label className="text-[10px] text-muted-foreground">Q{qi+1}</Label>
                            <Input
                              type="number"
                              value={(g as any)[key] ?? ""}
                              onChange={(e) => updateGoal(i, { [key]: Number(e.target.value) })}
                              disabled={!editable}
                              step="any"
                              className="h-8 text-xs"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={addGoal} disabled={goals.length >= 8}>
              <Plus className="mr-1 h-4 w-4" /> Add Goal ({goals.length}/8)
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setStep(1)}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Back
              </Button>
              <Button variant="secondary" onClick={saveDraft} disabled={busy}>
                Save Draft
              </Button>
              <Button onClick={() => setStep(3)} disabled={!goals.length}>
                Review <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <Card className="border-0 shadow-card">
          <CardHeader><CardTitle>Review & Submit</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <WeightageGauge total={totalWeight} />

            <div className="space-y-2">
              {goals.map((g, i) => (
                <div key={i} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <div className="font-medium">{i + 1}. {g.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {g.thrust_area} · {g.uom_type} · target {g.target}
                      </div>
                    </div>
                    <Badge>{g.weightage}%</Badge>
                  </div>
                  {g.uom_type !== "ZERO" && (
                    <div className="mt-2 grid grid-cols-4 gap-2 text-[11px] text-muted-foreground">
                      {(["planned_q1","planned_q2","planned_q3","planned_q4"] as const).map((k,qi)=>(
                        <div key={k}>Q{qi+1}: <span className="font-medium text-foreground">{(g as any)[k] ?? "—"}</span></div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {!goalSettingOpen && (
              <div className="rounded-lg border border-warning bg-warning/10 px-4 py-3 text-sm">
                Goal setting window is not currently open. You can save your draft but cannot submit yet.
              </div>
            )}

            {validate(true) && totalWeight !== 100 && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                Total weightage is {totalWeight}%. Adjust goals so they sum to exactly 100% before submitting.
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={() => setStep(2)}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Edit
              </Button>
              <Button
                onClick={submit}
                disabled={busy || totalWeight !== 100 || !goalSettingOpen}
                title={!goalSettingOpen ? "Goal setting window is closed" : totalWeight !== 100 ? `Weightage must total 100% (currently ${totalWeight}%)` : ""}
              >
                <Send className="mr-1 h-4 w-4" /> Submit for Approval
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
