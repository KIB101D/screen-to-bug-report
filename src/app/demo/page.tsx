import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { parseDemoState, pageHref, queryProducts } from "@/lib/demo/query";
import { FilterControls } from "./filter-controls";

export const metadata: Metadata = { title: "Acme Store · Products" };

const CATEGORY_COLORS: Record<string, string> = {
  Electronics: "bg-sky-100 text-sky-800",
  Home: "bg-amber-100 text-amber-800",
  Books: "bg-emerald-100 text-emerald-800",
  Sports: "bg-rose-100 text-rose-800",
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default function DemoPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="min-h-full flex-1 bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <span className="text-lg font-semibold">Acme Store</span>
          <span className="text-sm text-zinc-500">Products</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="mb-6 text-2xl font-semibold">Products</h1>
        <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
          <Catalog searchParams={searchParams} />
        </Suspense>
      </main>
    </div>
  );
}

async function Catalog({ searchParams }: { searchParams: SearchParams }) {
  const state = parseDemoState(await searchParams);
  const result = queryProducts(state);

  return (
    <>

        <FilterControls state={state} />

        <p className="mb-3 text-sm text-zinc-600" data-testid="summary">
          Category: <strong>{state.category}</strong>
          {state.q && (
            <>
              {" "}· Search: <strong>“{state.q}”</strong>
            </>
          )}{" "}
          · Showing {result.from}–{result.to} of {result.total}
        </p>

        <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
          {result.items.map((p) => (
            <li key={p.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="w-6 text-right text-sm text-zinc-400">#{p.id}</span>
                <span className="font-medium">{p.name}</span>
                <span className={`rounded px-2 py-0.5 text-xs ${CATEGORY_COLORS[p.category]}`}>
                  {p.category}
                </span>
              </div>
              <span className="tabular-nums">€{p.price}</span>
            </li>
          ))}
          {result.items.length === 0 && (
            <li className="px-4 py-6 text-center text-zinc-500">No products found</li>
          )}
        </ul>

        {result.pageCount > 1 && (
          <nav className="mt-4 flex items-center gap-2" aria-label="Pagination">
            {result.page > 1 && (
              <Link className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-100" href={pageHref(state, result.page - 1)}>
                ← Prev
              </Link>
            )}
            {Array.from({ length: result.pageCount }, (_, i) => i + 1).map((n) => (
              <Link
                key={n}
                href={pageHref(state, n)}
                aria-current={n === result.page ? "page" : undefined}
                className={
                  n === result.page
                    ? "rounded bg-zinc-900 px-3 py-1.5 text-sm text-white"
                    : "rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-100"
                }
              >
                {n}
              </Link>
            ))}
            {result.page < result.pageCount && (
              <Link className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-100" href={pageHref(state, result.page + 1)}>
                Next →
              </Link>
            )}
          </nav>
        )}

      <footer className="mt-10 text-xs text-zinc-400">
        Acme Store demo {state.fixed ? "v1.4.3" : "v1.4.2"}
      </footer>
    </>
  );
}
