import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Settings2, PlayCircle, StopCircle } from "lucide-react";
import { format } from "date-fns";

const PHASES = ["GOAL_SETTING","Q1","Q2","Q3","Q4"] as const;
type Phase = typeof PHASES[number];
const PHASE_LABEL: Record<Phase,string> = {
  GOAL_SETTING:"Goal Setting", Q1:"Q1 Check-in", Q2:"Q2 Check-in", Q3:"Q3 Check-in", Q4:"Q4 / Annual",
};
const toDateInput = (d:Date) => d.toISOString().slice(0,10);
const now = new Date();

export function CyclesAdmin() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    year: String(now.getFullYear()),
    phase: "GOAL_SETTING" as Phase,
    opens_at: toDateInput(now),
    closes_at: toDateInput(new Date(now.getTime() + 30*86400000)),
    is_active: false,
  });

  const { data: cycles = [] } = useQuery({
    queryKey: ["all-cycles"],
    queryFn: async () => (await supabase.from("cycles").select("*").order("year",{ascending:false}).order("opens_at")).data ?? [],
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["all-cycles"] });
    qc.invalidateQueries({ queryKey: ["active-cycle"] });
    qc.invalidateQueries({ queryKey: ["cycles"] });
  };

  const toggle = async (c: any) => {
    setBusy(true);
    try {
      if (!c.is_active) await supabase.from("cycles").update({ is_active: false }).neq("id", c.id);
      await supabase.from("cycles").update({ is_active: !c.is_active }).eq("id", c.id);
      toast.success(c.is_active ? "Cycle closed" : "Cycle opened");
      invalidate();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const create = async () => {
    if (!form.year || !form.opens_at || !form.closes_at) return toast.error("All fields required");
    if (new Date(form.closes_at) <= new Date(form.opens_at)) return toast.error("Close date must be after open date");
    setBusy(true);
    try {
      if (form.is_active) await supabase.from("cycles").update({ is_active: false }).neq("id","00000000-0000-0000-0000-000000000000");
      const { error } = await supabase.from("cycles").insert({
        year: parseInt(form.year), phase: form.phase,
        opens_at: new Date(form.opens_at).toISOString(),
        closes_at: new Date(form.closes_at).toISOString(),
        is_active: form.is_active,
      });
      if (error) throw error;
      toast.success("Cycle created");
      setOpen(false);
      invalidate();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const deleteCycle = async (id: string, isActive: boolean) => {
    if (isActive) return toast.error("Close the cycle before deleting it");
    setBusy(true);
    try {
      const { error } = await supabase.from("cycles").delete().eq("id", id);
      if (error) throw error;
      toast.success("Deleted");
      invalidate();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const byYear: Record<number, any[]> = {};
  for (const c of cycles as any[]) {
    if (!byYear[c.year]) byYear[c.year] = [];
    byYear[c.year].push(c);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2"><Settings2 className="h-7 w-7" /> Cycle Configuration</h1>
          <p className="text-muted-foreground">One active cycle controls what employees and managers can do right now.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-1 h-4 w-4" /> New Cycle</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create new cycle</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Year</Label>
                  <Input type="number" value={form.year} onChange={(e)=>setForm({...form,year:e.target.value})} min={2020} max={2099} />
                </div>
                <div>
                  <Label>Phase</Label>
                  <Select value={form.phase} onValueChange={(v)=>setForm({...form,phase:v as Phase})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PHASES.map((p)=><SelectItem key={p} value={p}>{PHASE_LABEL[p]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Opens on</Label>
                  <Input type="date" value={form.opens_at} onChange={(e)=>setForm({...form,opens_at:e.target.value})} />
                </div>
                <div>
                  <Label>Closes on</Label>
                  <Input type="date" value={form.closes_at} onChange={(e)=>setForm({...form,closes_at:e.target.value})} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input type="checkbox" checked={form.is_active} onChange={(e)=>setForm({...form,is_active:e.target.checked})} className="rounded" />
                Activate immediately (closes all other cycles)
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={()=>setOpen(false)}>Cancel</Button>
                <Button onClick={create} disabled={busy}>Create</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {Object.entries(byYear).sort(([a],[b])=>Number(b)-Number(a)).map(([year, cs])=>(
        <Card key={year} className="border-0 shadow-card">
          <CardHeader><CardTitle className="font-display text-base">{year}</CardTitle></CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-xs uppercase text-muted-foreground">
                <tr className="text-left">
                  <th className="p-3">Phase</th><th className="p-3">Opens</th><th className="p-3">Closes</th><th className="p-3">Status</th><th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {cs.map((c:any)=>(
                  <tr key={c.id} className="border-t">
                    <td className="p-3 font-medium">{PHASE_LABEL[c.phase as Phase] ?? c.phase}</td>
                    <td className="p-3 text-xs text-muted-foreground">{format(new Date(c.opens_at),"MMM d, yyyy")}</td>
                    <td className="p-3 text-xs text-muted-foreground">{format(new Date(c.closes_at),"MMM d, yyyy")}</td>
                    <td className="p-3"><Badge variant={c.is_active?"default":"secondary"}>{c.is_active?"● Active":"Upcoming"}</Badge></td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" disabled={busy} onClick={()=>toggle(c)}>
                          {c.is_active ? <><StopCircle className="mr-1 h-3 w-3"/>Close</> : <><PlayCircle className="mr-1 h-3 w-3"/>Open</>}
                        </Button>
                        {!c.is_active && (
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" disabled={busy} onClick={()=>deleteCycle(c.id,c.is_active)}>
                            Delete
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ))}
      {Object.keys(byYear).length===0 && (
        <Card className="border-0 shadow-card">
          <CardContent className="p-10 text-center text-muted-foreground">No cycles yet. Create one to open goal setting for employees.</CardContent>
        </Card>
      )}
    </div>
  );
}
