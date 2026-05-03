import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  CheckSquare, BarChart3, Users, Calendar, Shield, Zap, ArrowRight,
  ChevronRight, Star, TrendingUp, Menu, X, Sparkles,
  Target, Award, Globe
} from "lucide-react";
import { toast } from "sonner";

/* ─── Tiny hook: detect if element is in viewport ─── */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

/* ─── Animated counter ─── */
function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const { ref, inView } = useInView(0.5);
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = Math.ceil(target / 50);
    const id = setInterval(() => {
      start = Math.min(start + step, target);
      setVal(start);
      if (start >= target) clearInterval(id);
    }, 25);
    return () => clearInterval(id);
  }, [inView, target]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

const features = [
  { icon: CheckSquare, title: "Smart Task Management", desc: "Assign, track and prioritize tasks with intelligent deadline alerts and workload balancing across your entire team.", color: "from-sky-500 to-blue-600" },
  { icon: BarChart3, title: "Real-time Analytics", desc: "Beautiful dashboards with department-level insights, completion rates, and productivity trends updated live.", color: "from-violet-500 to-purple-600" },
  { icon: Users, title: "Team Management", desc: "Full employee directory, role-based access, org chart visualization, and team workload heatmap at a glance.", color: "from-emerald-500 to-green-600" },
  { icon: Calendar, title: "Leave Management", desc: "Streamlined leave requests with instant approvals, conflict detection, and automatic payroll deductions.", color: "from-amber-500 to-orange-600" },
  { icon: Shield, title: "Role-based Access", desc: "Manager and employee portals with department-secured access codes, audit trails, and granular permissions.", color: "from-rose-500 to-red-600" },
  { icon: TrendingUp, title: "Performance Reports", desc: "Export detailed payroll reports, individual performance metrics, and achievement leaderboards with one click.", color: "from-cyan-500 to-teal-600" },
];

const steps = [
  { num: "01", icon: Globe, title: "Invite Your Team", desc: "Set up your workspace in minutes. Add employees with roles, departments, and access levels." },
  { num: "02", icon: Target, title: "Assign & Track Tasks", desc: "Create tasks with priorities, deadlines, and assignments. Monitor progress in real-time." },
  { num: "03", icon: Award, title: "Celebrate Wins", desc: "Use the kudos system, track achievements, and generate reports to showcase team success." },
];

const testimonials = [
  { name: "Priya Sharma", role: "Head of Engineering", company: "TechCorp India", quote: "TaskFlow transformed how our 50-person engineering team operates. Overdue tasks dropped by 60% in the first month.", avatar: "PS", stars: 5 },
  { name: "Rajesh Menon", role: "HR Manager", company: "Infra Solutions", quote: "The leave management system alone saved us hours every week. Payroll deductions are now fully automated.", avatar: "RM", stars: 5 },
  { name: "Ananya Kapoor", role: "Product Manager", company: "Startup Hub", quote: "Best task app I've used. The manager dashboard gives me exactly the visibility I need without the noise.", avatar: "AK", stars: 5 },
];

const stats = [
  { value: 10000, suffix: "+", label: "Teams onboarded" },
  { value: 99, suffix: ".9%", label: "Platform uptime" },
  { value: 4, suffix: ".9★", label: "Average rating" },
  { value: 60, suffix: "%", label: "Less overdue tasks" },
];

