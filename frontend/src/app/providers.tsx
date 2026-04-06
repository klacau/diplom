"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/store/authStore";

export default function Providers({ children }: { children: React.ReactNode }) {
  const initAuth = useAuthStore((s) => s.initAuth);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return children;
}

