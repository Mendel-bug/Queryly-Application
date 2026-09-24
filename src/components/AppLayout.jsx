import React, { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  Database, Home, Table2, Sigma, BarChart3, Eraser, Terminal,
  Calculator, LayoutDashboard, FileText, Sparkles, Menu, X,
} from "lucide-react";

const NAV = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/datasets", label: "Datasets", icon: Database },
  { to: "/explorer", label: "Data Explorer", icon: Table2 },
  { to: "/stats", label: "Statistics", icon: Sigma },
  { to: "/visualize", label: "Visualizations", icon: BarChart3 },
  { to: "/clean", label: "Data Cleaning", icon: Eraser },
  { to: "/sql", label: "SQL Lab", icon: Terminal },
  { to: "/formulas", label: "Formulas", icon: Calculator },
  { to: "/dashboards", label: "Dashboards", icon: LayoutDashboard },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/ask", label: "Ask AI", icon: Sparkles },
];

export default function AppLayout() {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-background">
      <div className="md:hidden sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background"><Database className="h-4 w-4" /></div>
          <span className="font-heading font-semibold">Queryly</span>
        </div>
        <button onClick={() => setOpen(true)} className="rounded-lg border border-border p-2"><Menu className="h-5 w-5" /></button>
      </div>

      <aside className="hidden md:flex fixed inset-y-0 left-0 w-60 flex-col border-r border-border bg-sidebar/40">
        <Brand />
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV.map((n) => <NavItem key={n.to} {...n} />)}
        </nav>
      </aside>

      {open && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-border bg-background">
            <div className="flex items-center justify-between border-b border-border p-3">
              <Brand />
              <button onClick={() => setOpen(false)} className="rounded-lg border border-border p-2"><X className="h-4 w-4" /></button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto p-3" onClick={() => setOpen(false)}>
              {NAV.map((n) => <NavItem key={n.to} {...n} />)}
            </nav>
          </aside>
        </div>
      )}

      <main className="md:pl-60">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-3 py-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-background"><Database className="h-5 w-5" /></div>
      <div>
        <p className="font-heading text-base font-semibold leading-none">Queryly</p>
        <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Data Analytics</p>
      </div>
    </div>
  );
}

function NavItem({ to, label, icon: Icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${isActive ? "bg-foreground text-background" : "text-sidebar-foreground hover:bg-sidebar-accent"}`
      }
    >
      <Icon className="h-4 w-4" /> {label}
    </NavLink>
  );
}