function NavBar({ onLogin }: { onLogin: (role: "manager" | "employee") => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "glass-dark shadow-xl shadow-black/30" : "bg-transparent"}`}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Mobile menu trigger */}
        <div className="md:hidden flex-1">
          <button className="text-white p-2" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Desktop nav (Left) */}
        <nav className="hidden md:flex items-center gap-8 w-1/3">
          {["Features", "How it works"].map(l => (
            <a key={l} href={`#${l.toLowerCase().replace(/ /g, "-")}`}
              className="text-slate-300 hover:text-white text-sm font-medium transition-colors duration-200 hover:text-sky-400">
              {l}
            </a>
          ))}
          {["Pricing", "About"].map(l => (
            <button key={l} onClick={() => toast.info(`${l} page coming in v2.0!`)}
              className="text-slate-300 hover:text-white text-sm font-medium transition-colors duration-200 hover:text-sky-400">
              {l}
            </button>
          ))}
        </nav>

        {/* Logo (Centered) */}
        <div className="flex items-center justify-center gap-3 w-1/3 cursor-pointer hover:scale-105 transition-transform" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-violet-600 flex items-center justify-center shadow-lg shadow-sky-500/40 relative group">
            <div className="absolute inset-0 bg-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <Sparkles className="w-5 h-5 text-white animate-pulse" strokeWidth={2.5} />
          </div>
          <span className="text-white font-black text-2xl tracking-tight" style={{ fontFamily: "var(--font-display)" }}>TaskFlow</span>
        </div>

        {/* Buttons (Right) */}
        <div className="hidden md:flex items-center justify-end gap-3 w-1/3">
          <button onClick={() => onLogin("employee")}
            className="text-sm font-medium text-slate-300 hover:text-white px-4 py-2 rounded-xl transition-colors">
            Employee Portal
          </button>
          <button onClick={() => onLogin("manager")}
            className="text-sm font-semibold bg-gradient-to-r from-sky-500 to-blue-600 text-white px-5 py-2 rounded-xl shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 hover:-translate-y-0.5 transition-all duration-200">
            Manager Portal
          </button>
        </div>


      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden glass-dark border-t border-white/10 px-6 py-4 space-y-3">
          {["Features", "How it works"].map(l => (
            <a key={l} href={`#${l.toLowerCase().replace(/ /g, "-")}`}
              onClick={() => setMenuOpen(false)}
              className="block text-slate-300 hover:text-white text-sm font-medium py-2 transition-colors">
              {l}
            </a>
          ))}
          {["Pricing", "About"].map(l => (
            <button key={l} onClick={() => { setMenuOpen(false); toast.info(`${l} page coming in v2.0!`); }}
              className="block text-slate-300 hover:text-white text-sm font-medium py-2 transition-colors text-left w-full">
              {l}
            </button>
          ))}
          <div className="pt-3 flex flex-col gap-2">
            <button onClick={() => onLogin("employee")} className="w-full text-sm font-medium text-slate-300 border border-white/20 px-4 py-2.5 rounded-xl hover:bg-white/10 transition-colors">Employee Login</button>
            <button onClick={() => onLogin("manager")} className="w-full text-sm font-semibold bg-gradient-to-r from-sky-500 to-blue-600 text-white px-4 py-2.5 rounded-xl">Manager Portal</button>
          </div>
        </div>
      )}
    </header>
  );
}

