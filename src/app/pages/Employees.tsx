import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { EmployeeAvatar } from "../components/EmployeeAvatar";
import { Search, Users, Plus, ImageUp, ClipboardList, Trash2 } from "lucide-react";
import { createEmployee, deleteEmployee, getEmployees, uploadEmployeeAvatar } from "../api/employees";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../components/ui/alert-dialog";
import { formatINR } from "../lib/formatMoney";
import type { Employee } from "../api/types";
import { toast } from "sonner";
import { getOnboardingChecklistFor } from "../api/onboarding";

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const uploadTargetId = useRef<string | null>(null);
  const hiddenFileRef = useRef<HTMLInputElement>(null);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [checklistRows, setChecklistRows] = useState<{ itemKey: string; isComplete: boolean }[]>([]);
  const [checklistTargetName, setChecklistTargetName] = useState("");

  const isManager = typeof window !== "undefined" && localStorage.getItem("accessRole") === "manager";

  const [newEmp, setNewEmp] = useState({
    name: "",
    email: "",
    password: "",
    jobRole: "",
    department: "",
    accessRole: "employee" as "employee" | "manager",
    leaveBalance: "20",
  });

  const load = () => {
    getEmployees()
      .then(setEmployees)
      .catch(console.error);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = employees.filter((e) => {
    const q = query.toLowerCase();
    return (
      e.name.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      e.department.toLowerCase().includes(q) ||
      e.role.toLowerCase().includes(q)
    );
  });

  const handleAddEmployee = async () => {
    if (!newEmp.name.trim() || !newEmp.email.trim() || newEmp.password.length < 6) {
      toast.error("Name, email, and a password (6+ characters) are required.");
      return;
    }
    setSaving(true);
    try {
      const created = await createEmployee({
        name: newEmp.name.trim(),
        email: newEmp.email.trim(),
        password: newEmp.password,
        jobRole: newEmp.jobRole.trim(),
        department: newEmp.department.trim(),
        accessRole: newEmp.accessRole,
        leaveBalance: Number(newEmp.leaveBalance) || 20,
      });
      setEmployees((prev) => [created, ...prev]);
      setDialogOpen(false);
      setNewEmp({
        name: "",
        email: "",
        password: "",
        jobRole: "",
        department: "",
        accessRole: "employee",
        leaveBalance: "20",
      });
      toast.success("Employee added", { description: `${created.name} can sign in with the password you set.` });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Could not add employee";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const pickUploadFor = (id: string) => {
    uploadTargetId.current = id;
    hiddenFileRef.current?.click();
  };

  const onHiddenFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    const id = uploadTargetId.current;
    uploadTargetId.current = null;
    if (!id || !file) return;
    if (!/^image\/(jpeg|pjpeg|png|gif|webp)$/i.test(file.type)) {
      toast.error("Use a JPEG, PNG, GIF, or WebP image.");
      return;
    }
    try {
      const updated = await uploadEmployeeAvatar(id, file);
      setEmployees((prev) => prev.map((x) => (x.id === id ? updated : x)));
      toast.success("Photo updated");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Upload failed";
      toast.error(msg);
    }
  };

  const openChecklist = async (emp: Employee) => {
    setChecklistTargetName(emp.name);
    const rows = await getOnboardingChecklistFor(emp.id).catch(() => []);
    setChecklistRows(rows);
    setChecklistOpen(true);
  };

  return (
    <div className="space-y-6">
      <input
        ref={hiddenFileRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={onHiddenFile}
      />

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Employees</h1>
          <p className="text-muted-foreground mt-1">
            Directory synced from the database.{" "}
            {isManager ? "Add people or change their profile photos." : "Managers can add team members and photos."}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, team..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 border-border bg-background"
            />
          </div>
          {isManager ? (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 rounded-xl shadow-sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add employee
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add employee</DialogTitle>
                  <DialogDescription>
                    Creates a sign-in for a new person. Share their email and password with them securely.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-3 py-2">
                  <div className="grid gap-2">
                    <Label htmlFor="ne-name">Full name</Label>
                    <Input
                      id="ne-name"
                      value={newEmp.name}
                      onChange={(e) => setNewEmp({ ...newEmp, name: e.target.value })}
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="ne-email">Work email</Label>
                    <Input
                      id="ne-email"
                      type="email"
                      value={newEmp.email}
                      onChange={(e) => setNewEmp({ ...newEmp, email: e.target.value })}
                      placeholder="jane@company.com"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="ne-pass">Initial password</Label>
                    <Input
                      id="ne-pass"
                      type="password"
                      value={newEmp.password}
                      onChange={(e) => setNewEmp({ ...newEmp, password: e.target.value })}
                      placeholder="At least 6 characters"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="ne-role">Job title</Label>
                    <Input
                      id="ne-role"
                      value={newEmp.jobRole}
                      onChange={(e) => setNewEmp({ ...newEmp, jobRole: e.target.value })}
                      placeholder="e.g. Developer"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="ne-dept">Department</Label>
                    <Input
                      id="ne-dept"
                      value={newEmp.department}
                      onChange={(e) => setNewEmp({ ...newEmp, department: e.target.value })}
                      placeholder="e.g. Engineering"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Access</Label>
                    <Select
                      value={newEmp.accessRole}
                      onValueChange={(v: "employee" | "manager") => setNewEmp({ ...newEmp, accessRole: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="ne-leave">Starting leave balance (days)</Label>
                    <Input
                      id="ne-leave"
                      type="number"
                      min={0}
                      value={newEmp.leaveBalance}
                      onChange={(e) => setNewEmp({ ...newEmp, leaveBalance: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={handleAddEmployee} disabled={saving} className="bg-primary text-primary-foreground">
                    {saving ? "Saving…" : "Create"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          ) : null}
          <Dialog open={checklistOpen} onOpenChange={setChecklistOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Onboarding checklist</DialogTitle>
                <DialogDescription>{checklistTargetName}</DialogDescription>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                {checklistRows.map((r) => (
                  <div key={r.itemKey} className="flex justify-between rounded border border-border p-2">
                    <span>{r.itemKey.replace(/_/g, " ")}</span>
                    <span>{r.isComplete ? "Done" : "Pending"}</span>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((emp) => (
          <Card
            key={emp.id}
            className="border-border shadow-sm bg-card/90 hover:shadow-md transition-shadow overflow-hidden"
          >
            <CardHeader className="pb-2">
              <div className="flex items-start gap-3">
                <EmployeeAvatar
                  email={emp.email}
                  name={emp.name}
                  className="h-12 w-12 border-2 border-primary/20"
                  fallbackClassName="text-sm font-semibold"
                />
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base font-semibold text-foreground truncate">{emp.name}</CardTitle>
                  <p className="text-sm text-muted-foreground truncate">{emp.email}</p>
                </div>
                {isManager ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-8 w-8 text-muted-foreground hover:text-foreground"
                    aria-label="Onboarding checklist"
                    onClick={() => void openChecklist(emp)}
                  >
                    <ClipboardList className="h-4 w-4" />
                  </Button>
                ) : null}
                {isManager ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-8 w-8 text-muted-foreground hover:text-foreground"
                    aria-label="Upload photo"
                    onClick={() => pickUploadFor(emp.id)}
                  >
                    <ImageUp className="h-4 w-4" />
                  </Button>
                ) : null}
                {isManager ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 h-8 w-8 text-rose-600 hover:text-rose-700"
                        aria-label="Delete employee"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete employee?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove {emp.name}&apos;s account and related personal records. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => {
                            deleteEmployee(emp.id)
                              .then(() => {
                                setEmployees((prev) => prev.filter((x) => x.id !== emp.id));
                                toast.success("Employee deleted");
                              })
                              .catch((err: unknown) => {
                                const msg =
                                  (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                                  "Could not delete employee";
                                toast.error(msg);
                              });
                          }}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/10">
                  {emp.role}
                </Badge>
                <Badge variant="outline" className="border-border text-foreground">
                  {emp.department}
                </Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs pt-2 border-t border-border">
                <div>
                  <div className="font-semibold text-foreground">{emp.tasksCompleted ?? 0}</div>
                  <div className="text-muted-foreground">Done</div>
                </div>
                <div>
                  <div className="font-semibold text-amber-600">{emp.tasksInProgress ?? 0}</div>
                  <div className="text-muted-foreground">Active</div>
                </div>
                <div>
                  <div className="font-semibold text-emerald-600">{emp.leaveBalance}</div>
                  <div className="text-muted-foreground">Leave</div>
                </div>
                <div className="min-w-0">
                  <div
                    className="font-semibold text-foreground truncate"
                    title="Company standard gross; net pay uses automatic leave deductions."
                  >
                    {formatINR(emp.monthlySalary ?? 80000)}
                  </div>
                  <div className="text-muted-foreground">Standard gross</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed border-border bg-muted/30">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Users className="w-10 h-10 mb-3 text-muted-foreground/50" />
            <p>No employees match your search.</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
