'use client';

import { useState, Suspense, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  Server,
  Clock,
  FileText,
  Shield,
  Lock,
  Users,
  LayoutDashboard,
  CheckCircle2,
  QrCode,
  LogIn,
  Menu,
  X,
  MapPin,
  Calendar,
  ChevronRight,
  Search,
  Activity,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LoginModal } from '@/components/auth/login-modal';
import Image from 'next/image';

function LoginChecker({ onLoginOpen }: { onLoginOpen: () => void }) {
  const searchParams = useSearchParams();
  const login = searchParams.get('login');

  useEffect(() => {
    if (login === 'true') {
      onLoginOpen();
    }
  }, [login, onLoginOpen]);

  return null;
}

type NavLink =
  | { label: string; sectionId: string }
  | { label: string; href: string };

const NAV_LINKS: NavLink[] = [
  { label: 'Features', sectionId: 'features' },
  { label: 'Security', sectionId: 'security' },
  { label: 'Demo', href: '/demo' },
];

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

export function LandingContent() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const openLogin = useCallback(() => setIsLoginOpen(true), []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LoginChecker onLoginOpen={openLogin} />
      <div className="flex flex-col min-h-screen bg-background selection:bg-blue-100 selection:text-blue-900">

        {/* ─────────────────────────── NAVBAR ─────────────────────────── */}
        <header className={`px-4 lg:px-10 h-16 flex items-center border-b fixed inset-x-0 top-0 z-50 bg-background/80 backdrop-blur-md transition-all duration-300 ${
          scrolled
            ? 'border-border/80 shadow-sm shadow-slate-900/5'
            : 'border-transparent'
        }`}>
          {/* Logo */}
          <Link className="flex items-center gap-2 shrink-0 group" href="/">
            <div className="bg-blue-600 p-1.5 rounded-lg group-hover:scale-110 transition-transform shadow-sm">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <span className="font-extrabold text-xl tracking-tighter text-foreground">PassOS</span>
          </Link>

          {/* Center Nav — desktop */}
          <nav className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
            {NAV_LINKS.map((l) =>
              'sectionId' in l ? (
                <button
                  key={l.label}
                  onClick={() => scrollTo(l.sectionId)}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-all"
                >
                  {l.label}
                </button>
              ) : (
                <Link
                  key={l.label}
                  href={l.href}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-all"
                >
                  {l.label}
                </Link>
              )
            )}
          </nav>

          {/* Right actions — desktop */}
          <div className="hidden md:flex items-center gap-3 ml-auto">
            <button
              onClick={openLogin}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all border border-blue-200/60 hover:border-blue-300"
            >
              <LogIn className="h-4 w-4" />
              Login
            </button>
            <Link
              href="/demo"
              className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 active:scale-95"
            >
              Book Demo
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="ml-auto md:hidden p-2 rounded-xl hover:bg-muted transition-colors"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </header>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="md:hidden fixed top-16 inset-x-0 z-40 bg-background border-b border-border px-4 py-6 flex flex-col gap-3 shadow-xl"
            >
              {NAV_LINKS.map((l) =>
                'sectionId' in l ? (
                  <button
                    key={l.label}
                    onClick={() => { setMobileMenuOpen(false); scrollTo(l.sectionId); }}
                    className="px-4 py-3 text-sm font-medium text-foreground hover:bg-muted rounded-xl transition-colors text-left"
                  >
                    {l.label}
                  </button>
                ) : (
                  <Link
                    key={l.label}
                    href={l.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-3 text-sm font-medium text-foreground hover:bg-muted rounded-xl transition-colors"
                  >
                    {l.label}
                  </Link>
                )
              )}
              <div className="pt-2 border-t border-border flex flex-col gap-2">
                <button
                  onClick={() => { setMobileMenuOpen(false); openLogin(); }}
                  className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-blue-600 hover:bg-blue-50 rounded-xl transition-colors border border-blue-200/60"
                >
                  <LogIn className="h-4 w-4" /> Login to Dashboard
                </button>
                <Link
                  href="/demo"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-3 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all text-center justify-center"
                >
                  Book Demo <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <main className="flex-1 pt-16 overflow-x-hidden">

          {/* ─────────────────────────── HERO ─────────────────────────── */}
          <section className="relative min-h-[calc(100vh-4rem)] flex items-center px-4 lg:px-10 py-16 max-w-7xl mx-auto">

            {/* Background glows */}
            <div className="absolute -top-32 left-1/4 w-96 h-96 bg-blue-500/8 blur-[140px] rounded-full pointer-events-none" />
            <div className="absolute top-1/2 right-0 w-72 h-72 bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />

            <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center w-full">

              {/* Left — copy */}
              <div>
                {/* Eyebrow */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold uppercase tracking-widest mb-8 border border-blue-100 shadow-sm"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
                  Modernizing Campus Security
                </motion.div>

                {/* Headline */}
                <motion.h1
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.6 }}
                  className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.08] mb-6"
                >
                  Campus Gate Passes,{' '}
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400">
                    Finally Done Right.
                  </span>
                </motion.h1>

                {/* Subheadline */}
                <motion.p
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.6 }}
                  className="text-lg text-muted-foreground leading-relaxed mb-10 max-w-[520px]"
                >
                  Replace paper slips, manual approvals, and confusion with one secure platform for students, parents, admins, and guards.
                </motion.p>

                {/* CTAs */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                  className="flex flex-col sm:flex-row gap-3"
                >
                  {/* Primary: Login */}
                  <button
                    onClick={openLogin}
                    className="inline-flex items-center justify-center gap-2 h-14 px-8 rounded-2xl bg-blue-600 text-white font-bold text-base shadow-xl shadow-blue-500/25 hover:bg-blue-700 transition-all hover:-translate-y-0.5 active:scale-95 group"
                  >
                    <LogIn className="h-5 w-5" />
                    Login to Dashboard
                  </button>

                  {/* Secondary: Demo */}
                  <Link
                    href="/demo"
                    className="inline-flex items-center justify-center gap-2 h-14 px-8 rounded-2xl bg-slate-100 border border-slate-300 text-slate-800 font-bold text-base hover:bg-slate-200 transition-all active:scale-95 group"
                  >
                    Explore Demo
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </motion.div>

                {/* Helper text */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.45, duration: 0.6 }}
                  className="mt-4 text-sm text-muted-foreground/70 font-medium flex items-center gap-1.5"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
                  Already registered? Access your portal instantly.
                </motion.p>
              </div>

              {/* Right — product mockup */}
              <motion.div
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25, duration: 0.8, ease: 'easeOut' }}
                className="relative hidden lg:flex items-center justify-center"
              >
                {/* Floating container */}
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
                  className="relative w-full max-w-lg"
                >
                  {/* Main dashboard card */}
                  <div className="relative bg-white rounded-3xl border border-slate-200/80 shadow-2xl shadow-slate-900/10 overflow-hidden">
                    {/* Browser bar */}
                    <div className="h-9 bg-slate-50 border-b border-slate-100 flex items-center px-4 gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                      <div className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                      <div className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                      <div className="mx-auto flex-1 max-w-[200px] h-5 bg-slate-100 rounded-md flex items-center justify-center">
                        <span className="text-[9px] text-slate-400 font-mono">app.passos.io/admin</span>
                      </div>
                    </div>

                    {/* Dashboard preview */}
                    <div className="p-5 bg-slate-50/50">
                      {/* Stats row */}
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        {[
                          { label: 'Students Out', val: '156', color: 'text-blue-600', bg: 'bg-blue-50' },
                          { label: 'Approved Today', val: '89', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                          { label: 'Alerts', val: '0', color: 'text-slate-500', bg: 'bg-slate-100' },
                        ].map((s) => (
                          <div key={s.label} className={`${s.bg} rounded-2xl p-3`}>
                            <p className={`text-xl font-black ${s.color}`}>{s.val}</p>
                            <p className="text-[10px] text-slate-500 font-medium mt-0.5">{s.label}</p>
                          </div>
                        ))}
                      </div>

                      {/* Recent passes list */}
                      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                        <div className="px-4 py-2.5 border-b border-slate-50 flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-600">Recent Passes</span>
                          <span className="text-[10px] text-blue-500 font-bold">Live</span>
                        </div>
                        <div className="divide-y divide-slate-50">
                          {[
                            { name: 'Aryan Sharma', dest: 'Downtown Mall', status: 'Active', dot: 'bg-emerald-500' },
                            { name: 'Simran K.', dest: 'Home Visit', status: 'Pending', dot: 'bg-amber-400' },
                            { name: 'Rahul V.', dest: 'Medical Appt.', status: 'Returned', dot: 'bg-slate-300' },
                          ].map((p) => (
                            <div key={p.name} className="flex items-center gap-3 px-4 py-2.5">
                              <div className={`h-2 w-2 rounded-full ${p.dot} shrink-0`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-slate-700 truncate">{p.name}</p>
                                <p className="text-[10px] text-slate-400 truncate">{p.dest}</p>
                              </div>
                              <span className="text-[10px] font-bold text-slate-400">{p.status}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Floating QR badge */}
                  <motion.div
                    animate={{ y: [0, 6, 0] }}
                    transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut', delay: 1.5 }}
                    className="absolute -bottom-6 -left-8 bg-white rounded-2xl border border-slate-200 shadow-xl p-4 flex items-center gap-3"
                  >
                    <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0">
                      <QrCode className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-[11px] font-extrabold text-emerald-700 uppercase tracking-widest">Verified</p>
                      <p className="text-[10px] text-slate-400 font-medium">PASS-7824 • Active</p>
                    </div>
                  </motion.div>

                  {/* Floating approval badge */}
                  <motion.div
                    animate={{ y: [0, -6, 0] }}
                    transition={{ repeat: Infinity, duration: 4.5, ease: 'easeInOut', delay: 0.5 }}
                    className="absolute -top-6 -right-6 bg-white rounded-2xl border border-slate-200 shadow-xl p-4 flex items-center gap-3"
                  >
                    <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-[11px] font-extrabold text-blue-700">Parent Approved</p>
                      <p className="text-[10px] text-slate-400 font-medium">12s ago</p>
                    </div>
                  </motion.div>
                </motion.div>
              </motion.div>
            </div>
          </section>

          {/* ─────────────────────── TRUST METRICS ─────────────────────── */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="border-y border-border/60 py-10 bg-muted/20"
          >
            <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
              {[
                { label: '98% Less Paperwork', icon: FileText },
                { label: '12s Avg Approval', icon: Clock },
                { label: 'Live QR Verification', icon: QrCode },
                { label: '24/7 Campus Security', icon: Shield },
              ].map((stat, i) => (
                <div key={i} className="flex flex-col items-center gap-2.5 text-center group">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                    <stat.icon className="h-5 w-5 text-blue-600" />
                  </div>
                  <span className="text-sm font-semibold text-foreground/80">{stat.label}</span>
                </div>
              ))}
            </div>
          </motion.section>

          {/* ─────────────────────── CAMPUS SECTION ─────────────────────── */}
          <section id="features" className="py-24 sm:py-32 border-b border-border/40">
            <div className="max-w-7xl mx-auto px-4">
              <div className="text-center mb-16">
                <motion.p
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  className="text-xs font-bold text-blue-600 uppercase tracking-[0.2em] mb-3"
                >
                  Designed for Every Role
                </motion.p>
                <motion.h2
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="text-3xl md:text-5xl font-bold tracking-tight text-foreground mb-4"
                >
                  One Platform, Entire Campus
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 }}
                  className="text-muted-foreground text-lg max-w-xl mx-auto"
                >
                  Every stakeholder gets a tailored experience built for their workflow.
                </motion.p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  {
                    title: 'Student Portal',
                    description: 'Instant pass requests from any device with real-time status tracking.',
                    icon: Users,
                    accent: 'from-blue-500 to-blue-600',
                    preview: (
                      <div className="absolute left-1/2 -translate-x-1/2 top-6 w-[200px] bottom-[-20px] bg-slate-50 rounded-t-2xl border-x border-t border-slate-200 shadow-xl overflow-hidden flex flex-col group-hover:-translate-y-1 transition-transform duration-500">
                        <div className="h-8 bg-white border-b border-slate-100 flex items-center justify-between px-3">
                          <span className="text-[9px] font-bold text-slate-800">New Request</span>
                          <div className="h-4 w-4 bg-blue-100 rounded-full flex items-center justify-center">
                            <Users className="h-2 w-2 text-blue-600" />
                          </div>
                        </div>
                        <div className="p-3 flex-1 space-y-3">
                          <div className="space-y-1">
                            <label className="text-[7px] font-bold text-slate-400">DESTINATION</label>
                            <div className="h-7 w-full bg-white border border-slate-200 shadow-sm rounded-lg flex items-center px-2 gap-1.5">
                              <MapPin className="h-2.5 w-2.5 text-slate-400" />
                              <span className="text-[8px] font-medium text-slate-800">Downtown Library</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[7px] font-bold text-slate-400">DATE</label>
                              <div className="h-7 w-full bg-white border border-slate-200 shadow-sm rounded-lg flex items-center px-2 gap-1.5">
                                <Calendar className="h-2.5 w-2.5 text-slate-400" />
                                <span className="text-[7px] font-medium text-slate-600">Today</span>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[7px] font-bold text-slate-400">TIME</label>
                              <div className="h-7 w-full bg-white border border-slate-200 shadow-sm rounded-lg flex items-center px-2 gap-1.5">
                                <Clock className="h-2.5 w-2.5 text-slate-400" />
                                <span className="text-[7px] font-medium text-slate-600">8:00 PM</span>
                              </div>
                            </div>
                          </div>
                          <div className="h-8 w-full bg-blue-600 shadow-sm shadow-blue-500/20 rounded-lg mt-3 flex items-center justify-center">
                            <span className="text-[9px] font-bold text-white">Submit Request</span>
                          </div>
                        </div>
                      </div>
                    )
                  },
                  {
                    title: 'Parent Portal',
                    description: 'Remote approvals with full request context and instant notifications.',
                    icon: CheckCircle2,
                    accent: 'from-emerald-500 to-emerald-600',
                    preview: (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-50/50">
                        <div className="w-[220px] bg-white rounded-xl shadow-xl border border-slate-200 p-3 relative group-hover:-translate-y-1.5 transition-transform duration-500">
                          <div className="flex justify-between items-start mb-2.5">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-[9px] font-bold">AS</div>
                              <div>
                                <p className="text-[10px] font-bold text-slate-800 leading-tight">Aryan Sharma</p>
                                <p className="text-[8px] font-medium text-slate-400">Day Outing Request</p>
                              </div>
                            </div>
                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[7px] font-bold">PENDING</span>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-2 mb-2.5 border border-slate-100 flex items-center gap-1.5">
                            <MapPin className="h-2.5 w-2.5 text-slate-400" />
                            <span className="text-[8px] font-medium text-slate-600">City Mall • 4:00 PM to 8:00 PM</span>
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1 h-7 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-600 cursor-default">
                              <span className="text-[9px] font-bold">Reject</span>
                            </div>
                            <div className="flex-1 h-7 rounded-md bg-emerald-600 flex items-center justify-center text-white shadow-sm shadow-emerald-500/20 cursor-default">
                              <span className="text-[9px] font-bold">Approve</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  },
                  {
                    title: 'Admin Dashboard',
                    description: 'University-wide movement oversight with real-time logs and analytics.',
                    icon: LayoutDashboard,
                    accent: 'from-violet-500 to-violet-600',
                    preview: (
                      <div className="absolute inset-x-2 sm:left-1/2 sm:-translate-x-1/2 sm:w-[260px] top-6 bottom-[-10px] bg-slate-50 rounded-t-xl border border-slate-200 shadow-xl overflow-hidden flex group-hover:translate-y-[-4px] transition-transform duration-700">
                        <div className="w-10 bg-slate-900 flex flex-col items-center py-3 gap-3">
                          <div className="p-1 bg-blue-600 rounded-md"><ShieldCheck className="h-3 w-3 text-white" /></div>
                          <Users className="h-3 w-3 text-slate-500" />
                          <Activity className="h-3 w-3 text-slate-500" />
                        </div>
                        <div className="flex-1 p-2.5 bg-white">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[8px] font-bold text-slate-800 uppercase tracking-wider">Movement Today</span>
                            <Search className="h-2.5 w-2.5 text-slate-400" />
                          </div>
                          <div className="flex gap-1.5 mb-2.5">
                            <div className="flex-1 p-1.5 bg-slate-50 border border-slate-100 rounded-md">
                              <span className="text-[12px] font-bold text-blue-600">156</span>
                              <p className="text-[6px] text-slate-500 font-medium">Students Out</p>
                            </div>
                            <div className="flex-1 p-1.5 bg-slate-50 border border-slate-100 rounded-md">
                              <span className="text-[12px] font-bold text-emerald-600">89</span>
                              <p className="text-[6px] text-slate-500 font-medium">Approved</p>
                            </div>
                          </div>
                          <div className="space-y-1">
                            {[
                              { n: 'Simran K.', s: 'Pending', c: 'text-amber-500 bg-amber-50' },
                              { n: 'Rahul V.', s: 'Active', c: 'text-emerald-600 bg-emerald-50' }
                            ].map((row, idx) => (
                              <div key={idx} className="flex justify-between items-center p-1 rounded border border-transparent">
                                <span className="text-[8px] font-bold text-slate-700">{row.n}</span>
                                <span className={`text-[6px] font-bold px-1 py-0.5 rounded ${row.c}`}>{row.s}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )
                  },
                  {
                    title: 'Guard Scanner',
                    description: 'Instant QR verification at gates with a zero-latency scanner.',
                    icon: ShieldCheck,
                    accent: 'from-slate-600 to-slate-700',
                    preview: (
                      <div className="absolute left-1/2 -translate-x-1/2 top-6 w-[200px] bottom-[-20px] bg-slate-950 rounded-t-2xl border-x border-t border-slate-800 shadow-2xl overflow-hidden flex flex-col items-center group-hover:-translate-y-1 transition-transform duration-500">
                        <div className="w-full text-center py-3 border-b border-slate-800 bg-slate-900/50">
                          <span className="text-[8px] font-bold text-slate-400 tracking-widest uppercase">Scanner Active</span>
                        </div>
                        {/* Scanner Frame */}
                        <div className="absolute inset-x-5 top-12 bottom-16 border-2 border-emerald-500/50 rounded-xl bg-emerald-500/5" />
                        {/* Laser Line */}
                        <div className="absolute top-[45%] left-0 w-full h-[1px] bg-emerald-400 shadow-[0_0_12px_3px_rgba(52,211,153,0.5)] transform group-hover:translate-y-8 transition-transform duration-[2000ms] ease-in-out" />
                        
                        {/* Glowing Overlay Status */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-emerald-500/25 blur-xl rounded-full pointer-events-none" />
                        <div className="absolute top-[50%] left-1/2 -translate-x-1/2 bg-emerald-500 backdrop-blur-md px-3 py-1.5 rounded-lg border border-emerald-400 shadow-lg shadow-emerald-900 flex flex-col items-center justify-center min-w-[100px] transform -translate-y-1/2 z-10 scale-95 group-hover:scale-100 transition-transform">
                          <div className="flex items-center gap-1 mb-0.5">
                            <CheckCircle2 className="h-3 w-3 text-white" />
                            <span className="text-[8px] font-extrabold text-white uppercase tracking-wider">Access Granted</span>
                          </div>
                          <span className="text-[7px] font-bold text-emerald-100">Aryan Sharma</span>
                        </div>
                        
                        <div className="absolute bottom-4 inset-x-4 flex gap-1.5">
                          <div className="flex-1 h-7 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-center">
                            <span className="text-[8px] font-bold text-slate-400">History</span>
                          </div>
                          <div className="flex-1 h-7 bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-center">
                            <span className="text-[8px] font-bold text-white">Scan</span>
                          </div>
                        </div>
                      </div>
                    )
                  },
                ].map((portal, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                    whileHover={{ y: -6 }}
                    className="group bg-card rounded-3xl border border-border shadow-sm overflow-hidden flex flex-col transition-shadow hover:shadow-lg hover:shadow-slate-900/5"
                  >
                    <div className="relative h-52 w-full bg-slate-100 border-b border-border/50 overflow-hidden flex items-center justify-center">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.05)_0%,transparent_60%)]" />
                      {portal.preview}
                      <div className={`absolute inset-0 bg-gradient-to-b ${portal.accent} opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none`} />
                    </div>
                    <div className="p-5">
                      <div className="flex items-center gap-2.5 mb-2">
                        <portal.icon className="h-5 w-5 text-blue-600" />
                        <h3 className="text-base font-bold text-foreground">{portal.title}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{portal.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ─────────────────────── FEATURES ─────────────────────── */}
          <section className="py-24 sm:py-32 px-4 max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  title: 'Student Requests',
                  desc: 'Mobile-first pass requests with automatic validation rules and time constraints.',
                  icon: Zap,
                  color: 'text-amber-500',
                  bg: 'bg-amber-50',
                  border: 'hover:border-amber-400/40',
                },
                {
                  title: 'Parent Approvals',
                  desc: 'Approve or deny requests remotely with full context and instant push alerts.',
                  icon: Users,
                  color: 'text-blue-500',
                  bg: 'bg-blue-50',
                  border: 'hover:border-blue-400/40',
                },
                {
                  title: 'QR Security',
                  desc: 'Cryptographically signed passes with single-use protection and tamper detection.',
                  icon: ShieldCheck,
                  color: 'text-emerald-500',
                  bg: 'bg-emerald-50',
                  border: 'hover:border-emerald-400/40',
                },
                {
                  title: 'Live Operations',
                  desc: 'Track passes, student movement, and alerts in a real-time command center.',
                  icon: Server,
                  color: 'text-indigo-500',
                  bg: 'bg-indigo-50',
                  border: 'hover:border-indigo-400/40',
                },
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className={`p-7 bg-card rounded-3xl border border-border transition-all duration-200 group cursor-default ${feature.border} hover:shadow-md`}
                >
                  <div className={`p-3.5 rounded-2xl ${feature.bg} w-fit mb-5 group-hover:scale-110 transition-transform`}>
                    <feature.icon className={`h-7 w-7 ${feature.color}`} />
                  </div>
                  <h3 className="text-base font-bold mb-2 text-foreground">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </section>

          {/* ─────────────────────── SECURITY ─────────────────────── */}
          <section id="security" className="bg-slate-950 text-white py-20 overflow-hidden">
            <div className="max-w-7xl mx-auto px-4">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-16">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="max-w-md lg:max-w-sm"
                >
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-blue-400 text-[10px] font-bold uppercase tracking-widest mb-5">
                    <Lock className="h-3 w-3" />
                    Security First
                  </div>
                  <h2 className="text-3xl lg:text-4xl font-bold mb-4 leading-tight">
                    Built for Enterprise Campus Security
                  </h2>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    PassOS uses bank-grade protocols to keep student data safe, passes unforgeable, and campuses secure — 24 hours a day.
                  </p>
                </motion.div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-16 gap-y-5">
                  {[
                    'JWT Signed QR Codes',
                    'Anti-Replay Protection',
                    'Role-Based Access (RBAC)',
                    'Real-Time Audit Logs',
                    'Encrypted Data at Rest',
                    'Biometric Ready',
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3"
                    >
                      <div className="h-5 w-5 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="h-3 w-3 text-blue-400" />
                      </div>
                      <span className="text-sm font-medium text-slate-200">{item}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ─────────────────────── FINAL CTA ─────────────────────── */}
          <section className="relative py-28 sm:py-40 px-4 flex flex-col items-center justify-center text-center bg-background overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.06)_0%,transparent_70%)] pointer-events-none" />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="relative z-10 max-w-3xl"
            >
              <p className="text-xs font-bold text-blue-600 uppercase tracking-[0.2em] mb-4">Ready to Switch?</p>
              <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground mb-6 text-balance">
                Modernize your campus security today.
              </h2>
              <p className="text-lg text-muted-foreground mb-12 text-balance leading-relaxed max-w-xl mx-auto">
                Join universities already running PassOS. Set up takes minutes. Paper passes are retired permanently.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={openLogin}
                  className="h-14 px-10 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-2xl shadow-blue-500/25 active:scale-95 flex items-center justify-center gap-2"
                >
                  <LogIn className="h-5 w-5" />
                  Login to Dashboard
                </button>
                <Link
                  href="/demo"
                  className="h-14 px-10 rounded-2xl bg-slate-100 border border-slate-300 text-slate-800 font-bold hover:bg-slate-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  Explore Demo
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </div>
            </motion.div>
          </section>

        </main>

        {/* ─────────────────────────── FOOTER ─────────────────────────── */}
        <footer className="py-10 border-t border-border bg-muted/10">
          <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 items-center gap-6">
            <div className="flex items-center gap-2 justify-center md:justify-start">
              <div className="bg-blue-600 p-1 rounded-lg">
                <ShieldCheck className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-base tracking-tight">PassOS</span>
            </div>
            <div className="flex justify-center text-center">
              <p className="text-xs text-muted-foreground">© 2026 PassOS Campus Security. All rights reserved.</p>
            </div>
            <div className="flex gap-5 justify-center md:justify-end">
              {['Terms', 'Privacy', 'Security'].map((l) => (
                <Link key={l} href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  {l}
                </Link>
              ))}
            </div>
          </div>
        </footer>

        <LoginModal
          isOpen={isLoginOpen}
          onClose={() => {
            setIsLoginOpen(false);
            window.history.replaceState({}, '', window.location.pathname);
          }}
        />
      </div>
    </Suspense>
  );
}
