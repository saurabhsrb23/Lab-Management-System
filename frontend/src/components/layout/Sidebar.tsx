"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, FlaskConical, CalendarCheck, BarChart3,
  Users, LogOut, FlaskRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { clearAuth, getUser, isAdmin, isAdminOrResearcher } from "@/lib/auth";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/equipment", icon: FlaskConical, label: "Equipment" },
  { href: "/bookings", icon: CalendarCheck, label: "Bookings" },
  { href: "/reports", icon: BarChart3, label: "Reports", restricted: true },
  { href: "/users", icon: Users, label: "Users", adminOnly: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = getUser();

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  const filteredItems = navItems.filter((item) => {
    if (item.adminOnly) return isAdmin();
    if (item.restricted) return isAdminOrResearcher();
    return true;
  });

  return (
    <aside className="w-64 min-h-screen bg-slate-900 text-white flex flex-col">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <FlaskRound className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">LabMS</h1>
            <p className="text-xs text-slate-400">Management System</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className="mb-3 px-3">
          <p className="text-sm font-medium text-white truncate">{user?.full_name}</p>
          <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          <span className="mt-1 inline-block text-xs px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-300 capitalize">
            {user?.role}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