function HeroSection({ onLogin }: { onLogin: (role: "manager" | "employee") => void }) {
  return (
    <section className="relative min-h-screen flex items-center justify-center hero-mesh overflow-hidden">
      {/* Animated orbs */}
      <div className="orb orb-alt w-[500px] h-[500px] top-[-100px] left-[-100px] bg-sky-500/20" />
      <div className="orb w-[400px] h-[400px] bottom-[-80px] right-[-80px] bg-violet-600/15" style={{ animationDelay: "3s" }} />
      <div className="orb orb-alt w-[300px] h-[300px] top-[40%] left-[60%] bg-blue-600/10" style={{ animationDelay: "6s" }} />

      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-[0.035] bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:60px_60px]" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 text-center pt-24 pb-20">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 glass rounded-full px-5 py-2 mb-8 text-sky-300 text-sm font-bold border-sky-500/40 shadow-[0_0_20px_rgba(14,165,233,0.3)] animate-pulse hover:scale-105 transition-transform cursor-default">
          <Zap className="w-4 h-4 text-sky-400" />
          TaskFlow is now in Beta
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl lg:text-[5rem] font-black text-white mb-6 leading-[1.1] tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          <span className="bg-gradient-to-r from-sky-400 via-blue-500 to-violet-500 text-transparent bg-clip-text">TaskFlow</span> runs<br />
          <span className="text-shimmer" style={{ "--primary": "#0ea5e9" } as any}>
            your entire team
          </span>
        </h1>

        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
          Assign tasks, manage leave, track workloads, and visualize performance — all in one centralized, beautifully designed SaaS workspace.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <button onClick={() => onLogin("employee")}
            className="group relative flex items-center gap-3 bg-gradient-to-br from-sky-500 to-blue-600 text-white font-bold px-8 py-4 rounded-2xl text-base shadow-xl shadow-sky-500/30 overflow-hidden card-lift">
            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out skew-x-12" />
            Employee Portal
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <button onClick={() => onLogin("manager")} className="group flex items-center gap-3 text-slate-300 hover:text-white font-semibold px-8 py-4 rounded-2xl border border-white/20 hover:border-sky-500/50 hover:bg-sky-500/10 hover:shadow-[0_0_20px_rgba(14,165,233,0.2)] transition-all text-base">
            <div className="w-8 h-8 rounded-full bg-white/10 group-hover:bg-sky-500/20 flex items-center justify-center transition-colors">
              <Shield className="w-3.5 h-3.5 text-white group-hover:text-sky-400" />
            </div>
            Manager Portal
          </button>
        </div>

        {/* Dashboard preview */}
        <div className="relative max-w-4xl mx-auto">
          <div className="glass rounded-2xl p-1 shadow-2xl shadow-black/60 border-white/10">
            {/* Fake browser chrome */}
            <div className="bg-slate-800/80 rounded-t-xl px-4 py-2.5 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              </div>
              <div className="flex-1 bg-slate-700/60 rounded-md h-5 mx-4 flex items-center px-3">
                <span className="text-slate-400 text-xs">app.taskflow.io/manager/dashboard</span>
              </div>
            </div>
            {/* Dashboard mockup */}
            <div className="bg-[#060b18] rounded-b-xl p-5 text-left min-h-[240px]">
              {/* Mock sidebar + content */}
              <div className="flex gap-4 h-48">
                {/* Mini sidebar */}
                <div className="w-28 bg-[#070d1a] rounded-xl p-3 space-y-2 shrink-0">
                  {["Dashboard","Tasks","Employees","Reports"].map((l, i) => (
                    <div key={l} className={`rounded-lg px-2 py-1.5 text-xs font-medium ${i === 0 ? "bg-sky-500/20 text-sky-400" : "text-slate-500"}`}>
                      {l}
                    </div>
                  ))}
                </div>
                {/* Mock content */}
                <div className="flex-1 space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    {[["24", "Total Tasks", "text-sky-400"], ["18", "Completed", "text-emerald-400"], ["3", "Overdue", "text-rose-400"]].map(([v, l, c]) => (
                      <div key={l} className="bg-slate-800/60 rounded-xl p-3">
                        <div className={`text-xl font-bold ${c}`}>{v}</div>
                        <div className="text-slate-500 text-xs mt-0.5">{l}</div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-slate-800/60 rounded-xl p-3 h-24 flex items-end gap-1">
                    {[40, 65, 50, 80, 70, 90, 75].map((h, i) => (
                      <div key={i} className="flex-1 bg-gradient-to-t from-sky-600 to-sky-400 rounded-sm opacity-80" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Glow under dashboard */}
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-16 bg-sky-500/15 blur-2xl rounded-full" />
        </div>
      </div>
    </section>
  );
}

function StatsBar() {
  const { ref, inView } = useInView(0.3);
  return (
    <section ref={ref} className="relative py-16 bg-[#040810] border-y border-white/5">
      <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        {stats.map(({ value, suffix, label }) => (
          <div key={label} className="space-y-1">
            <div className="text-3xl md:text-4xl font-black text-white" style={{ fontFamily: "var(--font-display)" }}>
              {inView ? <Counter target={value} suffix={suffix} /> : "—"}
            </div>
            <p className="text-slate-500 text-sm font-medium">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FeaturesSection() {
  const { ref, inView } = useInView(0.1);
  return (
    <section id="features" className="relative py-24 bg-[#040810]">
      <div className="absolute inset-0 opacity-[0.04] bg-[radial-gradient(ellipse_80%_60%_at_50%_50%,rgba(14,165,233,1),transparent)]" />
      <div className="relative max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="inline-block text-sky-400 text-sm font-semibold tracking-widest uppercase mb-4">Features</span>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4" style={{ fontFamily: "var(--font-display)" }}>
            Everything your team needs
          </h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            A complete workspace — not just another to-do app.
          </p>
        </div>

        <div ref={ref} className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children ${inView ? "page-enter-up" : "opacity-0"}`}>
          {features.map(({ icon: Icon, title, desc, color }) => (
            <div key={title} className="group glass rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 card-lift border-white/[0.06] cursor-default">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                <Icon className="w-6 h-6 text-white" strokeWidth={1.75} />
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              <div className="mt-4 flex items-center gap-1 text-sky-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                Learn more <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const { ref, inView } = useInView(0.2);
  return (
    <section id="how-it-works" className="relative py-24 bg-[#020612]">
      <div className="orb w-[600px] h-[600px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-violet-600/08" style={{ animationDelay: "2s" }} />
      <div className="relative max-w-5xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="inline-block text-violet-400 text-sm font-semibold tracking-widest uppercase mb-4">How it works</span>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4" style={{ fontFamily: "var(--font-display)" }}>
            Up and running in minutes
          </h2>
        </div>
        <div ref={ref} className={`grid grid-cols-1 md:grid-cols-3 gap-8 stagger-children ${inView ? "page-enter-up" : "opacity-0"}`}>
          {steps.map(({ num, icon: Icon, title, desc }, i) => (
            <div key={num} className="relative text-center">
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-px bg-gradient-to-r from-white/20 to-transparent" />
              )}
              <div className="relative inline-flex flex-col items-center">
                <div className="w-20 h-20 rounded-2xl glass border-white/10 flex items-center justify-center mb-5 mx-auto relative">
                  <Icon className="w-8 h-8 text-sky-400" strokeWidth={1.5} />
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 text-white text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
                <h3 className="text-white font-bold text-lg mb-2">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed max-w-xs">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  const { ref, inView } = useInView(0.15);
  return (
    <section className="relative py-24 bg-[#040810]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-14">
          <span className="inline-block text-emerald-400 text-sm font-semibold tracking-widest uppercase mb-4">Testimonials</span>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4" style={{ fontFamily: "var(--font-display)" }}>
            Loved by teams
          </h2>
        </div>
        <div ref={ref} className={`grid grid-cols-1 md:grid-cols-3 gap-6 stagger-children ${inView ? "page-enter-up" : "opacity-0"}`}>
          {testimonials.map(({ name, role, company, quote, avatar, stars }) => (
            <div key={name} className="glass rounded-2xl p-6 border-white/[0.07] card-lift">
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: stars }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-slate-300 text-sm leading-relaxed mb-5">"{quote}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {avatar}
                </div>
                <div>
                  <div className="text-white text-sm font-semibold">{name}</div>
                  <div className="text-slate-500 text-xs">{role} · {company}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection({ onLogin }: { onLogin: (role: "manager" | "employee") => void }) {
  const { ref, inView } = useInView(0.3);
  return (
    <section className="relative py-28 bg-[#020612] overflow-hidden">
      <div className="orb w-[600px] h-[400px] top-0 left-1/2 -translate-x-1/2 bg-sky-500/10" />
      <div ref={ref} className={`relative max-w-3xl mx-auto px-6 text-center ${inView ? "page-enter-up" : "opacity-0"}`}>
        <h2 className="text-4xl md:text-6xl font-black text-white mb-5 leading-tight" style={{ fontFamily: "var(--font-display)" }}>
          Ready to transform<br />your team?
        </h2>
        <p className="text-slate-400 text-lg mb-10 max-w-xl mx-auto">
          Join thousands of teams already using TaskFlow to ship faster and work smarter.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button onClick={() => onLogin("employee")}
            className="btn-glow flex items-center justify-center gap-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white font-semibold px-8 py-4 rounded-2xl text-base shadow-xl shadow-sky-500/30">
            Start as Employee <ArrowRight className="w-4 h-4" />
          </button>
          <button onClick={() => onLogin("manager")}
            className="btn-glow flex items-center justify-center gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold px-8 py-4 rounded-2xl text-base shadow-xl shadow-violet-500/30">
            Manager Portal <Shield className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-[#020409] border-t border-white/5 py-12">
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" strokeWidth={2} />
          </div>
          <span className="text-white font-bold text-base" style={{ fontFamily: "var(--font-display)" }}>TaskFlow</span>
        </div>
        <div className="flex items-center gap-6 text-slate-500 text-sm">
          {["Privacy", "Terms", "Security", "Contact"].map(l => (
            <button key={l} onClick={() => toast.info(`${l} information coming in v2.0!`)} className="hover:text-slate-300 transition-colors">{l}</button>
          ))}
        </div>
        <p className="text-slate-600 text-sm">© 2026 TaskFlow. All rights reserved.</p>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();

  const handleLogin = (role: "manager" | "employee") => {
    navigate(`/login?role=${role}`);
  };

  return (
    <div className="min-h-screen">
      <NavBar onLogin={handleLogin} />
      
      <HeroSection onLogin={handleLogin} />

      <StatsBar />
      <FeaturesSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <CTASection onLogin={handleLogin} />
      <Footer />
    </div>
  );
}
