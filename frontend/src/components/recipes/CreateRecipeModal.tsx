"use client";

import { useMemo, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    products: string[];
    servings: number;
    recipes_count: number;
    preferences?: string;
  }) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
};

export function CreateRecipeModal({ open, onClose, onSubmit, isLoading, error }: Props) {
  const [text, setText] = useState("");
  const [servings, setServings] = useState(2);
  const [recipesCount, setRecipesCount] = useState(3);
  const [preferences, setPreferences] = useState("");

  const products = useMemo(() => {
    return text
      .split(/[\n,]+/g)
      .map((s) => s.trim())
      .filter(Boolean);
  }, [text]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      products,
      servings,
      recipes_count: Math.max(1, Math.min(10, recipesCount || 1)),
      preferences: preferences.trim() ? preferences.trim() : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative w-full max-w-[640px] rounded-[28px] bg-[#151518] p-6 text-white shadow-[0_20px_80px_rgba(0,0,0,0.6)]">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-xl font-medium">Создать рецепт</div>
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-10 rounded-2xl bg-white/10 hover:bg-white/15"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-sm text-white/70">
            Впиши ингредиенты через запятую или с новой строки.
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"Например:\nяблоки\nкарамель\nмука\nяйца"}
            className="h-36 w-full resize-none rounded-2xl bg-white/10 px-4 py-3 text-[15px] outline-none placeholder:text-white/35"
          />

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="block">
              <div className="mb-2 text-xs text-white/60">Порций</div>
              <input
                type="number"
                min={1}
                max={20}
                value={servings}
                onChange={(e) => setServings(Number(e.target.value))}
                className="h-12 w-full rounded-2xl bg-white/10 px-4 text-[15px] outline-none"
                placeholder="Например, 2"
              />
            </label>

            <label className="block">
              <div className="mb-2 text-xs text-white/60">Сколько рецептов</div>
              <select
                value={recipesCount}
                onChange={(e) => setRecipesCount(Number(e.target.value))}
                className="h-12 w-full rounded-2xl bg-white/10 px-4 text-[15px] outline-none"
              >
                <option value={1}>1 рецепт</option>
                <option value={2}>2 рецепта</option>
                <option value={3}>3 рецепта</option>
                <option value={4}>4 рецепта</option>
                <option value={5}>5 рецептов</option>
              </select>
            </label>

            <label className="block">
              <div className="mb-2 text-xs text-white/60">Пожелания</div>
              <input
                value={preferences}
                onChange={(e) => setPreferences(e.target.value)}
                className="h-12 w-full rounded-2xl bg-white/10 px-4 text-[15px] outline-none placeholder:text-white/35"
                placeholder="Быстро, пп..."
              />
            </label>
          </div>

          <div className="text-xs text-white/60">
            Распознано ингредиентов: {products.length}
          </div>

          {error ? (
            <div className="rounded-2xl bg-red-500/15 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isLoading || products.length === 0}
            className="h-12 w-full rounded-2xl bg-white/85 text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Генерирую..." : "Сгенерировать"}
          </button>
        </form>
      </div>
    </div>
  );
}
