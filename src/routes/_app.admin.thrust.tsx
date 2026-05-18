import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";


export function ThrustAdmin() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const { data: items = [] } = useQuery({
    queryKey: ["thrust-admin"], queryFn: async () => (await supabase.from("thrust_areas").select("*").order("name")).data ?? [],
  });
  const add = async () => {
    if (!name.trim()) return;
    const { error } = await supabase.from("thrust_areas").insert({ name: name.trim() });
    if (error) toast.error(error.message); else { setName(""); qc.invalidateQueries({ queryKey: ["thrust-admin"] }); }
  };
  const toggle = async (it: any) => { await supabase.from("thrust_areas").update({ active: !it.active }).eq("id", it.id); qc.invalidateQueries({ queryKey: ["thrust-admin"] }); };
  const del = async (id: string) => { await supabase.from("thrust_areas").delete().eq("id", id); qc.invalidateQueries({ queryKey: ["thrust-admin"] }); };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="font-display text-3xl font-bold">Thrust Areas</h1>
      <Card className="border-0 shadow-card"><CardContent className="p-4 flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New thrust area…" />
        <Button onClick={add}><Plus className="mr-1 h-4 w-4" />Add</Button>
      </CardContent></Card>
      <div className="space-y-2">
        {(items as any[]).map((it) => (
          <div key={it.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
            <div className="font-medium">{it.name}</div>
            <div className="flex items-center gap-3">
              <Switch checked={it.active} onCheckedChange={() => toggle(it)} />
              <Button size="icon" variant="ghost" onClick={() => del(it.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
