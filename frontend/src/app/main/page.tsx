"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import { api } from "@/lib/api";
import type { Recipe } from "@/lib/types/recype";
import { CreateRecipeModal } from "@/components/recipes/CreateRecipeModal";

const PER_PAGE = 6;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function MainPage() {
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const isAuthChecked = useAuthStore((s) => s.isAuthChecked);

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(recipes.length / PER_PAGE));
  const [page, setPage] = useState(1);
  const logout = useAuthStore((s) => s.logout);

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const profileInitial = (user?.name?.[0] ?? user?.email?.[0] ?? "U").toUpperCase();

  const onLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const onDeleteRecipe = async (id: number) => {
    const confirmed = window.confirm("Удалить рецепт?");
    if (!confirmed) return;

    setDeletingId(id);
    try {
      await api.delete(`/api/recipes/${id}`);
      setRecipes((prev) => prev.filter((recipe) => recipe.id !== id));
    } catch (e: any) {
      setGenError(e?.response?.data?.detail ?? "Не удалось удалить рецепт");
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    if (!isAuthChecked) return;
    if (!user) router.replace("/login");
  }, [isAuthChecked, user, router]);

  useEffect(() => {
    if (!isAuthChecked || !user) return;
    (async () => {
      const res = await api.get<Recipe[]>("/api/recipes", { params: { skip: 0, limit: 100 } });
      setRecipes(res.data);
    })();
  }, [isAuthChecked, user]);

  useEffect(() => {
    setPage((p) => clamp(p, 1, totalPages));
  }, [totalPages]);

  const visibleItems = useMemo(() => {
    const start = (page - 1) * PER_PAGE;
    return recipes.slice(start, start + PER_PAGE);
  }, [recipes, page]);

  const showPagination = recipes.length > PER_PAGE;

  const onGenerate = async (payload: {
    products: string[];
    servings: number;
    recipes_count: number;
    preferences?: string;
  }) => {
    setGenError(null);
    setIsGenerating(true);
    try {
      const res = await api.post<Recipe[]>("/api/recipes/generate", payload);
      setRecipes((prev) => [...res.data, ...prev]);
      setIsCreateOpen(false);
      setPage(1);
    } catch (e: any) {
      setGenError(e?.response?.data?.detail ?? "Ошибка генерации");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isAuthChecked) {
    return (
      <div className="min-h-screen w-full bg-[#0f0f10]">
        <div className="pointer-events-none fixed inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(70%_70%_at_30%_20%,rgba(255,255,255,0.08),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(70%_70%_at_80%_50%,rgba(255,255,255,0.06),transparent_60%)]" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen w-full bg-[#0f0f10] text-white">
      <CreateRecipeModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={onGenerate}
        isLoading={isGenerating}
        error={genError}
      />

      <div className="relative mx-auto w-full max-w-[1400px] px-6 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-5 py-3 backdrop-blur-xl">
            <img className="h-[36px] w-[36px]" src="/logo.svg" alt="logo" />
            <div className="text-lg font-medium tracking-wide">Arecipes</div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="h-11 rounded-2xl bg-white/10 px-6 backdrop-blur-xl hover:bg-white/15"
            >
              Создать
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsProfileOpen((v) => !v)}
                className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-white/10 backdrop-blur-xl hover:bg-white/15"
                aria-label="Profile"
              >
                <span className="text-sm font-semibold">{profileInitial}</span>
              </button>

              {isProfileOpen ? (
                <div className="absolute right-0 top-14 z-20 w-64 rounded-3xl border border-white/10 bg-[#18181b]/95 p-3 shadow-2xl backdrop-blur-xl">
                  <div className="rounded-2xl bg-white/5 px-4 py-3">
                    <div className="text-sm font-medium">{user.name}</div>
                    <div className="mt-1 text-xs text-white/60">{user.email}</div>
                  </div>

                  <button
                    type="button"
                    onClick={onLogout}
                    className="mt-3 w-full rounded-2xl bg-white/10 px-4 py-3 text-left text-sm transition hover:bg-white/15"
                  >
                    Выйти из аккаунта
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {visibleItems.map((r) => (
            <div
              key={r.id}
              className="relative aspect-[4/3] overflow-hidden rounded-[36px] bg-white/10 shadow-[0_20px_80px_rgba(0,0,0,0.55)] transition hover:bg-white/15"
            >
              <button
                type="button"
                onClick={() => router.push(`/main/recipe/${r.id}`)}
                className="flex h-full w-full flex-col justify-between p-6 text-left"
              >
                <div>
                  <div className="pr-12 text-xl font-medium">{r.title}</div>
                  {r.description ? (
                    <div className="mt-2 line-clamp-3 text-sm text-white/70">
                      {r.description}
                    </div>
                  ) : null}
                </div>

                <div className="text-xs text-white/60">
                  Ингредиентов: {r.ingredients?.length ?? 0} · Шагов: {r.steps?.length ?? 0}
                </div>
              </button>

              <button
                type="button"
                onClick={() => onDeleteRecipe(r.id)}
                disabled={deletingId === r.id}
                className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-2xl bg-black/35 text-lg text-white/80 transition hover:bg-red-500/20 hover:text-red-200 disabled:opacity-50"
                aria-label="Удалить рецепт"
              >
                {deletingId === r.id ? "…" : "×"}
              </button>
            </div>
          ))}
        </div>

        {showPagination ? (
          <div className="mt-10 flex items-center justify-center gap-3 text-white/80">
            <PageButton disabled={page === 1} onClick={() => setPage(1)} ariaLabel="First page">
              «
            </PageButton>
            <PageButton
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              ariaLabel="Previous page"
            >
              ‹
            </PageButton>

            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }).slice(0, 7).map((_, idx) => {
                const p = idx + 1;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={[
                      "min-w-8 rounded-xl px-3 py-1 text-sm transition",
                      p === page ? "bg-white/15 text-white" : "hover:bg-white/10",
                    ].join(" ")}
                  >
                    {p}
                  </button>
                );
              })}
            </div>

            <PageButton
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              ariaLabel="Next page"
            >
              ›
            </PageButton>
            <PageButton disabled={page === totalPages} onClick={() => setPage(totalPages)} ariaLabel="Last page">
              »
            </PageButton>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PageButton({
  children,
  disabled,
  onClick,
  ariaLabel,
}: {
  children: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className="h-9 w-9 rounded-xl bg-white/10 backdrop-blur-xl transition hover:bg-white/15 disabled:opacity-40 disabled:hover:bg-white/10"
    >
      {children}
    </button>
  );
}

