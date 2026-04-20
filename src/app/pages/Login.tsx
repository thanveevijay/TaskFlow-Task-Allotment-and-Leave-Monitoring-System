import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Sparkles, Eye, EyeOff, ArrowLeft, ShieldCheck, CheckCircle2, Users, BarChart3, Calendar } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { forgotPassword, login, resetPassword } from "../api/auth";
import { setAuthToken } from "../lib/authToken";
import { setStoredUserProfile } from "../lib/userProfile";
import { toast } from "sonner";

const employeeFeatures = [
  { icon: CheckCircle2, text: "Track your assigned tasks & deadlines" },
  { icon: Calendar, text: "Submit & monitor leave requests" },
  { icon: BarChart3, text: "View your personal performance metrics" },
  { icon: Users, text: "Explore team org chart & directory" },
];

const managerFeatures = [
  { icon: ShieldCheck, text: "Full team workload visibility" },
  { icon: BarChart3, text: "Department analytics & reports" },
  { icon: Users, text: "Manage employees & roles" },
  { icon: Calendar, text: "Approve leave requests instantly" },
];

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialRole = (searchParams.get("role") as "manager" | "employee") ?? "employee";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"manager" | "employee">(initialRole);
  const [managerAccessCode, setManagerAccessCode] = useState("");
  const [showManagerCode, setShowManagerCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [requestedReset, setRequestedReset] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isManager = role === "manager";
  const accentFrom = isManager ? "#8b5cf6" : "#0ea5e9";
  const accentTo = isManager ? "#7c3aed" : "#0284c7";
  const accentLight = isManager ? "#a78bfa" : "#38bdf8";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (role === "manager" && !showManagerCode) {
        setShowManagerCode(true);
        setLoading(false);
        return;
      }
      const result = await login(email, password, role, role === "manager" ? managerAccessCode : undefined);
      setAuthToken(result.token);
      localStorage.setItem("accessRole", result.accessRole);
      localStorage.setItem("employeeId", result.employee.id);
      setStoredUserProfile(result.employee);
      if (result.accessRole === "manager") navigate("/manager/dashboard");
      else navigate("/employee/dashboard");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const features = isManager ? managerFeatures : employeeFeatures;

  return (
    <div className={`min-h-screen flex transition-colors duration-500 ${mounted ? "opacity-100" : "opacity-0"}`}
      style={{ transition: "opacity 0.4s ease" }}>

      {/* ────── LEFT PANEL — Brand / Features ────── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[55%] relative overflow-hidden p-12"
        style={{
          background: `linear-gradient(135deg, #020817 0%, #0a0f1e 40%, #0d1b2a 100%)`,
        }}
      >
        {/* Ambient orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="orb w-[500px] h-[500px] -top-24 -left-24"
            style={{ background: `radial-gradient(circle, ${accentFrom}22 0%, transparent 70%)` }} />
          <div className="orb orb-alt w-[400px] h-[400px] -bottom-20 -right-20"
            style={{ background: `radial-gradient(circle, ${accentTo}18 0%, transparent 70%)`, animationDelay: "4s" }} />
        </div>
        {/* Grid */}
        <div className="absolute inset-0 opacity-[0.04] bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:48px_48px]" />

        {/* Top: back link + logo */}
        <div className="relative z-10">
          <button onClick={() => navigate("/")}
            className="flex items-center gap-2 text-slate-400 hover:text-white text-sm font-medium transition-colors mb-12 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to home
          </button>

          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-xl"
              style={{ background: `linear-gradient(135deg, ${accentFrom}, ${accentTo})`, boxShadow: `0 8px 24px -6px ${accentFrom}60` }}>
              <Sparkles className="w-5 h-5 text-white" strokeWidth={1.75} />
            </div>
            <span className="text-white font-bold text-xl" style={{ fontFamily: "var(--font-display)" }}>TaskFlow</span>
          </div>

          <div className="mb-2">
            <span className="inline-block text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full"
              style={{ background: `${accentFrom}20`, color: accentLight }}>
              {isManager ? "Manager Portal" : "Employee Workspace"}
            </span>
          </div>

          <h1 className="text-4xl font-black text-white mb-4 leading-tight" style={{ fontFamily: "var(--font-display)" }}>
            {isManager
              ? "Command your team with clarity"
              : "Your personal productivity hub"}
          </h1>
          <p className="text-slate-400 text-base leading-relaxed max-w-md">
            {isManager
              ? "Access powerful analytics, manage your entire team, approve requests, and drive performance — all from one dashboard."
              : "Stay on top of your tasks, track deadlines, request leaves, and celebrate achievements with your team."}
          </p>
        </div>

        {/* Middle: feature list */}
        <div className="relative z-10 space-y-4 my-10">
          {features.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${accentFrom}20` }}>
                <Icon className="w-4 h-4" style={{ color: accentLight }} />
              </div>
              <span className="text-slate-300 text-sm font-medium">{text}</span>
            </div>
          ))}
        </div>

        {/* Bottom: quote */}
        <div className="relative z-10 glass rounded-2xl p-5 border-white/[0.06]">
          <p className="text-slate-300 text-sm italic leading-relaxed mb-3">
            "TaskFlow gave our team the visibility we were missing. Overdue tasks dropped by 60% in the first month."
          </p>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: `linear-gradient(135deg, ${accentFrom}, ${accentTo})` }}>P</div>
            <span className="text-slate-400 text-xs">Priya Sharma, Head of Engineering</span>
          </div>
        </div>
      </div>

      {/* ────── RIGHT PANEL — Login Form ────── */}
      <div className="flex-1 flex flex-col justify-center relative overflow-hidden"
        style={{ background: isManager
          ? "linear-gradient(160deg, #0d0620 0%, #13082a 50%, #0f0520 100%)"
          : "linear-gradient(160deg, #020c1b 0%, #061628 50%, #020c1b 100%)"
        }}>

        {/* Ambient */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 right-1/4 w-64 h-64 rounded-full blur-3xl opacity-10"
            style={{ background: `radial-gradient(circle, ${accentFrom}, transparent)` }} />
        </div>

        <div className="relative z-10 w-full max-w-md mx-auto px-8 py-12">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${accentFrom}, ${accentTo})` }}>
              <Sparkles className="w-4.5 h-4.5 text-white" strokeWidth={1.75} />
            </div>
            <span className="text-white font-bold text-lg" style={{ fontFamily: "var(--font-display)" }}>TaskFlow</span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: "var(--font-display)" }}>
              Sign in to your account
            </h2>
            <p className="text-slate-400 text-sm">
              {isManager ? "Secured manager access" : "Welcome back! Pick up where you left off."}
            </p>
          </div>

          {/* Role toggle */}
          <div className="mb-6">
            <div className="flex p-1 rounded-2xl border gap-1" style={{ borderColor: `${accentFrom}25`, background: `${accentFrom}08` }}>
              {(["employee", "manager"] as const).map((r) => (
                <button key={r} type="button"
                  onClick={() => { setRole(r); setShowManagerCode(false); setError(null); }}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 capitalize ${
                    role === r
                      ? "text-white shadow-lg"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                  style={role === r ? {
                    background: `linear-gradient(135deg, ${accentFrom}, ${accentTo})`,
                    boxShadow: `0 4px 16px -4px ${accentFrom}60`
                  } : {}}>
                  {r === "manager" ? "Manager" : "Employee"}
                </button>
              ))}
            </div>
          </div>

          {/* Manager note */}
          {isManager && (
            <div className="mb-5 rounded-xl px-4 py-3 text-xs leading-relaxed"
              style={{ background: `${accentFrom}15`, border: `1px solid ${accentFrom}30`, color: accentLight }}>
              <ShieldCheck className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
              Department-secured access. You'll enter your access code after credentials.
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300" role="alert">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-slate-300 text-xs font-semibold tracking-wide uppercase">Email</Label>
              <Input id="email" type="email" autoComplete="off"
                placeholder="you@company.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus-visible:ring-2 focus-visible:border-transparent text-sm"
                style={{ "--tw-ring-color": `${accentFrom}60` } as any}
                required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-slate-300 text-xs font-semibold tracking-wide uppercase">Password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} autoComplete="new-password"
                  placeholder="••••••••"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className="h-12 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus-visible:ring-2 focus-visible:border-transparent text-sm pr-12"
                  style={{ "--tw-ring-color": `${accentFrom}60` } as any}
                  required />
                <button type="button" tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {showManagerCode && isManager && (
              <div className="space-y-1.5 scale-in">
                <Label htmlFor="manager-code" className="text-slate-300 text-xs font-semibold tracking-wide uppercase">
                  Department Access Code
                </Label>
                <Input id="manager-code" type="text" autoComplete="off"
                  placeholder="Enter your access code"
                  value={managerAccessCode} onChange={(e) => setManagerAccessCode(e.target.value)}
                  className="h-12 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus-visible:ring-2 focus-visible:border-transparent text-sm"
                  style={{ "--tw-ring-color": `${accentFrom}60` } as any}
                  required={isManager} />
              </div>
            )}

            <div className="flex justify-end">
              <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
                <DialogTrigger asChild>
                  <button type="button" className="text-xs font-medium transition-colors hover:underline underline-offset-4"
                    style={{ color: accentLight }}>
                    Forgot password?
                  </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Reset your password</DialogTitle>
                    <DialogDescription>Enter your email to receive a reset code.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="fp-email">Email</Label>
                      <Input id="fp-email" type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="you@company.com" />
                    </div>
                    <Button type="button" variant="outline" disabled={forgotLoading || !forgotEmail.trim()}
                      onClick={async () => {
                        setForgotLoading(true);
                        try {
                          const data = await forgotPassword(forgotEmail.trim(), role);
                          setRequestedReset(true);
                          toast.success(data.message || "Reset code sent");
                          if (data.devResetCode) toast.info(`Dev reset code: ${data.devResetCode}`);
                        } catch (err: any) {
                          toast.error(err?.response?.data?.message || "Could not request reset code");
                        } finally { setForgotLoading(false); }
                      }}>
                      {forgotLoading ? "Sending..." : "Send reset code"}
                    </Button>
                    {requestedReset && (
                      <>
                        <div className="space-y-1.5">
                          <Label htmlFor="fp-code">Reset code</Label>
                          <Input id="fp-code" value={resetCode} onChange={(e) => setResetCode(e.target.value)} placeholder="6-digit code" />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="fp-pass">New password</Label>
                          <Input id="fp-pass" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimum 8 characters" />
                        </div>
                        <Button type="button" disabled={forgotLoading || !forgotEmail.trim() || !resetCode.trim() || newPassword.length < 8}
                          onClick={async () => {
                            setForgotLoading(true);
                            try {
                              await resetPassword(forgotEmail.trim(), resetCode.trim(), newPassword);
                              toast.success("Password reset successful. You can sign in now.");
                              setForgotOpen(false); setRequestedReset(false); setResetCode(""); setNewPassword("");
                            } catch (err: any) {
                              toast.error(err?.response?.data?.message || "Could not reset password");
                            } finally { setForgotLoading(false); }
                          }}>
                          {forgotLoading ? "Resetting..." : "Reset password"}
                        </Button>
                      </>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <button type="submit" disabled={loading}
              className="btn-glow w-full h-12 rounded-2xl font-semibold text-white text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              style={{
                background: `linear-gradient(135deg, ${accentFrom}, ${accentTo})`,
                boxShadow: `0 6px 24px -6px ${accentFrom}70`
              }}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Signing in…
                </span>
              ) : (showManagerCode && isManager ? "Sign in as Manager" : "Continue")}
            </button>
          </form>


        </div>
      </div>
    </div>
  );
}
