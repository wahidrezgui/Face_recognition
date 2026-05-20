"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ExternalLink } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { fetchTrainingMode } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/persons", label: "Persons" },
  { href: "/events", label: "Events" },
  { href: "/config", label: "Config" },
];

const DISPLAY_LINKS = [
  { href: "/kiosk", label: "Kiosk", desc: "Arabic gate display" },
  { href: "/desk", label: "Desk", desc: "English welcome display" },
];

export default function NavBar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const { data: training } = useQuery({
    queryKey: ["training-mode"],
    queryFn: fetchTrainingMode,
    staleTime: 60_000,
    retry: false,
  });

  const hideNav = pathname === "/login" || pathname.startsWith("/kiosk");
  if (hideNav) return null;

  return (
    <nav className="flex h-11 shrink-0 items-center gap-1 border-b border-gv-border bg-gv-nav px-4 text-sm">
      <div className="mr-5 flex items-center gap-2">
        <div className="flex h-5 w-5 items-center justify-center rounded bg-blue-600">
          <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2a5 5 0 015 5v1h2a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V10a2 2 0 012-2h2V7a5 5 0 015-5zm0 2a3 3 0 00-3 3v1h6V7a3 3 0 00-3-3zm0 8a3 3 0 110 6 3 3 0 010-6z" />
          </svg>
        </div>
        <span className="text-xs font-bold tracking-wide text-white">GateVision</span>
      </div>

      {NAV_ITEMS.map(({ href, label }) => {
        const active = pathname.startsWith(href);
        const showTrainingBadge = href === "/config" && training?.enabled;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors",
              active
                ? "border border-blue-600/40 bg-blue-700/30 text-blue-300"
                : "text-gray-400 hover:bg-white/5 hover:text-gray-200",
            )}
          >
            {label}
            {showTrainingBadge && (
              <Badge
                variant="outline"
                className="h-4 border-amber-600/40 bg-amber-950/50 px-1 text-[9px] text-amber-400"
              >
                Training
              </Badge>
            )}
          </Link>
        );
      })}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs text-gray-400 hover:text-gray-200"
          >
            Displays
            <ChevronDown className="size-3 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          {DISPLAY_LINKS.map(({ href, label, desc }) => (
            <DropdownMenuItem key={href} asChild>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex cursor-pointer items-center justify-between gap-2"
              >
                <span>
                  <span className="block text-xs font-medium">{label}</span>
                  <span className="block text-[10px] text-muted-foreground">{desc}</span>
                </span>
                <ExternalLink className="size-3 shrink-0 opacity-50" />
              </a>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="ghost"
        size="sm"
        onClick={logout}
        className="ml-auto h-7 px-2 text-xs text-gray-600 hover:text-gray-300"
      >
        Sign out
      </Button>
    </nav>
  );
}
