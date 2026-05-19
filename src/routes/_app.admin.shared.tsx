import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Share2, Send } from "lucide-react";
import { toast } from "sonner";
import type { UoMType } from "@/lib/scoreEngine";


export function SharedGoals() {
  const qc = useQueryClient();
  const [thrust, setThrust] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [uom, setUom] = useState<UoMType>("MIN");
  const [target, setTarget] = useState<number>(0);
  const [weightage, setWeightage] = useState<number>(20);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const { data: thrustAreas = [] } = useQuery({
    queryKey: ["thrust"],
    queryFn: async () => (await supabase.from("thrust_areas").select("*").eq("active", true).order("name")).data ?? [],
  });
  const { data: employees = [] } = useQuery({
    queryKey: ["all-employees"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "employee");
      const ids = (roles ?? []).map((r: any) => r.user_id);
      if (!ids.length) return [];
      const { data: profs } = await supabase.from("profiles").select("id, name, email").in("id", ids).order("name");
      return profs ?? [];
    },
  });
  const { data: shared = [] } = useQuery({
    queryKey: ["shared-goals"],
    queryFn: async () => (await supabase.from("goals").select("*").eq("is_shared", true).order("created_at", { ascending: false })).data ?? [],
  });

  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const submit = async () => {
    if (!thrust || !title.trim()) return toast.error("Thrust area and title are required");
    if (uom !== "ZERO" && target <= 0) return toast.error("Target must be > 0");
    if (weightage < 10) return toast.error("Weightage must be ≥ 10");
    if (selected.size === 0) return toast.error("Select at least one employee");
    setBusy(true);
    try {
      const ids = Array.from(selected);
      const base = {
        thrust_area: thrust, title, description,
        uom_type: uom,
        target: uom === "ZERO" ? 0 : Number(target),
        weightage: Number(weightage),
        is_shared: true, status: "APPROVED" as const, locked: false,
      };
      const rows = ids.map((employee_id) => ({ ...base, employee_id }));
      const { data: inserted, error: pErr } = await supabase.from("goals")
        .insert(rows).select("id");
      if (pErr) throw pErr;
      if (inserted && inserted.length > 1) {
        const parentId = (inserted[0] as any).id;
        const siblingIds = inserted.slice(1).map((r: any) => r.id);
        const { error: linkErr } = await supabase.from("goals")
          .update({ parent_goal_id: parentId })
          .in("id", siblingIds);
        if (linkErr) throw linkErr;
      }
      toast.success(`Shared goal pushed to ${ids.length} employee(s)`);
      setTitle(""); setDescription(""); setTarget(0); setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["shared-goals"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-2"><Share2 className="h-7 w-7" /> Shared Goals</h1>
        <p className="text-muted-foreground">Cascade a top-down goal to multiple employees. They will see it as read-only (only weightage editable).</p>
      </div>

      <Card className="border-0 shadow-card">
        <CardHeader><CardTitle>Create Shared Goal</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Thrust Area</Label>
              <Select value={thrust} onValueChange={setThrust}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {(thrustAreas as any[]).map((t) => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={2} />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <Label>UoM Type</Label>
              <Select value={uom} onValueChange={(v) => setUom(v as UoMType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["MIN","MAX","TIMELINE","ZERO"] as UoMType[]).map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Target</Label>
              <Input type="number" value={target || ""} onChange={(e) => setTarget(Number(e.target.value))} disabled={uom === "ZERO"} />
            </div>
            <div>
              <Label>Default Weightage (%)</Label>
              <Input type="number" value={weightage || ""} onChange={(e) => setWeightage(Number(e.target.value))} min={10} max={100} />
            </div>
          </div>
          <div>
            <Label>Assign to Employees ({selected.size} selected)</Label>
            <div className="mt-2 grid max-h-64 gap-1 overflow-auto rounded-md border p-3 md:grid-cols-2">
              {(employees as any[]).map((e) => (
                <label key={e.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-muted">
                  <Checkbox checked={selected.has(e.id)} onCheckedChange={() => toggle(e.id)} />
                  <span className="text-sm">{e.name} <span className="text-muted-foreground">· {e.email}</span></span>
                </label>
              ))}
              {!employees.length && <p className="text-sm text-muted-foreground">No employees found.</p>}
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={submit} disabled={busy}><Send className="mr-1 h-4 w-4" /> Push Shared Goal</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-card">
        <CardHeader><CardTitle>Recently Shared</CardTitle></CardHeader>
        <CardContent>
          {!shared.length && <p className="text-sm text-muted-foreground">No shared goals yet.</p>}
          <div className="space-y-2">
            {(shared as any[]).slice(0, 20).map((g) => (
              <div key={g.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <div>
                  <div className="font-medium">{g.title}</div>
                  <div className="text-xs text-muted-foreground">{g.thrust_area} · {g.uom_type} · target {g.target}</div>
                </div>
                <Badge>{g.weightage}%</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
