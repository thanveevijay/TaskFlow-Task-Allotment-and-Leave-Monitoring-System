import { Fragment, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { getAuditLogs, type AuditLogItem } from "../api/audit";
import { openAuditExportCsv } from "../api/export";

export default function AuditTrail() {
  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [actor, setActor] = useState("");
  const [actionType, setActionType] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / 25)), [total]);

  useEffect(() => {
    setLoading(true);
    getAuditLogs({ page, limit: 25, actor: actor || undefined, actionType: actionType || undefined })
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
      })
      .catch(() => {
        setItems([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [page, actor, actionType]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl text-foreground mb-2">Audit Trail</h1>
        <p className="text-muted-foreground">Track key system actions with actor, target, and value changes.</p>
      </div>
      <Card>
        <CardHeader className="flex flex-col sm:flex-row gap-3 sm:items-end sm:justify-between">
          <CardTitle>Audit logs</CardTitle>
          <div className="flex gap-2 w-full sm:w-auto flex-wrap">
            <Input
              placeholder="Filter actor"
              className="sm:w-48"
              value={actor}
              onChange={(e) => {
                setPage(1);
                setActor(e.target.value);
              }}
            />
            <Input
              placeholder="Action type"
              className="sm:w-56"
              value={actionType}
              onChange={(e) => {
                setPage(1);
                setActionType(e.target.value);
              }}
            />
            <Button
              variant="outline"
              onClick={() => openAuditExportCsv({ actor: actor || undefined, actionType: actionType || undefined })}
            >
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2">Timestamp</th>
                  <th className="text-left py-2 px-2">Actor</th>
                  <th className="text-left py-2 px-2">Action</th>
                  <th className="text-left py-2 px-2">Target</th>
                  <th className="text-left py-2 px-2">Details</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="py-6 px-2 text-muted-foreground" colSpan={5}>
                      Loading...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td className="py-6 px-2 text-muted-foreground" colSpan={5}>
                      No audit logs found.
                    </td>
                  </tr>
                ) : (
                  items.map((x) => (
                    <Fragment key={x.id}>
                      <tr key={x.id} className="border-b border-border/60">
                        <td className="py-2 px-2">{x.timestamp ? new Date(x.timestamp).toLocaleString() : "-"}</td>
                        <td className="py-2 px-2">{x.actor}</td>
                        <td className="py-2 px-2">{x.actionType}</td>
                        <td className="py-2 px-2">
                          {x.targetType} {x.targetId ? `#${x.targetId.slice(-6)}` : ""}
                        </td>
                        <td className="py-2 px-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setExpandedId((prev) => (prev === x.id ? null : x.id))}
                          >
                            {expandedId === x.id ? "Hide" : "View"}
                          </Button>
                        </td>
                      </tr>
                      {expandedId === x.id ? (
                        <tr key={`${x.id}-expanded`} className="bg-muted/30 border-b border-border/60">
                          <td colSpan={5} className="py-2 px-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Old value</p>
                                <pre className="text-xs whitespace-pre-wrap p-2 rounded border border-border bg-background">
                                  {JSON.stringify(x.oldValue, null, 2)}
                                </pre>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">New value</p>
                                <pre className="text-xs whitespace-pre-wrap p-2 rounded border border-border bg-background">
                                  {JSON.stringify(x.newValue, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-end gap-2 pt-4">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Prev
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} / {totalPages}
            </span>
            <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
