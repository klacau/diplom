"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { Recipe } from "@/lib/types/recype";
import { useAuthStore } from "@/lib/store/authStore";

function getImageSrc(path?: string | null) {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${process.env.NEXT_PUBLIC_API_URL}${path}`;
}

export default function RecipePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const user = useAuthStore((s) => s.user);
  const isAuthChecked = useAuthStore((s) => s.isAuthChecked);

  const [isDeleting, setIsDeleting] = useState(false);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recipeImageSrc = getImageSrc(recipe?.image_url);

  const onDelete = async () => {
    const confirmed = window.confirm("Удалить рецепт?");
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await api.delete(`/api/recipes/${id}`);
      router.replace("/main");
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Не удалось удалить рецепт");
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (!isAuthChecked) return;
    if (!user) router.replace("/login");
  }, [isAuthChecked, user, router]);

  useEffect(() => {
    if (!isAuthChecked || !user) return;
    (async () => {
      try {
        const res = await api.get<Recipe>(`/api/recipes/${id}`);
        console.log("recipe response:", res.data);
        console.log("ingredients:", res.data.ingredients);
        setRecipe(res.data);
      } catch (e: any) {
        setError(e?.response?.data?.detail ?? "Не удалось загрузить рецепт");
      }
    })();
  }, [isAuthChecked, user, id]);

  if (!isAuthChecked) return <div className="min-h-screen bg-[#0f0f10]" />;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0f0f10] text-white">
      <div className="mx-auto w-full max-w-[1000px] px-6 py-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-6 rounded-2xl bg-white/10 px-4 py-2 hover:bg-white/15"
        >
          Назад
        </button>

        {error ? (
          <div className="rounded-2xl bg-red-500/15 px-4 py-3 text-sm text-red-200">{error}</div>
        ) : null}

        {recipe ? (
          <div className="space-y-8">
            <div className="relative overflow-hidden rounded-[28px] bg-white/10">
              {recipeImageSrc ? (
                <img
                  src={recipeImageSrc}
                  alt={recipe.title}
                  className="h-[320px] w-full object-cover"
                />
              ) : (
                <div className="h-[220px] w-full bg-white/5" />
              )}

              <div className="relative p-6">
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={isDeleting}
                  className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-2xl bg-black/30 text-xl text-white/80 hover:bg-red-500/20 hover:text-red-200 disabled:opacity-50"
                  aria-label="Удалить рецепт"
                >
                  {isDeleting ? "…" : "×"}
                </button>

                <div className="pr-14 text-3xl font-medium">{recipe.title}</div>
                {recipe.description ? (
                  <div className="mt-3 text-white/70">{recipe.description}</div>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-[28px] bg-white/10 p-6">
                <div className="mb-4 text-xl font-medium">Ингредиенты</div>
                <ul className="space-y-3 text-white/80">
                  {recipe.ingredients.map((i, idx) => {
                    const ingredientImageSrc = getImageSrc(i.image_url);

                    return (
                      <li key={idx} className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          {ingredientImageSrc ? (
                            <img
                              src={ingredientImageSrc}
                              alt={i.name}
                              className="h-10 w-10 rounded-xl object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-xl bg-white/10" />
                          )}
                          <span>{i.name}</span>
                        </div>
                        <span className="text-white/60">{i.amount}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="rounded-[28px] bg-white/10 p-6">
                <div className="mb-4 text-xl font-medium">Шаги</div>
                <ol className="space-y-3 text-white/80">
                  {recipe.steps
                    .slice()
                    .sort((a, b) => a.step - b.step)
                    .map((s) => (
                      <li key={s.step} className="rounded-2xl bg-white/5 p-3">
                        <div className="text-sm text-white/60">Шаг {s.step}</div>
                        <div className="mt-1">{s.text}</div>
                      </li>
                    ))}
                </ol>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-[28px] bg-white/10 p-6 text-white/70">Загрузка...</div>
        )}
      </div>
    </div>
  );
}


