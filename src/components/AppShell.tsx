"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Building2,
  FileBarChart,
  FolderKanban,
  GraduationCap,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Mail,
  Menu,
  Shield,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { api } from "@/lib/client";
import type { PermissionKey } from "@/lib/constants";

type Session = {
  user: {
    id: string;
    name: string;
    email: string;
    roleName: string;
    roleKey: string;
    departmentName: string | null;
    facultyId: string | null;
  };
  permissions: PermissionKey[];
};

const NAV = [
  { href: "/dashboard", label: "Dashboard", permission: "dashboard.view" as const, icon: LayoutDashboard },
  { href: "/projects", label: "Research Projects", permission: "projects.view" as const, icon: FolderKanban },
  { href: "/faculty", label: "Faculty / Professor", permission: "faculty.view" as const, icon: Users },
  { href: "/reports", label: "Reports", permission: "reports.generate" as const, icon: FileBarChart },
  { href: "/notices", label: "Email Notices", permission: null, icon: Mail },
  { href: "/checklists", label: "Documentary Checklists", permission: "checklists.manage" as const, icon: ListChecks },
  { href: "/departments", label: "Departments", permission: "departments.manage" as const, icon: Building2 },
  { href: "/programs", label: "Programs", permission: "programs.manage" as const, icon: GraduationCap },
  { href: "/users", label: "Users", permission: "users.manage" as const, icon: UserRound },
  { href: "/access", label: "Roles and Access", permission: "rbac.assign" as const, icon: Shield },
  { href: "/account", label: "Password", permission: null, icon: KeyRound },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api<Session>("/api/auth/me")
      .then(setSession)
      .catch(() => router.replace("/login"));
  }, [router]);

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const items = NAV.filter((item) => !item.permission || session?.permissions.includes(item.permission));

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className={`fixed inset-y-0 left-0 z-40 w-[260px] bg-navy text-white lg:static ${open ? "block" : "hidden lg:block"}`}>
        <div className="flex items-start justify-between border-b border-white/10 px-5 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-2">RDU</p>
            <h1 className="mt-1 font-serif text-xl leading-tight">Research and Development Unit</h1>
          </div>
          <button type="button" className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>
        <nav className="space-y-1 px-3 py-4">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${active ? "bg-white/10 text-white" : "text-slate-200 hover:bg-white/5"}`}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      {open ? <button className="fixed inset-0 z-30 bg-black/40 lg:hidden" aria-label="Close menu" onClick={() => setOpen(false)} /> : null}
      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-paper/95 px-4 py-3 backdrop-blur sm:px-6">
          <button type="button" className="btn-secondary lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu size={16} />
            Menu
          </button>
          <div className="ml-auto text-right">
            <p className="text-sm font-semibold text-navy">{session?.user.name ?? "…"}</p>
            <p className="text-xs text-slate-500">
              {session?.user.roleName}
              {session?.user.departmentName ? ` · ${session.user.departmentName}` : ""}
            </p>
          </div>
          <button type="button" className="btn-secondary ml-3" onClick={logout}>
            <LogOut size={16} />
            Sign Out
          </button>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8">{session ? children : <p className="text-sm text-slate-500">Loading…</p>}</main>
      </div>
    </div>
  );
}
