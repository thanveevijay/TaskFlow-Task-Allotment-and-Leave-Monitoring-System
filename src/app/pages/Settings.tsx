import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useTheme } from "next-themes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Separator } from "../components/ui/separator";
import { toast } from "sonner";
import { Bell, KeyRound, LogOut, User, Shield, Sun, Moon, Monitor, Wallet, Sparkles } from "lucide-react";
import { changePassword, fetchCurrentSession, updateMyProfile, uploadMyAvatar } from "../api/auth";
import { getMonthlyPayroll, type MonthlyPayrollResponse } from "../api/payroll";
import { formatINR } from "../lib/formatMoney";
import { EmployeeAvatar } from "../components/EmployeeAvatar";
import { clearAuthToken } from "../lib/authToken";
import {
  getStoredUserProfile,
  setStoredUserProfile,
  clearStoredUserProfile,
  type StoredUserProfile,
} from "../lib/userProfile";
import { getNotificationPrefs, patchNotificationPrefs } from "../api/notifications";
import { getStockSetting, patchStockSetting } from "../api/stock";
import { api } from "../api/http";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";

const NOTIFY_KEY = "settings_notify_email";
const NOTIFY_PUSH_KEY = "settings_notify_push";

export default function Settings() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [profile, setProfile] = useState<StoredUserProfile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [emailDigest, setEmailDigest] = useState(true);
  const [pushAlerts, setPushAlerts] = useState(false);
  const [notifPrefsSaving, setNotifPrefsSaving] = useState(false);
  const [stockSymbol, setStockSymbol] = useState("");
  const [stockSaving, setStockSaving] = useState(false);
  const [seedKey, setSeedKey] = useState("");
  const [seedResetting, setSeedResetting] = useState(false);
  const [seedDialogOpen, setSeedDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [payrollPreview, setPayrollPreview] = useState<MonthlyPayrollResponse | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const p = getStoredUserProfile();
    setProfile(p);
    setDisplayName(p?.name ?? "");
    setEmailInput(p?.email ?? "");
    setEmailDigest(localStorage.getItem(NOTIFY_KEY) !== "false");
    setPushAlerts(localStorage.getItem(NOTIFY_PUSH_KEY) === "true");
    getNotificationPrefs()
      .then((prefs) => {
        setEmailDigest(!!prefs.leaveApprovedEmail);
        setPushAlerts(!!prefs.taskAssignedEmail);
      })
      .catch(() => {});
    getStockSetting().then((s) => setStockSymbol(s.symbol || "")).catch(() => {});
  }, []);

  useEffect(() => {
    fetchCurrentSession()
      .then(({ employee, accessRole }) => {
        setProfile((prev) => {
          const next = prev
            ? {
                ...prev,
                monthlySalary: employee.monthlySalary,
                leaveBalance: employee.leaveBalance,
                avatar: employee.avatar,
                email: employee.email,
              }
            : employee;
          setStoredUserProfile(next);
          return next;
        });
        localStorage.setItem("accessRole", accessRole);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!profile?.id) return;
    const d = new Date();
    getMonthlyPayroll(d.getFullYear(), d.getMonth() + 1)
      .then(setPayrollPreview)
      .catch(() => setPayrollPreview(null));
  }, [profile?.id]);

  const saveProfile = async () => {
    if (!profile) return;
    const name = displayName.trim() || profile.name;
    const email = emailInput.trim().toLowerCase() || profile.email;
    const nameChanged = name !== profile.name;
    const emailChanged = email !== profile.email.toLowerCase();
    if (!nameChanged && !emailChanged) {
      toast.message("No changes to save");
      return;
    }
    if (emailChanged && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Enter a valid email address");
      return;
    }
    const payload: { name?: string; email?: string } = {};
    if (nameChanged) payload.name = name;
    if (emailChanged) payload.email = email;
    setProfileSaving(true);
    try {
      const { employee, accessRole } = await updateMyProfile(payload);
      setStoredUserProfile(employee);
      setProfile(employee);
      setDisplayName(employee.name);
      setEmailInput(employee.email);
      localStorage.setItem("accessRole", accessRole);
      toast.success("Profile updated", {
        description:
          nameChanged && emailChanged
            ? "Your name and sign-in email are saved."
            : emailChanged
              ? "Your sign-in email is saved—use it next time you log in."
              : "Your display name is saved to your account.",
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Could not update your profile";
      toast.error(msg);
    } finally {
      setProfileSaving(false);
    }
  };

  const onAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !profile) return;
    if (!/^image\/(jpeg|pjpeg|png|gif|webp)$/i.test(file.type)) {
      toast.error("Use a JPEG, PNG, GIF, or WebP image.");
      return;
    }
    setAvatarBusy(true);
    try {
      const employee = await uploadMyAvatar(file);
      setStoredUserProfile(employee);
      setProfile(employee);
      toast.success("Profile photo updated");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Upload failed";
      toast.error(msg);
    } finally {
      setAvatarBusy(false);
    }
  };

  const saveNotifications = (email: boolean, push: boolean) => {
    localStorage.setItem(NOTIFY_KEY, String(email));
    localStorage.setItem(NOTIFY_PUSH_KEY, String(push));
    setNotifPrefsSaving(true);
    patchNotificationPrefs({
      leaveApprovedEmail: email,
      leaveRejectedEmail: email,
      taskAssignedEmail: push,
      deadlineSoonEmail: push,
      newLeaveSubmittedEmail: email,
    })
      .then(() => toast.success("Notification preferences saved"))
      .catch(() => toast.error("Could not save notification preferences"))
      .finally(() => setNotifPrefsSaving(false));
  };

  const saveStock = async () => {
    if (localStorage.getItem("accessRole") !== "manager") return;
    if (!stockSymbol.trim()) {
      toast.error("Enter a stock symbol");
      return;
    }
    setStockSaving(true);
    try {
      await patchStockSetting(stockSymbol.trim().toUpperCase());
      toast.success("Stock symbol saved");
    } catch {
      toast.error("Could not save stock symbol");
    } finally {
      setStockSaving(false);
    }
  };

  const runSeedReset = async () => {
    if (localStorage.getItem("accessRole") !== "manager") return;
    if (!seedKey.trim()) {
      toast.error("Enter ADMIN_SEED_KEY");
      return;
    }
    setSeedResetting(true);
    try {
      await api.post("/admin/seed-reset", {}, { headers: { "x-admin-seed-key": seedKey.trim() } });
      toast.success("Demo data loaded successfully");
      setSeedDialogOpen(false);
      navigate("/manager/dashboard");
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Seed reset failed";
      toast.error(msg);
    } finally {
      setSeedResetting(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Use at least 8 characters for your new password");
      return;
    }
    setPasswordSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast.success("Password updated", { description: "Sign in with your new password next time." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Could not update password";
      toast.error(msg);
    } finally {
      setPasswordSaving(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("accessRole");
    localStorage.removeItem("employeeId");
    clearAuthToken();
    clearStoredUserProfile();
    navigate("/");
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-3xl font-black text-white" style={{ fontFamily: 'var(--font-display)' }}>Settings</h1>
        <p className="text-white/40 mt-1">Manage your profile, workspace colors, and security.</p>
      </div>

      <Card className="glass-card border-white/10">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-400" />
            <CardTitle className="text-white">Appearance</CardTitle>
          </div>
          <CardDescription className="text-white/40">Customize your workspace accent color.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">System Accent</Label>
            <div className="flex flex-wrap gap-4">
              {[
                { name: 'Violet', color: 'bg-[#8b5cf6]', class: 'theme-violet' },
                { name: 'Sky', color: 'bg-[#0ea5e9]', class: 'theme-sky' },
                { name: 'Emerald', color: 'bg-[#10b981]', class: 'theme-emerald' },
                { name: 'Rose', color: 'bg-[#f43f5e]', class: 'theme-rose' },
                { name: 'Amber', color: 'bg-[#f59e0b]', class: 'theme-amber' },
              ].map((c) => (
                <button
                  key={c.name}
                  onClick={() => {
                    const themes = ['theme-violet', 'theme-sky', 'theme-emerald', 'theme-rose', 'theme-amber'];
                    document.body.classList.remove(...themes);
                    document.body.classList.add(c.class);
                    localStorage.setItem('theme-accent', c.class);
                    toast.success(`${c.name} theme applied!`, {
                      icon: <div className={`w-2 h-2 rounded-full ${c.color}`} />
                    });
                  }}
                  className={`group relative w-12 h-12 rounded-xl transition-all hover:scale-110 active:scale-95 ${c.color} shadow-xl shadow-black/40`}
                  title={c.name}
                >
                  <div className="absolute inset-0 rounded-xl border-2 border-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
          
          <Separator className="bg-white/5" />
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-white font-bold">Default Dark Theme</Label>
              <p className="text-xs text-white/30">TaskFlow runs exclusively in high-performance dark mode.</p>
            </div>
            <Switch checked disabled className="data-[state=checked]:bg-violet-600" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            <CardTitle>Appearance</CardTitle>
          </div>
          <CardDescription>Light, dark, or match your system.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={theme === "light" ? "default" : "outline"}
            size="sm"
            className="gap-2"
            onClick={() => setTheme("light")}
          >
            <Sun className="w-4 h-4" />
            Light
          </Button>
          <Button
            type="button"
            variant={theme === "dark" ? "default" : "outline"}
            size="sm"
            className="gap-2"
            onClick={() => setTheme("dark")}
          >
            <Moon className="w-4 h-4" />
            Dark
          </Button>
          <Button
            type="button"
            variant={theme === "system" ? "default" : "outline"}
            size="sm"
            className="gap-2"
            onClick={() => setTheme("system")}
          >
            <Monitor className="w-4 h-4" />
            System
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            <CardTitle>Profile</CardTitle>
          </div>
          <CardDescription>How you appear across TaskFlow.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-4 border-b border-border">
                <EmployeeAvatar
                  key={profile.id}
                  email={profile.email}
                  name={profile.name}
                  className="h-20 w-20 border-2 border-primary/30 shrink-0"
                  fallbackClassName="text-lg font-semibold"
                />
                <div className="space-y-2 min-w-0">
                  <Label>Profile photo</Label>
                  <p className="text-xs text-muted-foreground max-w-md">
                    Upload your own image (JPG, PNG, GIF, WebP, max 2MB). It is saved on the server under{" "}
                    <code className="text-xs bg-muted px-1 rounded">/uploads</code>.
                  </p>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                    onChange={onAvatarFile}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-fit border-border"
                    disabled={avatarBusy}
                    onClick={() => photoInputRef.current?.click()}
                  >
                    {avatarBusy ? "Uploading…" : "Upload photo"}
                  </Button>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="displayName">Display name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="max-w-md border-border bg-background"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="max-w-md border-border bg-background"
                />
                <p className="text-xs text-muted-foreground">Used to sign in. Must be unique.</p>
              </div>
              <div className="grid gap-1 text-sm">
                <span className="text-muted-foreground">Role</span>
                <span className="text-foreground font-medium">{profile.role}</span>
              </div>
              <div className="grid gap-1 text-sm">
                <span className="text-muted-foreground">Department</span>
                <span className="text-foreground font-medium">{profile.department}</span>
              </div>
              <div className="grid gap-1 text-sm">
                <span className="text-muted-foreground">Leave balance</span>
                <span className="text-foreground font-medium">{profile.leaveBalance} days</span>
              </div>
              <div className="grid gap-1 text-sm">
                <span className="text-muted-foreground">Standard gross monthly salary</span>
                <span className="text-foreground font-medium">
                  {formatINR(profile.monthlySalary ?? payrollPreview?.policy.defaultMonthlySalary ?? 80000)}
                </span>
                <span className="text-xs text-muted-foreground leading-relaxed">
                  Company-wide rate (automatic—not edited per person). Deductions are calculated from approved leave:
                  beyond {payrollPreview?.policy.freeLeaveDaysPerMonth ?? 5} days in a calendar month, gross is reduced
                  by {payrollPreview?.policy.deductionPercentPerExcessDay ?? 2}% per extra day (max{" "}
                  {payrollPreview?.policy.maxDeductionPercentPerMonth ?? 24}%).
                </span>
              </div>
              {payrollPreview?.rows[0] ? (
                <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2 text-sm">
                  <div className="flex items-center gap-2 font-medium text-foreground">
                    <Wallet className="w-4 h-4 text-primary shrink-0" />
                    This month ({payrollPreview.year}-{String(payrollPreview.month).padStart(2, "0")}) estimate
                  </div>
                  <div className="grid gap-1 text-xs sm:text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Approved leave days in month</span>
                      <span className="text-foreground font-medium">{payrollPreview.rows[0].leaveDaysInMonth}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Salary deduction</span>
                      <span className="text-foreground font-medium">
                        {payrollPreview.rows[0].deductionAmount > 0
                          ? `−${formatINR(payrollPreview.rows[0].deductionAmount)} (${payrollPreview.rows[0].deductionPercentApplied}%)`
                          : formatINR(0)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2 pt-1 border-t border-border">
                      <span className="text-muted-foreground">Estimated net (after rule)</span>
                      <span className="text-foreground font-semibold">
                        {formatINR(payrollPreview.rows[0].netSalary)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}
              <Button
                type="button"
                onClick={() => void saveProfile()}
                disabled={profileSaving}
                className="bg-primary hover:bg-primary/90 text-primary-foreground w-fit"
              >
                {profileSaving ? "Saving…" : "Save profile"}
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No profile loaded.{" "}
              <button type="button" className="text-primary underline" onClick={() => navigate("/")}>
                Sign in again
              </button>
              .
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            <CardTitle>Notifications</CardTitle>
          </div>
          <CardDescription>Choose what you want to be notified about.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-foreground">Email digest</p>
              <p className="text-sm text-muted-foreground">Weekly summary of tasks and leave</p>
            </div>
            <Switch
              checked={emailDigest}
              disabled={notifPrefsSaving}
              onCheckedChange={(v) => {
                setEmailDigest(v);
                saveNotifications(v, pushAlerts);
              }}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-foreground">Browser alerts</p>
              <p className="text-sm text-muted-foreground">Urgent approvals and deadlines (demo toggle)</p>
            </div>
            <Switch
              checked={pushAlerts}
              disabled={notifPrefsSaving}
              onCheckedChange={(v) => {
                setPushAlerts(v);
                saveNotifications(emailDigest, v);
              }}
            />
          </div>
        </CardContent>
      </Card>

      {localStorage.getItem("accessRole") === "manager" ? (
        <Card className="border-border shadow-sm bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Stock widget</CardTitle>
            <CardDescription>Set company stock symbol for dashboards.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="stockSymbol">Symbol</Label>
              <Input id="stockSymbol" value={stockSymbol} onChange={(e) => setStockSymbol(e.target.value)} placeholder="TCS.NS" />
            </div>
            <Button type="button" onClick={() => void saveStock()} disabled={stockSaving}>
              {stockSaving ? "Saving..." : "Save stock symbol"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-border shadow-sm bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-primary" />
            <CardTitle>Security</CardTitle>
          </div>
          <CardDescription>Update your password (stored securely with bcrypt on the server).</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="current">Current password</Label>
              <Input
                id="current"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="border-border bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newp">New password</Label>
              <Input
                id="newp"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="border-border bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm new password</Label>
              <Input
                id="confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="border-border bg-background"
              />
            </div>
            <Button type="submit" variant="outline" className="border-border" disabled={passwordSaving}>
              {passwordSaving ? "Saving…" : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-destructive/30 shadow-sm bg-destructive/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-destructive" />
            <CardTitle className="text-destructive">Session</CardTitle>
          </div>
          <CardDescription>Sign out on this device.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="destructive"
            className="gap-2"
            onClick={logout}
          >
            <LogOut className="w-4 h-4" />
            Log out
          </Button>
        </CardContent>
      </Card>

      {localStorage.getItem("accessRole") === "manager" ? (
        <Card className="border-destructive/40 shadow-sm bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>Reset app data to demo state.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 max-w-md">
            <Input
              type="password"
              value={seedKey}
              onChange={(e) => setSeedKey(e.target.value)}
              placeholder="Enter ADMIN_SEED_KEY"
            />
            <Dialog open={seedDialogOpen} onOpenChange={setSeedDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive">Reset to demo data</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Confirm demo reset</DialogTitle>
                  <DialogDescription>
                    This will delete all current data and replace it with demo data. This cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setSeedDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={() => void runSeedReset()} disabled={seedResetting}>
                    {seedResetting ? "Resetting..." : "Confirm reset"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      ) : null}

    </div>
  );
}
