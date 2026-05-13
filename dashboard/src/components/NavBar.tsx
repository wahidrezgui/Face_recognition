"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearToken } from "@/lib/auth";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/persons",   label: "Persons" },
  { href: "/events",    label: "Events" },
  { href: "/alerts",    label: "Alerts" },
];

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/login") return null;

  function handleLogout() {
    clearToken();
    router.push("/login");
  }

  return (
    <nav
      className="shrink-0 flex items-center gap-1 px-4 border-b text-sm"
      style={{ height: 44, background: "#060a15", borderColor: "#1a2640" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 mr-5">
        <div className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2a5 5 0 015 5v1h2a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V10a2 2 0 012-2h2V7a5 5 0 015-5zm0 2a3 3 0 00-3 3v1h6V7a3 3 0 00-3-3zm0 8a3 3 0 110 6 3 3 0 010-6z" />
          </svg>
        </div>
        <span className="font-bold tracking-wide text-white text-xs">GateVision</span>
      </div>

      {NAV_ITEMS.map(({ href, label }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              active
                ? "bg-blue-700/30 text-blue-300 border border-blue-600/40"
                : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
            }`}
          >
            {label}
          </Link>
        );
      })}

      <button
        onClick={handleLogout}
        className="ml-auto text-xs text-gray-600 hover:text-gray-300 transition-colors"
      >
        Sign out
      </button>
    </nav>
  );
}
