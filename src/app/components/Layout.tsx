import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router";
import {
  LayoutDashboard, CheckSquare, Users, Calendar, BarChart3,
  Settings, Bell, LogOut, Sparkles, Shield,
  ChevronLeft, ChevronRight, Menu, Search,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Command } from "cmdk";
import { motion, AnimatePresence, MotionConfig } from "motion/react";
import { EmployeeAvatar } from "./EmployeeAvatar";
import {
  getStoredUserProfile, clearStoredUserProfile,
  setStoredUserProfile,
  USER_PROFILE_UPDATED_EVENT, type StoredUserProfile,
} from "../lib/userProfile";
import { clearAuthToken, getAuthToken } from "../lib/authToken";
import { fetchCurrentSession } from "../api/auth";
import {
  getNotifications, getUnreadCount,
  type ActivityNotification,
} from "../api/notifications";
import { toast } from "sonner";
import { Dialog, DialogContent } from "./ui/dialog";

const BASE_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:3000";

interface LayoutProps { role: "manager" | "employee"; }

function summarizeActivity(n: ActivityNotification): string {
  const meta = n.meta?.trim();
  const action = n.action.replace(/_/g, " ");
  if (n.entityType === "task" && meta) return `${action}: ${meta}`;
  if (meta) return `${action} — ${meta}`;
  return action;
}

const managerNavItems = [
  { path: "/manager/dashboard",      label: "Dashboard",   icon: LayoutDashboard },
  { path: "/manager/tasks",          label: "Tasks",       icon: CheckSquare },
  { path: "/manager/employees",      label: "Employees",   icon: Users },
  { path: "/manager/leave-requests", label: "Leave",       icon: Calendar },
  { path: "/manager/reports",        label: "Reports",     icon: BarChart3 },
  { path: "/manager/audit",          label: "Audit Trail", icon: Shield },
  { path: "/manager/settings",       label: "Settings",    icon: Settings },
];

const employeeNavItems = [
  { path: "/employee/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/employee/tasks",     label: "My Tasks",  icon: CheckSquare },
  { path: "/employee/leave",     label: "Leave",     icon: Calendar },
  { path: "/employee/settings",  label: "Settings",  icon: Settings },
];

function getBreadcrumb(pathname: string): string {
  const seg = pathname.split("/").filter(Boolean);
  return seg.map(s => s.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())).join(" › ");
}

