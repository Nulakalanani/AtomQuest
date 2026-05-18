import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { exportToCSV } from "@/lib/exportHelper";
import { Download } from "lucide-react";


export function Audit() {
  const { data: logs = [] } = useQuery({
    queryKey: ["audit"],
    queryFn: async () => (await supabase.from("audit_logs").select("*, profiles(name, email), goals(title)").order("timestamp", { ascending: false }).limit(500)).data ?? [],
  });
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="font-display text-3xl font-bold">Audit Trail</h1>
        <Button onClick={() => exportToCSV("audit_trail.csv", logs as any[])}><Download className="mr-1 h-4 w-4" /> Export CSV</Button>
      </div>
      <Card className="border-0 shadow-card"><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted text-xs uppercase"><tr className="text-left"><th className="p-3">When</th><th>Who</th><th>Goal</th><th>Field</th><th>Old</th><th>New</th><th>Action</th></tr></thead>
          <tbody>
            {(logs as any[]).map((l) => (
              <tr key={l.id} className="border-t">
                <td className="p-3 text-xs">{new Date(l.timestamp).toLocaleString()}</td>
                <td>{l.profiles?.name ?? l.changed_by?.slice(0,8)}</td>
                <td className="text-xs">{l.goals?.title ?? "—"}</td>
                <td><Badge variant="outline">{l.field}</Badge></td>
                <td className="text-xs">{l.old_value}</td>
                <td className="text-xs font-medium">{l.new_value}</td>
                <td><Badge>{l.action}</Badge></td>
              </tr>
            ))}
            {!logs.length && <tr><td className="p-6 text-center text-muted-foreground" colSpan={7}>No audit entries yet.</td></tr>}
          </tbody>
        </table>
      </CardContent></Card>
    </div>
  );
}
