"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES, type Category } from "@/lib/demo/products";
import { filterHref, type DemoState } from "@/lib/demo/query";

export function FilterControls({ state }: { state: DemoState }) {
  const router = useRouter();
  const [q, setQ] = useState(state.q);

  // Debounced live search; only navigates when the typed value differs from the URL.
  useEffect(() => {
    if (q.trim() === state.q) return;
    const id = setTimeout(() => {
      router.replace(filterHref(state, { q: q.trim() }), { scroll: false });
    }, 350);
    return () => clearTimeout(id);
  }, [q, state, router]);

  return (
    <div className="mb-4 flex flex-wrap gap-3">
      <label className="flex items-center gap-2 text-sm">
        <span className="text-zinc-600">Category</span>
        <select
          className="rounded border border-zinc-300 bg-white px-3 py-1.5"
          value={state.category}
          onChange={(e) =>
            router.push(filterHref(state, { category: e.target.value as Category, q: q.trim() }), {
              scroll: false,
            })
          }
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-1 items-center gap-2 text-sm">
        <span className="text-zinc-600">Search</span>
        <input
          className="min-w-0 flex-1 rounded border border-zinc-300 bg-white px-3 py-1.5"
          type="search"
          placeholder="Search products…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </label>
    </div>
  );
}