/* ── Command Palette (Ultra Premium) ── */
function CommandPalette({ open, onClose, navItems }: {
  open: boolean;
  onClose: () => void;
  navItems: typeof managerNavItems;
}) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="p-0 bg-transparent border-none shadow-none max-w-2xl overflow-visible top-[20%]">
        <Command label="Command Palette" className="glass-card scale-in">
          <Command.Input placeholder="Search tasks, teammates, or pages..." autoFocus />
          <Command.List className="max-h-[400px] overflow-y-auto scrollbar-none pb-2">
            <Command.Empty className="p-8 text-center text-sm text-white/30">No results found.</Command.Empty>
            
            <Command.Group heading="Navigation">
              {navItems.map((item) => (
                <Command.Item
                  key={item.path}
                  onSelect={() => {
                    navigate(item.path);
                    onClose();
                  }}
                >
                  <item.icon className="mr-2" />
                  <span>{item.label}</span>
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group heading="Actions">
              <Command.Item onSelect={() => { toast.success("Refreshed data!"); onClose(); }}>
                <Sparkles className="mr-2" />
                <span>Sync Real-time Data</span>
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

export default function Layout({ role }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(() => getStoredUserProfile());
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme-accent');
    if (savedTheme) {
      document.body.classList.add(savedTheme);
    }
  }, []);

  const isManager = role === "manager";
  const accentFrom = isManager ? "#8b5cf6" : "#0ea5e9";
  const accentTo   = isManager ? "#7c3aed" : "#0284c7";

  const settingsPath = isManager ? "/manager/settings" : "/employee/settings";
  const displayName = profile?.name ?? (isManager ? "Manager" : "Team member");

  const [notifications, setNotifications] = useState<ActivityNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    if (!notifOpen) return;
    getNotifications(14)
      .then(setNotifications)
      .catch(() => setNotifications([]));
    getUnreadCount().then(setUnreadCount).catch(() => setUnreadCount(0));
  }, [notifOpen]);

  useEffect(() => {
    getUnreadCount().then(setUnreadCount).catch(() => {});
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    const token = getAuthToken();
    if (token) {
      const evtSource = new EventSource(`${BASE_URL}/stream?token=${token}`);
      evtSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.event === "notification" && data.payload) {
            setUnreadCount(prev => prev + 1);
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification("TaskFlow", { body: data.payload.message, icon: "/favicon.ico" });
            }
          }
        } catch {}
      };
      return () => evtSource.close();
    }
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    fetchCurrentSession()
      .then(({ employee, accessRole }) => {
        if (accessRole !== role) { navigate(accessRole === "manager" ? "/manager/dashboard" : "/employee/dashboard", { replace: true }); return; }
        setStoredUserProfile(employee); setProfile(employee);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onProfileUpdated = (e: Event) => {
      const ce = e as CustomEvent<StoredUserProfile>;
      if (ce.detail?.id) setProfile(ce.detail);
    };
    window.addEventListener(USER_PROFILE_UPDATED_EVENT, onProfileUpdated);
    return () => window.removeEventListener(USER_PROFILE_UPDATED_EVENT, onProfileUpdated);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const navItems = isManager ? managerNavItems : employeeNavItems;

  const handleLogout = () => {
    clearAuthToken();
    clearStoredUserProfile();
    navigate("/");
  };

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex flex-col h-full bg-[#060b16]">
      {/* Brand header */}
      <div className={`flex items-center h-16 px-4 border-b border-white/[0.06] shrink-0 ${collapsed && !mobile ? "justify-center" : "gap-3"}`}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-lg"
          style={{ background: `linear-gradient(135deg, ${accentFrom}, ${accentTo})`, boxShadow: `0 4px 16px -4px ${accentFrom}60` }}>
          <Sparkles className="w-4.5 h-4.5 text-white" strokeWidth={1.75} />
        </div>
        {(!collapsed || mobile) && (
          <div className="min-w-0">
            <div className="text-white font-bold text-base leading-none" style={{ fontFamily: "var(--font-display)" }}>TaskFlow</div>
            <div className="text-xs mt-0.5 font-medium" style={{ color: accentFrom }}>{isManager ? "Manager Portal" : "Employee"}</div>
          </div>
        )}
        {!mobile && (
          <button onClick={() => setCollapsed(!collapsed)}
            className="ml-auto p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/10 transition-all shrink-0">
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto scrollbar-none px-3 py-4 space-y-2">
        {navItems.map(({ path, label, icon: Icon }, idx) => {
          const isActive = location.pathname === path;
          return (
            <Link key={path} to={path}
              className={`nav-item relative group flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all duration-300
                ${isActive ? "text-white" : "text-white/40 hover:text-white/80 hover:bg-white/[0.03]"}
                ${collapsed && !mobile ? "justify-center px-0" : ""}`}
              style={{ animationDelay: `${idx * 35}ms` }}
              title={collapsed && !mobile ? label : undefined}>
              
              {isActive && (
                <motion.div 
                  layoutId="indicator"
                  className="absolute inset-0 bg-white/[0.05] rounded-2xl border border-white/10"
                  initial={false}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              
              <Icon className={`w-5 h-5 shrink-0 transition-transform duration-300 ${isActive ? "text-violet-400 scale-110" : "group-hover:scale-110"}`} />
              {(!collapsed || mobile) && <span className="text-sm font-semibold tracking-wide relative z-10">{label}</span>}
              
              {isActive && (!collapsed || mobile) && (
                <div className="ml-auto w-1 h-1 rounded-full bg-violet-400 shadow-[0_0_8px_#8b5cf6]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="px-3 pb-4 pt-2 border-t border-white/[0.06] space-y-0.5">
        <button onClick={handleLogout}
          className={`nav-item w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-rose-400 hover:bg-rose-500/10 ${collapsed && !mobile ? "justify-center px-0" : ""}`}
          title={collapsed && !mobile ? "Log out" : undefined}>
          <LogOut className="w-5 h-5 shrink-0" />
          {(!collapsed || mobile) && <span className="text-sm font-semibold">Log out</span>}
        </button>
      </div>
    </div>
  );

  const sidebarWidth = collapsed ? "4.5rem" : "15.5rem";

  return (
    <div className="min-h-screen bg-[#020612] flex">
      {/* Command Palette */}
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} navItems={navItems} />

      {/* Overlay for mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar (Desktop) */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 z-30 transition-all duration-300 ease-in-out border-r border-white/[0.06]"
        style={{ width: sidebarWidth }}>
        <SidebarContent />
      </aside>

      {/* Sidebar (Mobile) */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 transition-transform duration-300 ease-soft lg:hidden
        ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <SidebarContent mobile />
      </aside>

      {/* Main viewport */}
      <div className="flex-1 flex flex-col transition-all duration-300"
        style={{ marginLeft: collapsed ? (window.innerWidth < 1024 ? 0 : "4.5rem") : (window.innerWidth < 1024 ? 0 : "15.5rem") }}>
        
        {/* Header */}
        <header className="sticky top-0 z-20 flex items-center h-16 px-6 gap-4 border-b border-white/[0.05] bg-[#020612]/80 backdrop-blur-md">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden p-2 text-slate-400 hover:text-white">
            <Menu className="w-5 h-5" />
          </button>

          <div className="text-sm text-slate-400 font-medium hidden sm:block">
            {getBreadcrumb(location.pathname)}
          </div>

          <div className="flex-1" />

          {/* Quick Search */}
          <button onClick={() => setCmdOpen(true)}
            className="hidden md:flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2 text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-all w-64 text-sm">
            <Search className="w-4 h-4" />
            <span>Quick search...</span>
            <kbd className="ml-auto text-xs border border-white/10 rounded px-1.5 py-0.5 font-mono">⌘K</kbd>
          </button>

          {/* Activity */}
          <DropdownMenu onOpenChange={setNotifOpen}>
            <DropdownMenuTrigger asChild>
              <button className="p-2 text-slate-400 hover:text-white relative">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-violet-500 ring-2 ring-[#020612]" />}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 glass-card rounded-2xl p-2">
              <DropdownMenuLabel>Activity Feed</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              <div className="max-h-[300px] overflow-y-auto scrollbar-none">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">No recent activity</div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className="p-3 hover:bg-white/[0.03] rounded-xl transition-colors border-b border-white/5 last:border-0">
                      <p className="text-xs text-slate-300">
                        <span className="font-bold text-white">{n.actorName}</span> {summarizeActivity(n)}
                      </p>
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        {n.createdAt ? new Date(n.createdAt).toLocaleTimeString() : 'Recently'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 pl-2 pr-1 h-9 rounded-full bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors">
                <EmployeeAvatar email={profile?.email || ""} name={profile?.name} className="w-7 h-7" />
                <span className="text-sm font-medium text-slate-300 pr-2 hidden sm:inline truncate max-w-[100px]">{displayName}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 glass-card rounded-2xl">
              <DropdownMenuLabel>Account</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem onClick={() => navigate(settingsPath)}>Settings</DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="text-rose-400 focus:text-rose-300">Log out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Dynamic Content Viewport */}
        <main className="flex-1 relative overflow-hidden">
          <MotionConfig transition={{ type: "spring", bounce: 0, duration: 0.4 }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.02, y: -10 }}
                className="h-full overflow-y-auto p-6 sm:p-10 scrollbar-none"
              >
                <div className="max-w-6xl mx-auto">
                  <Outlet />
                </div>
              </motion.div>
            </AnimatePresence>
          </MotionConfig>
        </main>
      </div>
    </div>
  );
}
