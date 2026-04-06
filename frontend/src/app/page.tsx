"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AuthShell } from "@/components/auth/AuthShell"
import { AuthButton } from "@/components/auth/AuthUI";
import { useAuthStore } from "@/lib/store/authStore";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAuthChecked = useAuthStore((s) => s.isAuthChecked);

  useEffect(() => {
    if (!isAuthChecked) return;
    if (user) router.replace("/main");
  }, [isAuthChecked, user, router]);

  return (
    <AuthShell title="">
      <div className="flex flex-col items-center gap-4">
        <div className="mb-2 flex flex-col items-center gap-3">
          <img src="/logo.svg"/>
          <div className="text-3xl font-light tracking-wide">Arecipes</div>
        </div>

        <div className="mt-4 w-full space-y-3">
          <Link href="/login" className="block">
            <AuthButton variant="light">Вход</AuthButton>
          </Link>

          <Link href="/registration" className="block">
            <AuthButton variant="dark">Регистрация</AuthButton>
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
