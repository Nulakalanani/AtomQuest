import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";


export function CyclesAdmin() {
  const qc = useQueryClient();
  const { data: cycles = [] } = useQuery({
    queryKey: ["all-cycles"],
    queryFn: async () => (await supabase.from("cycles").select("*").order("opens_at")).data ?? [],
  });
  const toggle = async (c: any) => {
    // close all of the same year first if activating
    if (!c.is_active) await supabase.from("cycles").update({ is_active: false }).eq("year", c.year);
    await supabase.from("cycles").update({ is_active: !c.is_active }).eq("id", c.id);
    toast.success(c.is_active ? "Closed" : "Opened");
    qc.invalidateQueries({ queryKey: ["all-cycles"] });
  };
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Cycle Configuration</h1>
      <Card className="border-0 shadow-card"><CardContent className="p-0">
        <table className="w-full text-sm">
          <thead className="bg-muted text-xs uppercase"><tr className="text-left"><th className="p-3">Phase</th><th>Year</th><th>Opens</th><th>Closes</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {(cycles as any[]).map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-3 font-medium">{c.phase}</td>
                <td>{c.year}</td>
                <td className="text-xs">{new Date(c.opens_at).toLocaleDateString()}</td>
                <td className="text-xs">{new Date(c.closes_at).toLocaleDateString()}</td>
                <td><Badge variant={c.is_active ? "default" : "secondary"}>{c.is_active ? "Active" : "Upcoming"}</Badge></td>
                <td><Button size="sm" variant="outline" onClick={() => toggle(c)}>{c.is_active ? "Close" : "Open Early"}</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent></Card>
    </div>
  );
}
