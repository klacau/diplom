"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthButton, AuthError, AuthInput } from "@/components/auth/AuthUI";
import { useAuthStore } from "@/lib/store/authStore";

export default function RegistrationPage() {
  const router = useRouter();
  const { register, isLoading, error, clearError } = useAuthStore();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const user = useAuthStore((s) => s.user);
  const isAuthChecked = useAuthStore((s) => s.isAuthChecked);

  useEffect(() => {
    if (!isAuthChecked) return;
    if (user) router.replace("/main");
  }, [isAuthChecked, user, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    await register(email, password, name);
    router.push("/login"); 
  };

  return (
    <AuthShell title="Регистрация">
      <form onSubmit={onSubmit} className="space-y-4">
        <AuthInput
          placeholder="Имя"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
        />

        <AuthInput
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          inputMode="email"
        />

        <AuthInput
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          autoComplete="new-password"
        />

        <div className="pt-2">
          <AuthButton type="submit" variant="dark" disabled={isLoading}>
            {isLoading ? "Загрузка..." : "Далее"}
          </AuthButton>
        </div>

        <AuthButton
          type="button"
          variant="light"
          onClick={() => {
            clearError();
            router.push("/login");
          }}
        >
          Уже есть аккаунт? Войти
        </AuthButton>

        <AuthError message={error} />
      </form>
    </AuthShell>
  );
}
