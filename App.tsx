import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext.tsx";
import { AttendanceWidget } from "./components/AttendanceWidget.tsx";
import { LeaveWidget } from "./components/LeaveWidget.tsx";
import { PayrollWidget } from "./components/PayrollWidget.tsx";
import { EmployeeDirectory } from "./components/EmployeeDirectory.tsx";
import { AIPanel } from "./components/AIPanel.tsx";
import OrgStructure from "./components/OrgStructure.tsx";
import DocLocker from "./components/DocLocker.tsx";
import AttendanceHeatmap from "./components/AttendanceHeatmap.tsx";
import PaycheckSimulator from "./components/PaycheckSimulator.tsx";
import RewardsVouchers from "./components/RewardsVouchers.tsx";
import SupportDesk from "./components/SupportDesk.tsx";
import Recruitment from "./components/Recruitment.tsx";
import AnalyticsHub from "./components/AnalyticsHub.tsx";
import { WorkSphereLogo } from "./components/WorkSphereLogo.tsx";
import { 
  Users, Calendar, CreditCard, Clock, Bot, LogOut, Sun, Moon, 
  Bell, Award, Briefcase, Activity, CalendarDays, ShieldAlert,
  ArrowRight, Key, Mail, CheckCircle2, AlertTriangle, ShieldCheck,
  Network, Lock, CalendarRange, Landmark, Gift, LifeBuoy, UserPlus,
  BarChart2, CalendarCheck, Palmtree, Trophy, Menu, X, PanelLeft
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
// @ts-ignore
import auraBotImg from "./assets/images/aura_bot_1783154193905.jpg";

function RootApp() {
  const { 
    token, user, employee, notifications, activeRole, markAsRead,
    signUp, verifyEmail, signIn, signOut, toggleRole, isLoading
  } = useAuth();

  const [darkMode, setDarkMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [systemDate, setSystemDate] = useState(() => 
    new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    })
  );

  useEffect(() => {
    const updateDate = () => {
      setSystemDate(
        new Date().toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric"
        })
      );
    };

    updateDate();
    const timer = setInterval(updateDate, 5000);

    const handleFocus = () => updateDate();
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, []);

  const [activeModule, setActiveModule] = useState<
    "directory" | "org" | "attendance" | "heatmap" | "leave" | "payroll" | "simulator" | "locker" | "rewards" | "ai" | "support" | "recruitment" | "analytics"
  >("directory");
  const [showNotifications, setShowNotifications] = useState(false);
  const [readEmpNotifIds, setReadEmpNotifIds] = useState<string[]>([]);
  
  // Sign In / Up State
  const [isSignUp, setIsSignUp] = useState(false);
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");

  // Input states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [role, setRole] = useState("EMPLOYEE");
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState("");
  
  const [verificationCode, setVerificationCode] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Stats / Dashboard snapshots
  const [summaryData, setSummaryData] = useState<any>(null);

  const fetchSummary = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/dashboard/summary", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSummaryData(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  // Re-evaluate user token and trigger immediate dashboard data fetch upon successful session establishment
  useEffect(() => {
    if (token) {
      // Clear form states & verification overlays to transition cleanly to authorized dashboard view
      setFormError(null);
      setSuccessMsg(null);
      setVerificationRequired(false);
      
      // Perform immediate dashboard data fetch
      fetchSummary();
    }
  }, [token, activeRole, activeModule]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMsg(null);
    try {
      await signIn({ email, password });
      setEmail("");
      setPassword("");
    } catch (err: any) {
      if (err.message.startsWith("UNVERIFIED:")) {
        const code = err.message.split(":")[1];
        setVerificationEmail(email);
        setVerificationRequired(true);
        setFormError(`Your email is not verified yet. Verification code is: ${code}`);
      } else {
        setFormError(err.message || "Failed to sign in.");
      }
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMsg(null);

    try {
      const res = await signUp({
        email, password, role, name, phone, address, jobTitle, department
      });
      setVerificationEmail(email);
      setVerificationRequired(true);
      setSuccessMsg(`Registration initiated! Your 6-digit email verification code is: ${res.verificationCode}`);
    } catch (err: any) {
      setFormError(err.message || "Failed to register.");
    }
  };

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const success = await verifyEmail(verificationEmail, verificationCode);
    if (success) {
      setVerificationRequired(false);
      setVerificationCode("");
      setEmail("");
      setPassword("");
    } else {
      setFormError("Invalid verification code. Please try again.");
    }
  };

  const defaultEmpNotifications = [
    {
      id: "emp-notif-1",
      userId: user?.id || "u-002",
      title: "🏆 Achievement Unlocked",
      message: "Congratulations! You've earned the Innovation Excellence Award. +150 reward points have been added to your account.",
      isRead: readEmpNotifIds.includes("emp-notif-1"),
      createdAt: "2026-07-04T02:00:00Z"
    },
    {
      id: "emp-notif-2",
      userId: user?.id || "u-002",
      title: "💳 Salary Credited",
      message: "Your July 2026 salary has been successfully credited to your registered bank account.",
      isRead: readEmpNotifIds.includes("emp-notif-2"),
      createdAt: "2026-07-03T10:00:00Z"
    },
    {
      id: "emp-notif-3",
      userId: user?.id || "u-002",
      title: "📄 Payslip Available",
      message: "Your July 2026 payslip is now available. You can download it from the Payroll section.",
      isRead: readEmpNotifIds.includes("emp-notif-3"),
      createdAt: "2026-07-03T09:00:00Z"
    },
    {
      id: "emp-notif-4",
      userId: user?.id || "u-002",
      title: "📅 Leave Request Approved",
      message: "Your leave request for 10–14 July 2026 has been approved by your reporting manager.",
      isRead: readEmpNotifIds.includes("emp-notif-4"),
      createdAt: "2026-07-02T15:00:00Z"
    },
    {
      id: "emp-notif-5",
      userId: user?.id || "u-002",
      title: "🤖 WorkSphere AI Insight",
      message: "Great job! Your attendance this month is 98%, placing you among the Top 10% of employees in your department.",
      isRead: readEmpNotifIds.includes("emp-notif-5"),
      createdAt: "2026-07-02T08:00:00Z"
    }
  ];

  const currentNotifications = activeRole === "EMPLOYEE" ? defaultEmpNotifications : notifications;

  const unreadNotifsCount = currentNotifications.filter(n => !n.isRead).length;

  const handleMarkAsRead = (id: string) => {
    if (id.startsWith("emp-notif-")) {
      setReadEmpNotifIds(prev => [...prev, id]);
    } else {
      markAsRead(id);
    }
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center transition-colors duration-300 ${darkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-800"}`}>
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-blue-600/20 border-t-blue-600 animate-spin"></div>
            <WorkSphereLogo size={28} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <div className="text-center">
            <h3 className="font-extrabold text-sm tracking-tight uppercase text-blue-500">WorkSphere Engine</h3>
            <span className="text-[10px] text-slate-400 block tracking-wider uppercase mt-1 animate-pulse">Loading secure profile...</span>
          </div>
        </div>
      </div>
    );
  }

  // Render Authentication and Onboarding Splash Screens
  if (!token) {
    return (
      <div className={`min-h-screen flex flex-col justify-between transition-colors duration-300 ${darkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-800"}`}>
        {/* Landing Page Navbar */}
        <header className={`p-4 border-b flex items-center justify-between ${darkMode ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200"}`}>
          <div className="flex items-center gap-2.5">
            <WorkSphereLogo size={32} />
            <div>
              <h1 className="font-extrabold text-base tracking-tight bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">WorkSphere Portal</h1>
              <span className="text-[9px] uppercase tracking-wider text-blue-500 font-bold block">Every workday, perfectly aligned</span>
            </div>
          </div>
          <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-xl bg-slate-800/10 hover:bg-slate-800/20 text-slate-400">
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </header>

        {/* Hero Landing + Auth Forms */}
        <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* Landing Side */}
          <div className="md:col-span-6 space-y-5">
            <span className="bg-blue-600/10 text-blue-400 font-bold px-3 py-1 rounded-full text-xs uppercase tracking-wider border border-blue-500/20">
              Demo Ready Platform
            </span>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight">
              A Complete <span className="text-blue-500">Corporate WorkSphere</span> Experience
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed max-w-md">
              A unified system designed to manage staff profiles, coordinate attendance workflows, process leaves, and generate payroll slips under precise real-time AI talent guidelines.
            </p>

            {/* Quick Demo Preloads */}
            <div className="bg-[#050912] border border-blue-900/40 p-4 rounded-2xl max-w-md space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-blue-500" /> Preloaded Demo Credentials:
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button 
                  onClick={() => { setEmail("admin@hrms.com"); setPassword("Password123!"); setIsSignUp(false); }}
                  className="bg-white border border-slate-200 p-2.5 rounded-xl hover:border-slate-300 text-left cursor-pointer transition-colors"
                >
                  <strong className="text-blue-600 block">HR / Admin Login</strong>
                  <span className="text-slate-700">admin@hrms.com</span>
                </button>
                <button 
                  onClick={() => { setEmail("aarav.patel@hrms.com"); setPassword("Password123!"); setIsSignUp(false); }}
                  className="bg-white border border-slate-200 p-2.5 rounded-xl hover:border-slate-300 text-left cursor-pointer transition-colors"
                >
                  <strong className="text-indigo-600 block">Employee Login</strong>
                  <span className="text-slate-700">aarav.patel@hrms.com</span>
                </button>
              </div>
              <p className="text-[10px] text-white">*Password for all preloaded records is: <strong>Password123!</strong></p>
            </div>
          </div>

          {/* Form Side */}
          <div className="md:col-span-6">
            <div className={`p-6 md:p-8 rounded-3xl border shadow-2xl ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
              {verificationRequired ? (
                /* Verification View */
                <form onSubmit={handleVerificationSubmit} className="space-y-4">
                  <div className="text-center space-y-1">
                    <h3 className="text-lg font-bold">Email Verification Required</h3>
                    <p className="text-xs text-slate-400">We've sent a 6-digit confirmation code to {verificationEmail}</p>
                  </div>

                  {successMsg && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-xs leading-normal">
                      {successMsg}
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-400">Verification Code</label>
                    <input
                      type="text"
                      placeholder="e.g. 123456"
                      value={verificationCode}
                      onChange={e => setVerificationCode(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none"
                    />
                  </div>

                  {formError && (
                    <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl text-xs">
                      {formError}
                    </div>
                  )}

                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1">
                    Verify & Login <CheckCircle2 className="w-4 h-4" />
                  </button>
                </form>
              ) : isSignUp ? (
                /* Register Form */
                <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                  <div className="text-center space-y-1">
                    <h3 className="text-lg font-bold">Create Corporate Profile</h3>
                    <p className="text-xs text-slate-400">Submit parameters to trigger HR onboarding workflows.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Full Name</label>
                      <input
                        type="text"
                        placeholder="Aarav Patel"
                        required
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Contact Phone</label>
                      <input
                        type="text"
                        placeholder="+91 91234 56789"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Email Address</label>
                      <input
                        type="email"
                        placeholder="aarav.patel@company.com"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Corporate Role</label>
                      <select
                        value={role}
                        onChange={e => setRole(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300"
                      >
                        <option value="EMPLOYEE">Employee</option>
                        <option value="ADMIN">HR Admin / Officer</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Job Title</label>
                      <input
                        type="text"
                        placeholder="e.g. Software Engineer"
                        value={jobTitle}
                        onChange={e => setJobTitle(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Department</label>
                      <input
                        type="text"
                        placeholder="e.g. Engineering"
                        value={department}
                        onChange={e => setDepartment(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Secure Password</label>
                    <input
                      type="password"
                      placeholder="Minimum 8 chars, Upper, Special..."
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                    />
                  </div>

                  {formError && (
                    <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-2.5 rounded-lg text-xs leading-normal">
                      {formError}
                    </div>
                  )}

                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-xl text-xs cursor-pointer">
                    Register Profile
                  </button>

                  <div className="text-center text-xs mt-3 text-slate-400">
                    Already registered?{" "}
                    <button type="button" onClick={() => { setIsSignUp(false); setFormError(null); }} className="text-blue-400 font-bold underline cursor-pointer">
                      Sign In here
                    </button>
                  </div>
                </form>
              ) : (
                /* Login Form */
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div className="text-center space-y-1">
                    <h3 className="text-lg font-bold">Secure Access Terminal</h3>
                    <p className="text-xs text-slate-400">Enter registered email credentials to authenticate.</p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-400">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. admin@hrms.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-400">Password</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200"
                    />
                  </div>

                  {formError && (
                    <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-2.5 rounded-lg text-xs">
                      {formError}
                    </div>
                  )}

                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer">
                    Log In Snapshot
                  </button>

                  <div className="text-center text-xs mt-3 text-slate-400">
                    Need onboarding?{" "}
                    <button type="button" onClick={() => { setIsSignUp(true); setFormError(null); }} className="text-blue-400 font-bold underline cursor-pointer">
                      Create an account
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </main>

        <footer className="p-4 text-center border-t border-slate-900 text-xs text-slate-500">
          © 2026 WorkSphere Solutions. All workflows and analytics verified under strict sandbox credentials.
        </footer>
      </div>
    );
  }

  // Auth is validated, render standard Employee or Admin application shell
  return (
    <div className={`min-h-[100dvh] flex flex-col lg:flex-row transition-all duration-300 ${darkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}>
      {/* Backdrop for Mobile/Tablet Drawer */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Side Control Rail (Unified Glassmorphism Bento Side Menu with Professional Light Mint Theme) */}
      <aside className={`fixed inset-y-0 left-0 z-50 lg:static lg:z-auto w-64 h-[100dvh] lg:h-auto border-r p-4 flex flex-col justify-between shrink-0 overflow-hidden transform ${
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      } lg:translate-x-0 transition-transform duration-300 ease-in-out overflow-y-auto ${
        darkMode 
          ? "bg-[#0B1512] border-[#162D26]" 
          : "bg-gradient-to-b from-[#C5FAEA]/90 via-[#DCFAF0] to-[#EBFBF5] border-[#9EEAD3] shadow-md"
      }`}>
        {/* Subtle Ambient Glow Background Animation */}
        <div className={`absolute -top-16 -left-16 w-52 h-52 rounded-full blur-3xl pointer-events-none transition-all duration-1000 ${
          darkMode ? "bg-emerald-500/10" : "bg-[#80F4D0]/60 animate-pulse"
        }`} />
        <div className={`absolute -bottom-16 -right-16 w-52 h-52 rounded-full blur-3xl pointer-events-none transition-all duration-1000 ${
          darkMode ? "bg-teal-500/10" : "bg-[#A7F5DD]/50"
        }`} />

        <div className="space-y-5 relative z-10">
          {/* Logo Brand Header - Logo Only (Enlarged & Highlighted) */}
          <div className="flex items-center gap-2 pb-3 border-b border-emerald-950/10 dark:border-slate-800/80 justify-between">
            <div className="relative group flex items-center justify-center p-2 rounded-2xl cursor-pointer hover:scale-105 transition-all duration-300" title="WorkSphere">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/20 via-teal-400/20 to-emerald-400/20 blur-md opacity-50 group-hover:opacity-100 transition-opacity duration-300 animate-pulse pointer-events-none" />
              <WorkSphereLogo size={48} className="relative z-10 drop-shadow-md group-hover:drop-shadow-xl transition-all duration-300" />
            </div>
            
            <div className="flex items-center gap-1">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-xl bg-white/80 dark:bg-slate-800 text-slate-900 dark:text-amber-400 hover:bg-emerald-100 dark:hover:bg-slate-700 cursor-pointer transition-all border border-emerald-300/80 dark:border-slate-700 shadow-2xs hover:scale-105 active:scale-95"
                title="Toggle Dark/Light Mode"
                aria-label="Toggle Dark/Light Mode"
              >
                {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-emerald-900" />}
              </button>
              <button 
                onClick={() => setMobileMenuOpen(false)} 
                className="lg:hidden p-1.5 rounded-xl text-slate-800 hover:text-black dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* User profile segment */}
          <div className="p-3 border rounded-2xl flex items-center gap-3 bg-white/80 dark:bg-slate-950/60 backdrop-blur-md border-[#A2EAD5] dark:border-slate-800/80 shadow-xs hover:shadow-md transition-all hover:border-emerald-400 group">
            <img
              src={employee?.profilePicture || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80"}
              alt="Profile"
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-full object-cover border-2 border-emerald-400/80 dark:border-slate-800 shrink-0 group-hover:scale-105 transition-transform"
            />
            <div className="min-w-0 text-xs">
              <span className="font-black block truncate text-slate-900 dark:text-slate-100 text-sm group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">{employee?.name || "User"}</span>
              <span className="block truncate text-emerald-900/80 dark:text-slate-400 font-extrabold text-[11px]">{employee?.jobTitle || "Corporate Member"}</span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="space-y-1">
            {[
              { id: "directory", label: "Company Directory", icon: Users, color: "text-blue-600 dark:text-blue-400" },
              { id: "org", label: "Org Structure", icon: Network, color: "text-indigo-600 dark:text-indigo-400" },
              { id: "attendance", label: "Attendance Track", icon: Clock, color: "text-emerald-600 dark:text-emerald-400" },
              { id: "heatmap", label: "Yearly Heatmap", icon: CalendarRange, color: "text-amber-600 dark:text-amber-400" },
              { id: "leave", label: "Leave Management", icon: Calendar, color: "text-purple-600 dark:text-purple-400" },
              { id: "payroll", label: "Compensation & Pay", icon: CreditCard, color: "text-sky-600 dark:text-sky-400" },
              { id: "simulator", label: "Paycheck Simulator", icon: Landmark, color: "text-teal-600 dark:text-teal-400" },
              { id: "locker", label: "Document Locker", icon: Lock, color: "text-rose-600 dark:text-rose-400" },
              { id: "rewards", label: "Performance Rewards", icon: Gift, color: "text-pink-600 dark:text-pink-400" },
              { id: "ai", label: "WorkSphere Co-Pilot", icon: Bot, color: "text-cyan-600 dark:text-cyan-400" },
              { id: "support", label: "Support Desk", icon: LifeBuoy, color: "text-orange-600 dark:text-orange-400" },
              { id: "analytics", label: "Analytics & Reports", icon: BarChart2, color: "text-violet-600 dark:text-violet-400" },
              ...(activeRole === "ADMIN" ? [{ id: "recruitment", label: "Recruitment", icon: UserPlus, color: "text-emerald-600 dark:text-emerald-400" }] : [])
            ].map((item) => {
              const IconComp = item.icon;
              const isActive = activeModule === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { setActiveModule(item.id as any); setMobileMenuOpen(false); }}
                  className={`w-full px-3.5 py-2.5 text-xs font-extrabold flex items-center justify-between rounded-xl cursor-pointer transition-all duration-200 group ${
                    isActive 
                      ? "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-md shadow-emerald-600/30 border border-emerald-500/50 translate-x-1" 
                      : "text-slate-800 dark:text-slate-200 hover:bg-white/90 dark:hover:bg-slate-800/80 hover:text-emerald-950 dark:hover:text-white hover:translate-x-1.5 hover:shadow-2xs hover:border-emerald-300/50 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <IconComp className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${isActive ? "text-white" : item.color}`} />
                    <span>{item.label}</span>
                  </div>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-200 animate-ping" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Foot Control */}
        <div className="space-y-2 pt-4 relative z-10 border-t border-emerald-950/10 dark:border-slate-800/80">
          {/* Admin Switching Emulation trigger */}
          {user?.role === "ADMIN" && (
            <button
              onClick={toggleRole}
              className="w-full text-left p-3 rounded-2xl bg-white/80 dark:bg-[#000000] border border-emerald-300 dark:border-indigo-500/30 hover:border-emerald-500 flex items-center gap-2 text-[11px] text-emerald-950 dark:text-indigo-300 cursor-pointer font-black tracking-wide uppercase transition-all hover:scale-[1.01]"
            >
              <Award className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-bounce shrink-0" />
              Switch view as {activeRole === "ADMIN" ? "Employee" : "Admin"}
            </button>
          )}

          <button
            onClick={signOut}
            className="w-full bg-rose-500/10 hover:bg-rose-500/20 border border-rose-400/30 p-2.5 rounded-xl text-xs font-black text-rose-800 dark:text-rose-400 flex items-center justify-center gap-1.5 cursor-pointer transition-all hover:scale-[1.01]"
          >
            <LogOut className="w-4 h-4 shrink-0" /> Logout
          </button>
        </div>
      </aside>

      {/* Main Panel Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* UNIFIED TOP HEADER BAR */}
        <header className={`px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 border-b transition-colors ${
          darkMode ? "bg-slate-900/90 border-slate-800" : "bg-white border-slate-200 shadow-2xs"
        }`}>
          {/* Left: Mobile Menu Button + Prominent Main WorkSphere Heading */}
          <div className="flex items-center gap-3">
            {/* Menu Options Button (Mobile/Tablet) - Compact & Professional Dark Gradient */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 sm:p-2 rounded-xl bg-gradient-to-r from-slate-900 via-slate-850 to-indigo-950 dark:from-slate-950 dark:via-indigo-950 dark:to-slate-900 hover:from-slate-800 hover:to-indigo-900 text-white shadow-xs border border-slate-700/80 dark:border-indigo-800/80 cursor-pointer active:scale-95 transition-all flex items-center justify-center shrink-0 group"
              aria-label="Toggle Navigation Menu"
              title="Toggle Menu Options"
            >
              {mobileMenuOpen ? <X className="w-4 h-4 text-slate-200 group-hover:rotate-90 transition-transform" /> : <Menu className="w-4 h-4 text-slate-200 group-hover:scale-110 transition-transform" />}
            </button>

            {/* Prominent Main WorkSphere Heading & Logo */}
            <div className="relative group flex items-center gap-3 px-1.5 py-1 cursor-pointer select-none transition-all duration-300 hover:scale-[1.01]">
              {/* Subtle Ambient Glowing Backdrop */}
              <div className="absolute -inset-1.5 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-teal-400/10 opacity-0 group-hover:opacity-100 blur-md transition-opacity duration-300 pointer-events-none" />
              
              {/* Animated Floating WorkSphere Logo */}
              <div className="relative z-10 animate-logo-float drop-shadow-xs transition-all">
                <WorkSphereLogo size={42} className="shrink-0" />
              </div>

              {/* Shimmering Professional Gradient Title (Refined Lighter/Balanced Shades) */}
              <h1 className="relative z-10 font-black text-2xl sm:text-3xl lg:text-4xl tracking-tight bg-gradient-to-r from-slate-900 via-indigo-800 to-sky-700 dark:from-white dark:via-sky-200 dark:to-teal-300 bg-clip-text text-transparent leading-none bg-[length:200%_auto] animate-gradient-shimmer filter drop-shadow-xs">
                WorkSphere
              </h1>

              {/* High-Tech Live System Indicator */}
              <span className="relative z-10 hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/35 shadow-2xs backdrop-blur-xs ml-0.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Live System
              </span>
            </div>
          </div>

          {/* Right: Current Tab Badge (Compact & Right-aligned) + Quick Action Controls */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap ml-auto">
            {/* Current Tab Indicator (Smaller & on the Right Hand Side) */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/90 dark:bg-slate-950 text-slate-200 shadow-2xs border border-slate-800 text-[10px] sm:text-[11px] font-extrabold tracking-wide">
              {activeModule === "directory" && <Users className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
              {activeModule === "org" && <Network className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
              {activeModule === "attendance" && <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
              {activeModule === "heatmap" && <CalendarRange className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
              {activeModule === "leave" && <Calendar className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
              {activeModule === "payroll" && <CreditCard className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
              {activeModule === "simulator" && <Landmark className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
              {activeModule === "locker" && <Lock className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
              {activeModule === "rewards" && <Gift className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
              {activeModule === "ai" && <Bot className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
              {activeModule === "support" && <LifeBuoy className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
              {activeModule === "analytics" && <BarChart2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
              {activeModule === "recruitment" && <UserPlus className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
              <span className="font-extrabold uppercase tracking-wider text-white">
                {activeModule === "directory" ? "Company Directory" : 
                 activeModule === "org" ? "Org Structure" : 
                 activeModule === "attendance" ? "Attendance Track" : 
                 activeModule === "heatmap" ? "Yearly Heatmap" : 
                 activeModule === "leave" ? "Leave Portal" : 
                 activeModule === "payroll" ? "Compensation & Payroll" : 
                 activeModule === "simulator" ? "Paycheck Simulator" : 
                 activeModule === "locker" ? "Doc Locker" : 
                 activeModule === "rewards" ? "Performance Rewards" : 
                 activeModule === "ai" ? "WorkSphere Co-Pilot" : 
                 activeModule === "support" ? "Support Desk" : 
                 activeModule === "analytics" ? "Analytics" : "Recruitment"}
              </span>
            </div>
            {/* System Date Badge */}
            <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold ${
              darkMode ? "bg-slate-950/80 border-slate-800 text-slate-300" : "bg-slate-100 border-slate-300 text-slate-800"
            }`}>
              <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <strong className="font-black font-mono text-black dark:text-white">{systemDate}</strong>
            </div>

            {/* Role Badge */}
            <div className={`px-3 py-1.5 rounded-xl border text-xs font-black uppercase tracking-wide flex items-center gap-1.5 ${
              activeRole === "ADMIN" 
                ? "bg-purple-100 dark:bg-purple-950/60 text-purple-950 dark:text-purple-300 border-purple-300 dark:border-purple-800"
                : "bg-blue-100 dark:bg-blue-950/60 text-blue-950 dark:text-blue-300 border-blue-300 dark:border-blue-800"
            }`}>
              <span className={`w-2 h-2 rounded-full ${activeRole === "ADMIN" ? "bg-purple-600" : "bg-blue-600"}`} />
              <span>{activeRole}</span>
            </div>

            {/* Admin View Switcher Button */}
            {user?.role === "ADMIN" && (
              <button
                onClick={toggleRole}
                className="px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 dark:hover:bg-amber-900/80 border border-amber-300 dark:border-amber-700/80 text-amber-950 dark:text-amber-300 text-xs font-black cursor-pointer transition-all flex items-center gap-1.5 shadow-2xs"
                title="Switch view between Admin and Employee"
              >
                <Award className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="hidden md:inline">View as:</span>
                <strong className="underline decoration-amber-500 font-extrabold">{activeRole === "ADMIN" ? "Employee" : "Admin"}</strong>
              </button>
            )}

            {/* Dark / Light Theme Toggle - Vibrant Solar Amber/Violet Gradient */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 dark:from-indigo-600 dark:via-purple-600 dark:to-pink-600 text-white hover:scale-110 active:scale-95 transition-all shadow-md shadow-amber-500/20 dark:shadow-purple-500/30 border border-amber-300 dark:border-purple-400 cursor-pointer flex items-center justify-center shrink-0 group"
              title="Toggle Dark/Light Mode"
              aria-label="Toggle Dark/Light Mode"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-200 group-hover:rotate-45 transition-transform" /> : <Moon className="w-4 h-4 text-white group-hover:-rotate-12 transition-transform" />}
            </button>

            {/* Notification Bell - Electric Fuchsia/Rose Gradient */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 hover:from-violet-700 hover:to-pink-700 text-white shadow-md shadow-fuchsia-500/25 border border-fuchsia-300 dark:border-fuchsia-400/60 relative cursor-pointer active:scale-95 hover:scale-110 transition-all font-bold shrink-0 group"
                aria-label="Notifications"
                title="Notification Center"
              >
                <Bell className="w-4 h-4 text-white group-hover:rotate-12 transition-transform" />
                {unreadNotifsCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-amber-400 text-slate-950 text-[10px] flex items-center justify-center font-black shadow-xs animate-bounce">
                    {unreadNotifsCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="fixed sm:absolute top-16 sm:top-full left-3 right-3 sm:left-auto sm:right-0 sm:mt-2 w-auto sm:w-96 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden text-xs"
                  >
                    <div className="bg-slate-100 dark:bg-slate-950 px-4 py-3 border-b border-slate-250 dark:border-slate-800 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-950 dark:text-slate-100 text-xs sm:text-sm">Notification Center</span>
                        {unreadNotifsCount > 0 && (
                          <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                            {unreadNotifsCount} new
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => {
                            currentNotifications.forEach(n => handleMarkAsRead(n.id));
                          }} 
                          className="text-[10px] text-blue-700 dark:text-blue-400 font-black hover:underline cursor-pointer"
                        >
                          Mark all read
                        </button>
                        <button onClick={() => setShowNotifications(false)} className="p-1 rounded-md text-slate-600 hover:text-black dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="divide-y divide-slate-150 dark:divide-slate-800/80 max-h-[380px] sm:max-h-[440px] overflow-y-auto p-1.5 scrollbar-thin scrollbar-thumb-slate-700">
                      {currentNotifications.length === 0 ? (
                        <p className="p-6 text-slate-700 dark:text-slate-400 text-center italic font-medium">No new notifications.</p>
                      ) : (
                        currentNotifications.map(notif => (
                          <div 
                            key={notif.id} 
                            onClick={() => handleMarkAsRead(notif.id)}
                            className={`p-3.5 rounded-xl cursor-pointer transition-all ${
                              notif.isRead 
                                ? "bg-transparent opacity-75 hover:opacity-100" 
                                : "bg-blue-50 dark:bg-blue-600/15 border-l-4 border-l-blue-600 shadow-2xs"
                            }`}
                          >
                            <div className="flex justify-between items-start gap-2 font-bold mb-1">
                              <span className="text-slate-950 dark:text-slate-100 text-xs sm:text-sm font-black leading-tight">{notif.title}</span>
                              <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium shrink-0">{notif.createdAt.split("T")[0]}</span>
                            </div>
                            <p className="text-slate-900 dark:text-slate-300 text-xs leading-relaxed whitespace-pre-line break-words font-medium">{notif.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* User Badge Tag */}
            <div className="hidden lg:flex items-center gap-2 pl-2 pr-3 py-1 bg-white dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 shadow-2xs">
              <img
                src={employee?.profilePicture || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80"}
                alt="User Avatar"
                referrerPolicy="no-referrer"
                className="w-6 h-6 rounded-full object-cover border border-slate-300 dark:border-slate-700 shrink-0"
              />
              <span className="font-black text-slate-950 dark:text-slate-100 max-w-[120px] truncate">{employee?.name}</span>
            </div>

            {/* Logout Button */}
            <button
              onClick={signOut}
              className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 cursor-pointer transition-colors shadow-2xs flex items-center gap-1 text-xs font-bold"
              title="Log out of application"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Dashboard Panels Area */}
        <div className="p-4 sm:p-6 space-y-6 flex-1">
          {/* Stats Bento Grid Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-5">
            {activeRole === "ADMIN" ? (
              <>
                {/* Admin Card 1 - Company Staff */}
                <div 
                  className={`relative p-3.5 sm:p-5 md:p-6 rounded-2xl sm:rounded-[24px] border transition-all duration-300 hover:shadow-xl hover:scale-[1.01] overflow-hidden flex flex-col justify-between min-h-[140px] sm:min-h-[190px] md:h-[220px] ${
                    darkMode 
                      ? "bg-slate-900/90 border-blue-500/30" 
                      : "bg-gradient-to-br from-[#ebf5ff] via-[#e5f1ff] to-[#dcf0ff] border-[#bfe0ff]"
                  }`}
                >
                  {/* Dot Grid Pattern */}
                  <div className={`absolute top-3 right-3 sm:top-4 sm:right-4 ${darkMode ? "text-blue-500/10" : "text-blue-400/30"}`}>
                    <svg width="24" height="18" viewBox="0 0 32 24" fill="currentColor" className="sm:w-8 sm:h-6">
                      <circle cx="4" cy="4" r="1.5" />
                      <circle cx="12" cy="4" r="1.5" />
                      <circle cx="20" cy="4" r="1.5" />
                      <circle cx="28" cy="4" r="1.5" />
                      <circle cx="4" cy="12" r="1.5" />
                      <circle cx="12" cy="12" r="1.5" />
                      <circle cx="20" cy="12" r="1.5" />
                      <circle cx="28" cy="12" r="1.5" />
                      <circle cx="4" cy="20" r="1.5" />
                      <circle cx="12" cy="20" r="1.5" />
                      <circle cx="20" cy="20" r="1.5" />
                      <circle cx="28" cy="20" r="1.5" />
                    </svg>
                  </div>

                  {/* Wave Layer decoration at the bottom right */}
                  <div className="absolute bottom-0 right-0 left-0 h-[40%] pointer-events-none overflow-hidden rounded-b-2xl sm:rounded-b-[24px]">
                    <svg className="absolute bottom-0 right-0 w-full h-full opacity-70" viewBox="0 0 160 80" preserveAspectRatio="none" fill="none">
                      <path d="M-20 80 Q 40 40 100 65 T 180 30 L 180 80 Z" fill={darkMode ? "#1e3a8a" : "#93c5fd"} opacity={darkMode ? "0.2" : "0.35"} />
                      <path d="M-20 80 Q 50 25 110 50 T 180 15 L 180 80 Z" fill={darkMode ? "#3b82f6" : "#60a5fa"} opacity={darkMode ? "0.15" : "0.2"} />
                    </svg>
                  </div>

                  {/* Card Content */}
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                        <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className={`text-[11px] sm:text-[13px] md:text-[14px] font-black leading-tight truncate ${darkMode ? "text-slate-100" : "text-black"}`}>
                          Company
                        </span>
                        <span className={`text-[11px] sm:text-[13px] md:text-[14px] font-black leading-tight truncate ${darkMode ? "text-slate-100" : "text-black"}`}>
                          Staff
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 sm:mt-3 md:mt-4 flex flex-col">
                      <span className={`text-2xl sm:text-4xl md:text-[48px] font-black leading-none tracking-tight ${darkMode ? "text-blue-400" : "text-blue-950"}`}>
                        {summaryData?.stats?.totalEmployees || 0}
                      </span>
                      <span className={`text-[11px] sm:text-[13px] md:text-[14px] font-extrabold mt-0.5 sm:mt-1 ${darkMode ? "text-slate-400" : "text-slate-900"}`}>
                        Members
                      </span>
                    </div>
                  </div>

                  {/* Bottom Badge */}
                  <div className="relative z-10 mt-2 sm:mt-auto">
                    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full border text-[10px] sm:text-[12px] font-black shadow-xs ${
                      darkMode 
                        ? "bg-slate-800/90 text-blue-400 border-slate-700/80" 
                        : "bg-white/95 text-blue-950 border-blue-200"
                    }`}>
                      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-blue-600"></span>
                      Active HQ
                    </div>
                  </div>
                </div>

                {/* Admin Card 2 - Leaves Awaiting */}
                <div 
                  className={`relative p-3.5 sm:p-5 md:p-6 rounded-2xl sm:rounded-[24px] border transition-all duration-300 hover:shadow-xl hover:scale-[1.01] overflow-hidden flex flex-col justify-between min-h-[140px] sm:min-h-[190px] md:h-[220px] ${
                    darkMode 
                      ? "bg-slate-900/90 border-purple-500/30" 
                      : "bg-gradient-to-br from-[#f5f0ff] via-[#f0e5ff] to-[#ebdfff] border-[#e1ccff]"
                  }`}
                >
                  {/* Dot Grid Pattern */}
                  <div className={`absolute top-3 right-3 sm:top-4 sm:right-4 ${darkMode ? "text-purple-500/10" : "text-purple-400/30"}`}>
                    <svg width="24" height="18" viewBox="0 0 32 24" fill="currentColor" className="sm:w-8 sm:h-6">
                      <circle cx="4" cy="4" r="1.5" />
                      <circle cx="12" cy="4" r="1.5" />
                      <circle cx="20" cy="4" r="1.5" />
                      <circle cx="28" cy="4" r="1.5" />
                      <circle cx="4" cy="12" r="1.5" />
                      <circle cx="12" cy="12" r="1.5" />
                      <circle cx="20" cy="12" r="1.5" />
                      <circle cx="28" cy="12" r="1.5" />
                      <circle cx="4" cy="20" r="1.5" />
                      <circle cx="12" cy="20" r="1.5" />
                      <circle cx="20" cy="20" r="1.5" />
                      <circle cx="28" cy="20" r="1.5" />
                    </svg>
                  </div>

                  {/* Wave Layer decoration at the bottom right */}
                  <div className="absolute bottom-0 right-0 left-0 h-[40%] pointer-events-none overflow-hidden rounded-b-2xl sm:rounded-b-[24px]">
                    <svg className="absolute bottom-0 right-0 w-full h-full opacity-70" viewBox="0 0 160 80" preserveAspectRatio="none" fill="none">
                      <path d="M-20 80 Q 40 40 100 65 T 180 30 L 180 80 Z" fill={darkMode ? "#3b0764" : "#ddd6fe"} opacity={darkMode ? "0.2" : "0.35"} />
                      <path d="M-20 80 Q 50 25 110 50 T 180 15 L 180 80 Z" fill={darkMode ? "#8b5cf6" : "#c084fc"} opacity={darkMode ? "0.15" : "0.2"} />
                    </svg>
                  </div>

                  {/* Card Content */}
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-full bg-purple-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                        <CalendarRange className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className={`text-[11px] sm:text-[13px] md:text-[14px] font-black leading-tight truncate ${darkMode ? "text-slate-100" : "text-black"}`}>
                          Leaves
                        </span>
                        <span className={`text-[11px] sm:text-[13px] md:text-[14px] font-black leading-tight truncate ${darkMode ? "text-slate-100" : "text-black"}`}>
                          Awaiting
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 sm:mt-3 md:mt-4 flex flex-col">
                      <span className={`text-2xl sm:text-4xl md:text-[48px] font-black leading-none tracking-tight ${darkMode ? "text-purple-400" : "text-purple-950"}`}>
                        {summaryData?.stats?.pendingLeavesCount || 0}
                      </span>
                      <span className={`text-[11px] sm:text-[13px] md:text-[14px] font-extrabold mt-0.5 sm:mt-1 ${darkMode ? "text-slate-400" : "text-slate-900"}`}>
                        Pending
                      </span>
                    </div>
                  </div>

                  {/* Bottom Badge */}
                  <div className="relative z-10 mt-2 sm:mt-auto">
                    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full border text-[10px] sm:text-[12px] font-black shadow-xs ${
                      darkMode 
                        ? "bg-slate-800/90 text-purple-400 border-slate-700/80" 
                        : "bg-white/95 text-purple-950 border-purple-200"
                    }`}>
                      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-purple-600"></span>
                      Workflow
                    </div>
                  </div>
                </div>

                {/* Admin Card 3 - Today Absent */}
                <div 
                  className={`relative p-3.5 sm:p-5 md:p-6 rounded-2xl sm:rounded-[24px] border transition-all duration-300 hover:shadow-xl hover:scale-[1.01] overflow-hidden flex flex-col justify-between min-h-[140px] sm:min-h-[190px] md:h-[220px] ${
                    darkMode 
                      ? "bg-slate-900/90 border-amber-500/30" 
                      : "bg-gradient-to-br from-[#fffbeb] via-[#fef6d5] to-[#fef2c3] border-[#fde68a]"
                  }`}
                >
                  {/* Dot Grid Pattern */}
                  <div className={`absolute top-3 right-3 sm:top-4 sm:right-4 ${darkMode ? "text-amber-500/10" : "text-amber-400/30"}`}>
                    <svg width="24" height="18" viewBox="0 0 32 24" fill="currentColor" className="sm:w-8 sm:h-6">
                      <circle cx="4" cy="4" r="1.5" />
                      <circle cx="12" cy="4" r="1.5" />
                      <circle cx="20" cy="4" r="1.5" />
                      <circle cx="28" cy="4" r="1.5" />
                      <circle cx="4" cy="12" r="1.5" />
                      <circle cx="12" cy="12" r="1.5" />
                      <circle cx="20" cy="12" r="1.5" />
                      <circle cx="28" cy="12" r="1.5" />
                      <circle cx="4" cy="20" r="1.5" />
                      <circle cx="12" cy="20" r="1.5" />
                      <circle cx="20" cy="20" r="1.5" />
                      <circle cx="28" cy="20" r="1.5" />
                    </svg>
                  </div>

                  {/* Wave Layer decoration at the bottom right */}
                  <div className="absolute bottom-0 right-0 left-0 h-[40%] pointer-events-none overflow-hidden rounded-b-2xl sm:rounded-b-[24px]">
                    <svg className="absolute bottom-0 right-0 w-full h-full opacity-70" viewBox="0 0 160 80" preserveAspectRatio="none" fill="none">
                      <path d="M-20 80 Q 40 40 100 65 T 180 30 L 180 80 Z" fill={darkMode ? "#78350f" : "#fde68a"} opacity={darkMode ? "0.2" : "0.35"} />
                      <path d="M-20 80 Q 50 25 110 50 T 180 15 L 180 80 Z" fill={darkMode ? "#d97706" : "#fcd34d"} opacity={darkMode ? "0.15" : "0.2"} />
                    </svg>
                  </div>

                  {/* Card Content */}
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-full bg-amber-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                        <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className={`text-[11px] sm:text-[13px] md:text-[14px] font-black leading-tight truncate ${darkMode ? "text-slate-100" : "text-black"}`}>
                          Today
                        </span>
                        <span className={`text-[11px] sm:text-[13px] md:text-[14px] font-black leading-tight truncate ${darkMode ? "text-slate-100" : "text-black"}`}>
                          Absent
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 sm:mt-3 md:mt-4 flex flex-col">
                      <span className={`text-2xl sm:text-4xl md:text-[48px] font-black leading-none tracking-tight ${darkMode ? "text-amber-400" : "text-amber-950"}`}>
                        {summaryData?.stats?.todayAbsents || 0}
                      </span>
                      <span className={`text-[11px] sm:text-[13px] md:text-[14px] font-extrabold mt-0.5 sm:mt-1 ${darkMode ? "text-slate-400" : "text-slate-900"}`}>
                        Absences
                      </span>
                    </div>
                  </div>

                  {/* Bottom Badge */}
                  <div className="relative z-10 mt-2 sm:mt-auto">
                    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full border text-[10px] sm:text-[12px] font-black shadow-xs ${
                      darkMode 
                        ? "bg-slate-800/90 text-amber-400 border-slate-700/80" 
                        : "bg-white/95 text-amber-950 border-amber-200"
                    }`}>
                      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-600"></span>
                      Not Clocked
                    </div>
                  </div>
                </div>

                {/* Admin Card 4 - Today Present */}
                <div 
                  className={`relative p-3.5 sm:p-5 md:p-6 rounded-2xl sm:rounded-[24px] border transition-all duration-300 hover:shadow-xl hover:scale-[1.01] overflow-hidden flex flex-col justify-between min-h-[140px] sm:min-h-[190px] md:h-[220px] ${
                    darkMode 
                      ? "bg-slate-900/90 border-emerald-500/30" 
                      : "bg-gradient-to-br from-[#f0fdf4] via-[#e6fcf0] to-[#dbfce9] border-[#bbf7d0]"
                  }`}
                >
                  {/* Dot Grid Pattern */}
                  <div className={`absolute top-3 right-3 sm:top-4 sm:right-4 ${darkMode ? "text-emerald-500/10" : "text-emerald-400/30"}`}>
                    <svg width="24" height="18" viewBox="0 0 32 24" fill="currentColor" className="sm:w-8 sm:h-6">
                      <circle cx="4" cy="4" r="1.5" />
                      <circle cx="12" cy="4" r="1.5" />
                      <circle cx="20" cy="4" r="1.5" />
                      <circle cx="28" cy="4" r="1.5" />
                      <circle cx="4" cy="12" r="1.5" />
                      <circle cx="12" cy="12" r="1.5" />
                      <circle cx="20" cy="12" r="1.5" />
                      <circle cx="28" cy="12" r="1.5" />
                      <circle cx="4" cy="20" r="1.5" />
                      <circle cx="12" cy="20" r="1.5" />
                      <circle cx="20" cy="20" r="1.5" />
                      <circle cx="28" cy="20" r="1.5" />
                    </svg>
                  </div>

                  {/* Wave Layer decoration at the bottom right */}
                  <div className="absolute bottom-0 right-0 left-0 h-[40%] pointer-events-none overflow-hidden rounded-b-2xl sm:rounded-b-[24px]">
                    <svg className="absolute bottom-0 right-0 w-full h-full opacity-70" viewBox="0 0 160 80" preserveAspectRatio="none" fill="none">
                      <path d="M-20 80 Q 40 40 100 65 T 180 30 L 180 80 Z" fill={darkMode ? "#064e3b" : "#bbf7d0"} opacity={darkMode ? "0.2" : "0.35"} />
                      <path d="M-20 80 Q 50 25 110 50 T 180 15 L 180 80 Z" fill={darkMode ? "#10b981" : "#86efac"} opacity={darkMode ? "0.15" : "0.2"} />
                    </svg>
                  </div>

                  {/* Card Content */}
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-full bg-emerald-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                        <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className={`text-[11px] sm:text-[13px] md:text-[14px] font-black leading-tight truncate ${darkMode ? "text-slate-100" : "text-black"}`}>
                          Today
                        </span>
                        <span className={`text-[11px] sm:text-[13px] md:text-[14px] font-black leading-tight truncate ${darkMode ? "text-slate-100" : "text-black"}`}>
                          Present
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 sm:mt-3 md:mt-4 flex flex-col">
                      <span className={`text-2xl sm:text-4xl md:text-[48px] font-black leading-none tracking-tight ${darkMode ? "text-emerald-400" : "text-emerald-950"}`}>
                        {summaryData?.stats?.todayPresents || 0}
                      </span>
                      <span className={`text-[11px] sm:text-[13px] md:text-[14px] font-extrabold mt-0.5 sm:mt-1 ${darkMode ? "text-slate-400" : "text-slate-900"}`}>
                        Staff
                      </span>
                    </div>
                  </div>

                  {/* Bottom Badge */}
                  <div className="relative z-10 mt-2 sm:mt-auto">
                    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full border text-[10px] sm:text-[12px] font-black shadow-xs ${
                      darkMode 
                        ? "bg-slate-800/90 text-emerald-400 border-slate-700/80" 
                        : "bg-white/95 text-emerald-950 border-emerald-200"
                    }`}>
                      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-600"></span>
                      Checked-In
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Card 1 – Self Checked-In Days */}
                <div 
                  className={`relative p-3.5 sm:p-5 md:p-6 rounded-2xl sm:rounded-[24px] border transition-all duration-300 hover:shadow-xl hover:scale-[1.01] overflow-hidden flex flex-col justify-between min-h-[140px] sm:min-h-[190px] md:h-[220px] ${
                    darkMode 
                      ? "bg-slate-900/90 border-blue-500/30" 
                      : "bg-gradient-to-br from-[#ebf5ff] via-[#e5f1ff] to-[#dcf0ff] border-[#bfe0ff]"
                  }`}
                >
                  {/* Dot Grid Pattern */}
                  <div className={`absolute top-3 right-3 sm:top-4 sm:right-4 ${darkMode ? "text-blue-500/10" : "text-blue-400/30"}`}>
                    <svg width="24" height="18" viewBox="0 0 32 24" fill="currentColor" className="sm:w-8 sm:h-6">
                      <circle cx="4" cy="4" r="1.5" />
                      <circle cx="12" cy="4" r="1.5" />
                      <circle cx="20" cy="4" r="1.5" />
                      <circle cx="28" cy="4" r="1.5" />
                      <circle cx="4" cy="12" r="1.5" />
                      <circle cx="12" cy="12" r="1.5" />
                      <circle cx="20" cy="12" r="1.5" />
                      <circle cx="28" cy="12" r="1.5" />
                      <circle cx="4" cy="20" r="1.5" />
                      <circle cx="12" cy="20" r="1.5" />
                      <circle cx="20" cy="20" r="1.5" />
                      <circle cx="28" cy="20" r="1.5" />
                    </svg>
                  </div>

                  {/* Wave Layer decoration at the bottom right */}
                  <div className="absolute bottom-0 right-0 left-0 h-[40%] pointer-events-none overflow-hidden rounded-b-2xl sm:rounded-b-[24px]">
                    <svg className="absolute bottom-0 right-0 w-full h-full opacity-70" viewBox="0 0 160 80" preserveAspectRatio="none" fill="none">
                      <path d="M-20 80 Q 40 40 100 65 T 180 30 L 180 80 Z" fill={darkMode ? "#1e3a8a" : "#93c5fd"} opacity={darkMode ? "0.2" : "0.35"} />
                      <path d="M-20 80 Q 50 25 110 50 T 180 15 L 180 80 Z" fill={darkMode ? "#3b82f6" : "#60a5fa"} opacity={darkMode ? "0.15" : "0.2"} />
                    </svg>
                  </div>

                  {/* Card Content */}
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                        <CalendarCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className={`text-[11px] sm:text-[13px] md:text-[14px] font-black leading-tight truncate ${darkMode ? "text-slate-100" : "text-black"}`}>
                          Self Checked-In
                        </span>
                        <span className={`text-[11px] sm:text-[13px] md:text-[14px] font-black leading-tight truncate ${darkMode ? "text-slate-100" : "text-black"}`}>
                          Days
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 sm:mt-3 md:mt-4 flex flex-col">
                      <span className={`text-2xl sm:text-4xl md:text-[48px] font-black leading-none tracking-tight ${darkMode ? "text-blue-400" : "text-blue-950"}`}>
                        {summaryData?.stats?.presentCount || 0}
                      </span>
                      <span className={`text-[11px] sm:text-[13px] md:text-[14px] font-extrabold mt-0.5 sm:mt-1 ${darkMode ? "text-slate-400" : "text-slate-900"}`}>
                        Days
                      </span>
                    </div>
                  </div>

                  {/* Bottom Badge */}
                  <div className="relative z-10 mt-2 sm:mt-auto">
                    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full border text-[10px] sm:text-[12px] font-black shadow-xs ${
                      darkMode 
                        ? "bg-slate-800/90 text-blue-400 border-slate-700/80" 
                        : "bg-white/95 text-blue-950 border-blue-200"
                    }`}>
                      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-blue-600"></span>
                      Punctual
                    </div>
                  </div>
                </div>

                {/* Card 2 – Remaining Vacation */}
                <div 
                  className={`relative p-3.5 sm:p-5 md:p-6 rounded-2xl sm:rounded-[24px] border transition-all duration-300 hover:shadow-xl hover:scale-[1.01] overflow-hidden flex flex-col justify-between min-h-[140px] sm:min-h-[190px] md:h-[220px] ${
                    darkMode 
                      ? "bg-slate-900/90 border-purple-500/30" 
                      : "bg-gradient-to-br from-[#f5f0ff] via-[#f0e5ff] to-[#ebdfff] border-[#e1ccff]"
                  }`}
                >
                  {/* Dot Grid Pattern */}
                  <div className={`absolute top-3 right-3 sm:top-4 sm:right-4 ${darkMode ? "text-purple-500/10" : "text-purple-400/30"}`}>
                    <svg width="24" height="18" viewBox="0 0 32 24" fill="currentColor" className="sm:w-8 sm:h-6">
                      <circle cx="4" cy="4" r="1.5" />
                      <circle cx="12" cy="4" r="1.5" />
                      <circle cx="20" cy="4" r="1.5" />
                      <circle cx="28" cy="4" r="1.5" />
                      <circle cx="4" cy="12" r="1.5" />
                      <circle cx="12" cy="12" r="1.5" />
                      <circle cx="20" cy="12" r="1.5" />
                      <circle cx="28" cy="12" r="1.5" />
                      <circle cx="4" cy="20" r="1.5" />
                      <circle cx="12" cy="20" r="1.5" />
                      <circle cx="20" cy="20" r="1.5" />
                      <circle cx="28" cy="20" r="1.5" />
                    </svg>
                  </div>

                  {/* Wave Layer decoration at the bottom right */}
                  <div className="absolute bottom-0 right-0 left-0 h-[40%] pointer-events-none overflow-hidden rounded-b-2xl sm:rounded-b-[24px]">
                    <svg className="absolute bottom-0 right-0 w-full h-full opacity-70" viewBox="0 0 160 80" preserveAspectRatio="none" fill="none">
                      <path d="M-20 80 Q 40 40 100 65 T 180 30 L 180 80 Z" fill={darkMode ? "#3b0764" : "#ddd6fe"} opacity={darkMode ? "0.2" : "0.35"} />
                      <path d="M-20 80 Q 50 25 110 50 T 180 15 L 180 80 Z" fill={darkMode ? "#8b5cf6" : "#c084fc"} opacity={darkMode ? "0.15" : "0.2"} />
                    </svg>
                  </div>

                  {/* Card Content */}
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-full bg-purple-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                        <Palmtree className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className={`text-[11px] sm:text-[13px] md:text-[14px] font-black leading-tight truncate ${darkMode ? "text-slate-100" : "text-black"}`}>
                          Remaining
                        </span>
                        <span className={`text-[11px] sm:text-[13px] md:text-[14px] font-black leading-tight truncate ${darkMode ? "text-slate-100" : "text-black"}`}>
                          Vacation
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 sm:mt-3 md:mt-4 flex flex-col">
                      <span className={`text-2xl sm:text-4xl md:text-[48px] font-black leading-none tracking-tight ${darkMode ? "text-purple-400" : "text-purple-950"}`}>
                        {summaryData?.stats?.leaveBalance || 0}
                      </span>
                      <span className={`text-[11px] sm:text-[13px] md:text-[14px] font-extrabold mt-0.5 sm:mt-1 ${darkMode ? "text-slate-400" : "text-slate-900"}`}>
                        Days
                      </span>
                    </div>
                  </div>

                  {/* Bottom Badge */}
                  <div className="relative z-10 mt-2 sm:mt-auto">
                    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full border text-[10px] sm:text-[12px] font-black shadow-xs ${
                      darkMode 
                        ? "bg-slate-800/90 text-purple-400 border-slate-700/80" 
                        : "bg-white/95 text-purple-950 border-purple-200"
                    }`}>
                      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-purple-600"></span>
                      Paid Leave
                    </div>
                  </div>
                </div>

                {/* Card 3 – Pending Leave Requests */}
                <div 
                  className={`relative p-3.5 sm:p-5 md:p-6 rounded-2xl sm:rounded-[24px] border transition-all duration-300 hover:shadow-xl hover:scale-[1.01] overflow-hidden flex flex-col justify-between min-h-[140px] sm:min-h-[190px] md:h-[220px] ${
                    darkMode 
                      ? "bg-slate-900/90 border-amber-500/30" 
                      : "bg-gradient-to-br from-[#fffbeb] via-[#fef6d5] to-[#fef2c3] border-[#fde68a]"
                  }`}
                >
                  {/* Dot Grid Pattern */}
                  <div className={`absolute top-3 right-3 sm:top-4 sm:right-4 ${darkMode ? "text-amber-500/10" : "text-amber-400/30"}`}>
                    <svg width="24" height="18" viewBox="0 0 32 24" fill="currentColor" className="sm:w-8 sm:h-6">
                      <circle cx="4" cy="4" r="1.5" />
                      <circle cx="12" cy="4" r="1.5" />
                      <circle cx="20" cy="4" r="1.5" />
                      <circle cx="28" cy="4" r="1.5" />
                      <circle cx="4" cy="12" r="1.5" />
                      <circle cx="12" cy="12" r="1.5" />
                      <circle cx="20" cy="12" r="1.5" />
                      <circle cx="28" cy="12" r="1.5" />
                      <circle cx="4" cy="20" r="1.5" />
                      <circle cx="12" cy="20" r="1.5" />
                      <circle cx="20" cy="20" r="1.5" />
                      <circle cx="28" cy="20" r="1.5" />
                    </svg>
                  </div>

                  {/* Wave Layer decoration at the bottom right */}
                  <div className="absolute bottom-0 right-0 left-0 h-[40%] pointer-events-none overflow-hidden rounded-b-2xl sm:rounded-b-[24px]">
                    <svg className="absolute bottom-0 right-0 w-full h-full opacity-70" viewBox="0 0 160 80" preserveAspectRatio="none" fill="none">
                      <path d="M-20 80 Q 40 40 100 65 T 180 30 L 180 80 Z" fill={darkMode ? "#78350f" : "#fde68a"} opacity={darkMode ? "0.2" : "0.35"} />
                      <path d="M-20 80 Q 50 25 110 50 T 180 15 L 180 80 Z" fill={darkMode ? "#d97706" : "#fcd34d"} opacity={darkMode ? "0.15" : "0.2"} />
                    </svg>
                  </div>

                  {/* Card Content */}
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-full bg-amber-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                        <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className={`text-[11px] sm:text-[13px] md:text-[14px] font-black leading-tight truncate ${darkMode ? "text-slate-100" : "text-black"}`}>
                          Pending Leave
                        </span>
                        <span className={`text-[11px] sm:text-[13px] md:text-[14px] font-black leading-tight truncate ${darkMode ? "text-slate-100" : "text-black"}`}>
                          Requests
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 sm:mt-3 md:mt-4 flex flex-col">
                      <span className={`text-2xl sm:text-4xl md:text-[48px] font-black leading-none tracking-tight ${darkMode ? "text-amber-400" : "text-amber-950"}`}>
                        {summaryData?.stats?.pendingLeavesCount || 0}
                      </span>
                      <span className={`text-[11px] sm:text-[13px] md:text-[14px] font-extrabold mt-0.5 sm:mt-1 ${darkMode ? "text-slate-400" : "text-slate-900"}`}>
                        Applied
                      </span>
                    </div>
                  </div>

                  {/* Bottom Badge */}
                  <div className="relative z-10 mt-2 sm:mt-auto">
                    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full border text-[10px] sm:text-[12px] font-black shadow-xs ${
                      darkMode 
                        ? "bg-slate-800/90 text-amber-400 border-slate-700/80" 
                        : "bg-white/95 text-amber-950 border-amber-200"
                    }`}>
                      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-600"></span>
                      In review
                    </div>
                  </div>
                </div>

                {/* Card 4 – Milestone Badge Awards */}
                <div 
                  className={`relative p-3.5 sm:p-5 md:p-6 rounded-2xl sm:rounded-[24px] border transition-all duration-300 hover:shadow-xl hover:scale-[1.01] overflow-hidden flex flex-col justify-between min-h-[140px] sm:min-h-[190px] md:h-[220px] ${
                    darkMode 
                      ? "bg-slate-900/90 border-emerald-500/30" 
                      : "bg-gradient-to-br from-[#f0fdf4] via-[#e6fcf0] to-[#dbfce9] border-[#bbf7d0]"
                  }`}
                >
                  {/* Dot Grid Pattern */}
                  <div className={`absolute top-3 right-3 sm:top-4 sm:right-4 ${darkMode ? "text-emerald-500/10" : "text-emerald-400/30"}`}>
                    <svg width="24" height="18" viewBox="0 0 32 24" fill="currentColor" className="sm:w-8 sm:h-6">
                      <circle cx="4" cy="4" r="1.5" />
                      <circle cx="12" cy="4" r="1.5" />
                      <circle cx="20" cy="4" r="1.5" />
                      <circle cx="28" cy="4" r="1.5" />
                      <circle cx="4" cy="12" r="1.5" />
                      <circle cx="12" cy="12" r="1.5" />
                      <circle cx="20" cy="12" r="1.5" />
                      <circle cx="28" cy="12" r="1.5" />
                      <circle cx="4" cy="20" r="1.5" />
                      <circle cx="12" cy="20" r="1.5" />
                      <circle cx="20" cy="20" r="1.5" />
                      <circle cx="28" cy="20" r="1.5" />
                    </svg>
                  </div>

                  {/* Wave Layer decoration at the bottom right */}
                  <div className="absolute bottom-0 right-0 left-0 h-[40%] pointer-events-none overflow-hidden rounded-b-2xl sm:rounded-b-[24px]">
                    <svg className="absolute bottom-0 right-0 w-full h-full opacity-70" viewBox="0 0 160 80" preserveAspectRatio="none" fill="none">
                      <path d="M-20 80 Q 40 40 100 65 T 180 30 L 180 80 Z" fill={darkMode ? "#064e3b" : "#bbf7d0"} opacity={darkMode ? "0.2" : "0.35"} />
                      <path d="M-20 80 Q 50 25 110 50 T 180 15 L 180 80 Z" fill={darkMode ? "#10b981" : "#86efac"} opacity={darkMode ? "0.15" : "0.2"} />
                    </svg>
                  </div>

                  {/* Card Content */}
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-full bg-emerald-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                        <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className={`text-[11px] sm:text-[13px] md:text-[14px] font-black leading-tight truncate ${darkMode ? "text-slate-100" : "text-black"}`}>
                          Milestone Badge
                        </span>
                        <span className={`text-[11px] sm:text-[13px] md:text-[14px] font-black leading-tight truncate ${darkMode ? "text-slate-100" : "text-black"}`}>
                          Awards
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 sm:mt-3 md:mt-4 flex flex-col">
                      <span className={`text-2xl sm:text-4xl md:text-[48px] font-black leading-none tracking-tight ${darkMode ? "text-emerald-400" : "text-emerald-950"}`}>
                        {employee?.achievements?.length || 0}
                      </span>
                      <span className={`text-[11px] sm:text-[13px] md:text-[14px] font-extrabold mt-0.5 sm:mt-1 ${darkMode ? "text-slate-400" : "text-slate-900"}`}>
                        Badges
                      </span>
                    </div>
                  </div>

                  {/* Bottom Badge */}
                  <div className="relative z-10 mt-2 sm:mt-auto">
                    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full border text-[10px] sm:text-[12px] font-black shadow-xs ${
                      darkMode 
                        ? "bg-slate-800/90 text-emerald-400 border-slate-700/80" 
                        : "bg-white/95 text-emerald-950 border-emerald-200"
                    }`}>
                      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-600"></span>
                      Recognitions
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Module Grid Render */}
          {(() => {
            const isWideModule = ["org", "heatmap", "simulator", "locker", "rewards", "attendance", "support", "recruitment", "analytics"].includes(activeModule);
            return (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Active Content Module (Col-span 7 or 8, or full-width 12 depending on context) */}
                <div className={isWideModule ? "lg:col-span-12" : "lg:col-span-8"}>
                  {activeModule === "directory" && <EmployeeDirectory />}
                  {activeModule === "org" && <OrgStructure />}
                  {activeModule === "attendance" && <AttendanceWidget />}
                  {activeModule === "heatmap" && <AttendanceHeatmap />}
                  {activeModule === "leave" && <LeaveWidget />}
                  {activeModule === "payroll" && <PayrollWidget />}
                  {activeModule === "simulator" && <PaycheckSimulator />}
                  {activeModule === "locker" && <DocLocker />}
                  {activeModule === "rewards" && <RewardsVouchers />}
                  {activeModule === "ai" && <AIPanel />}
                  {activeModule === "support" && <SupportDesk />}
                  {activeModule === "recruitment" && <Recruitment />}
                  {activeModule === "analytics" && <AnalyticsHub />}
                </div>

                {/* Sidebar widgets panel (Col-span 4) */}
                {!isWideModule && (
                  <div className="lg:col-span-4 space-y-6">
                    {/* AI Chat Bot Quick Access widget */}
                    {activeModule !== "ai" && (
                      <div className="bg-gradient-to-r from-[#0a0f24] via-[#0f173d] to-[#070b1e] border border-blue-900/40 p-5 rounded-[24px] flex items-center justify-between shadow-xl relative overflow-hidden">
                        <div className="flex items-center gap-4 relative z-10">
                          <img 
                            src={auraBotImg || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80"} 
                            alt="WorkSphere Assistant Robot" 
                            referrerPolicy="no-referrer"
                            className="w-12 h-12 rounded-full object-cover shadow-lg border-2 border-blue-500/30 shrink-0"
                          />
                          <div className="space-y-1">
                            <h4 className="font-extrabold text-[12px] uppercase tracking-wider text-[#38bdf8] flex items-center gap-1.5">
                              WORKSPHERE ASSISTANT
                            </h4>
                            <p style={{ color: "#fdfcfc" }} className="text-[10px] max-w-[160px] leading-relaxed">
                              Ask chatbot to look up daily absentees and details.
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setActiveModule("ai")}
                          className="bg-[#0052ff] hover:bg-blue-500 text-white rounded-xl px-3.5 py-2 text-xs font-bold cursor-pointer transition-all duration-300 shadow-md shadow-blue-500/20 shrink-0 relative z-10"
                        >
                          Launch WorkSphere
                        </button>
                        
                        {/* Soft background glow */}
                        <div className="absolute -top-10 -right-10 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>
                      </div>
                    )}

                    {/* Holiday Calendar Tracker - #FFCFFC Background with Lighter Professional Tones */}
                    <div 
                      style={{ backgroundColor: "#FFCFFC" }} 
                      className="border border-[#f0a6f0] p-4 sm:p-4.5 rounded-[22px] space-y-3.5 shadow-xs relative overflow-hidden text-[#3a083a]"
                    >
                      {/* Decorative Soft Background Accent */}
                      <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-white/30 blur-lg pointer-events-none" />

                      {/* Header */}
                      <div className="flex items-center justify-between relative z-10">
                        <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-2 text-[#3a083a]">
                          <CalendarDays className="w-4 h-4 text-purple-800 shrink-0" />
                          <span>Upcoming Holidays</span>
                        </h4>
                        <span className="text-[10px] font-black bg-purple-950/90 text-pink-100 px-2.5 py-0.5 rounded-full shadow-2xs tracking-widest uppercase">
                          2026 Season
                        </span>
                      </div>

                      {/* Holiday List */}
                      <div className="space-y-2 relative z-10">
                        {summaryData?.upcomingHolidays?.map((h: any, idx: number) => {
                          return (
                            <motion.div 
                              key={idx}
                              whileHover={{ scale: 1.015, x: 2 }}
                              transition={{ type: "spring", stiffness: 400, damping: 20 }}
                              className="bg-white/95 dark:bg-[#2e072e]/90 backdrop-blur-xs px-3 py-2.5 rounded-xl flex items-center justify-between gap-2 text-xs border border-purple-200/80 dark:border-purple-800/60 shadow-2xs hover:shadow-xs transition-all duration-200 group"
                            >
                              <div className="flex items-center gap-2 font-bold min-w-0">
                                <span className="w-2 h-2 rounded-full bg-purple-600 dark:bg-purple-400 shrink-0 group-hover:scale-125 transition-transform" />
                                <span className="text-[#2e072e] dark:text-[#ffeafe] font-extrabold truncate">{h.name}</span>
                              </div>
                              <span className="font-mono text-[10px] bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/80 dark:to-pink-900/80 text-purple-950 dark:text-purple-100 border border-purple-200 dark:border-purple-700/60 px-2.5 py-1 rounded-lg font-extrabold shadow-2xs shrink-0 flex items-center gap-1 group-hover:scale-105 transition-transform">
                                <span>{h.date}</span>
                              </span>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Recent Activity Log */}
                    <div style={{ backgroundColor: "#e0f7fa" }} className="border border-cyan-200 p-4 rounded-2xl space-y-3 shadow-sm text-cyan-950">
                      <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-cyan-900">
                        <Activity className="w-4 h-4 text-cyan-700 animate-pulse" /> Recent Activities
                      </h4>
                      <div className="space-y-2.5 max-h-[170px] overflow-y-auto pr-1">
                        {summaryData?.recentActivities?.length === 0 ? (
                          <p className="text-[11px] text-cyan-800 italic">No logged activity recorded.</p>
                        ) : (
                          summaryData?.recentActivities?.map((act: any) => (
                            <div key={act.id} className="text-xs border-l-2 border-cyan-300 pl-3 space-y-0.5 text-left">
                              <div className="flex justify-between font-semibold">
                                <span className="font-semibold text-cyan-950">{act.action}</span>
                                <span className="text-[9px] font-mono text-cyan-800">{act.timestamp.split("T")[1]?.slice(0, 5)}</span>
                              </div>
                              <p className="text-[11px] leading-normal text-cyan-900">{act.details}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RootApp />
    </AuthProvider>
  );
}
