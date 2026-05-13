"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { isAuthenticated, clearToken } from "@/lib/auth";

interface AuthContextType {
  authenticated: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  authenticated: false,
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const publicPaths = ["/", "/login"];
    if (!isAuthenticated() && !publicPaths.includes(pathname)) {
      router.push("/login");
    }
  }, [ready, pathname, router]);

  const logout = useCallback(() => {
    clearToken();
    router.push("/login");
  }, [router]);

  return <AuthContext.Provider value={{ authenticated: isAuthenticated(), logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
