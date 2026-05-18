import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { exportToCSV } from "@/lib/exportHelper";
import { Download, Search } from "lucide-react";

const ACTION_COLOR: Record<string, string> = {
  CREATE: "bg-success/20 text-success-foreground",
  APPROVE: "bg-primary/10 text-primary",
  LOCK: "bg-accent/20 text-accent-foreground",
  UNLOCK: "bg-warning/20 text-warning-foreground",
  SUBMIT: "bg-blue-100 text-blue-800",
  RETURN: "bg-destructive/20 text-destructive-foreground",
  UPDATE: "bg-muted text-muted-foreground",
  COMMENT: "bg-muted text-muted-foreground",
};

export function Audit() {
  const [search, setSearch] = useState("");

  const { data: logs = [] } = useQuery({
    queryKey: ["audit"],
    queryFn: async () =>
      (
        await supabase
          .from("audit_logs")
          .select("*, profiles(name, email), goals(title)")
          .order("timestamp", { ascending: false })
          .limit(1000)
      ).data ?? [],
  });

  const filtered = (logs as any[]).filter(
    (l) =>
      !search ||
      l.profiles?.name?.toLowerCase().includes(search.toLowerCase()) ||
      l.goals?.title?.toLowerCase().includes(search.toLowerCase()) ||
      l.field?.toLowerCase().includes(search.toLowerCase()) ||
      l.action?.toLowerCase().includes(search.toLowerCase())
  );

  const exportAudit = () =>
    exportToCSV(
      `audit_trail_${new Date().toISOString().slice(0, 10)}.csv`,
      (logs as any[]).map((l) => ({
        Timestamp: new Date(l.timestamp).toLocaleString(),
        Who: l.profiles?.name ?? l.changed_by?.slice(0, 8) ?? "—",
        Email: l.profiles?.email ?? "—",
        Goal: l.goals?.title ?? "—",
        Field: l.field,
        "Old Value": l.old_value ?? "—",
        "New Value": l.new_value ?? "—",
        Action: l.action,
      }))
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display text-3xl font-bold">Audit Trail</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9 w-56"
              placeholder="Filter…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button onClick={exportAudit}>
            <Download className="mr-1 h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      <Card className="border-0 shadow-card">
        <CardHeader>
          <CardTitle className="font-display text-base">
            {filtered.length} {search ? "matching" : ""} entr{filtered.length === 1 ? "y" : "ies"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs uppercase text-muted-foreground">
              <tr className="text-left">
                <th className="p-3">When</th>
                <th className="p-3">Who</th>
                <th className="p-3">Goal</th>
                <th className="p-3">Field</th>
                <th className="p-3">Old</th>
                <th className="p-3">New</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l: any) => (
                <tr key={l.id} className="border-t hover:bg-muted/20">
                  <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(l.timestamp).toLocaleString()}
                  </td>
                  <td className="p-3 text-sm">
                    <div className="font-medium">{l.profiles?.name ?? l.changed_by?.slice(0, 8) ?? "—"}</div>
                    {l.profiles?.email && <div className="text-[10px] text-muted-foreground">{l.profiles.email}</div>}
                  </td>
                  <td className="p-3 text-xs max-w-[160px] truncate">{l.goals?.title ?? "—"}</td>
                  <td className="p-3">
                    <Badge variant="outline" className="text-[10px]">{l.field}</Badge>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground max-w-[100px] truncate">{l.old_value ?? "—"}</td>
                  <td className="p-3 text-xs font-medium max-w-[100px] truncate">{l.new_value ?? "—"}</td>
                  <td className="p-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${ACTION_COLOR[l.action] ?? "bg-muted text-muted-foreground"}`}>
                      {l.action}
                    </span>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td className="p-8 text-center text-muted-foreground" colSpan={7}>
                    {search ? "No matching entries." : "No audit entries yet. Actions on goals will appear here automatically."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
