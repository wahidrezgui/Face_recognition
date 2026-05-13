"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { AuthProvider, useAuth } from "@/context/AuthContext";

function LogoutButton() {
  const { authenticated, logout } = useAuth();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  if (!authenticated || pathname === "/login") return null;
  return (
    <button
      onClick={logout}
      className="fixed top-3 right-3 z-50 text-xs px-2.5 py-1.5 bg-gray-800 hover:bg-red-900 border border-gray-700 hover:border-red-700 rounded transition-colors text-gray-400 hover:text-white"
    >
      Logout
    </button>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 2,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LogoutButton />
        {children}
      </AuthProvider>
    </QueryClientProvider>
  );
}
