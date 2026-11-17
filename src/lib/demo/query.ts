import { CATEGORIES, PAGE_SIZE, PRODUCTS, type Category } from "./products";

export type DemoState = {
  category: Category;
  q: string;
  page: number;
  fixed: boolean;
};

type RawParams = { [key: string]: string | string[] | undefined };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parseDemoState(raw: RawParams): DemoState {
  const category = first(raw.category);
  const page = Number.parseInt(first(raw.page) ?? "1", 10);
  return {
    category: CATEGORIES.includes(category as Category) ? (category as Category) : "All",
    q: (first(raw.q) ?? "").trim(),
    page: Number.isFinite(page) && page > 0 ? page : 1,
    fixed: first(raw.fixed) === "1",
  };
}

export function queryProducts(state: DemoState) {
  const q = state.q.toLowerCase();
  const filtered = PRODUCTS.filter(
    (p) =>
      (state.category === "All" || p.category === state.category) &&
      (q === "" || p.name.toLowerCase().includes(q)),
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(state.page, pageCount);
  const start = (page - 1) * PAGE_SIZE;
  return {
    items: filtered.slice(start, start + PAGE_SIZE),
    total: filtered.length,
    page,
    pageCount,
    from: filtered.length === 0 ? 0 : start + 1,
    to: Math.min(start + PAGE_SIZE, filtered.length),
  };
}

/** URL for the filter controls: changing a filter always goes back to page 1. */
export function filterHref(state: DemoState, patch: Partial<Pick<DemoState, "category" | "q">>) {
  const next = { ...state, ...patch };
  const p = new URLSearchParams();
  if (next.fixed) p.set("fixed", "1");
  if (next.category !== "All") p.set("category", next.category);
  if (next.q) p.set("q", next.q);
  const s = p.toString();
  return s ? `/demo?${s}` : "/demo";
}

/**
 * URL for a pagination button.
 *
 * THE DEFECT (v1.4.2): the pagination links were written before the category filter
 * existed and only carry the search query, so moving to another page drops the
 * category and the list falls back to "All". `?fixed=1` serves v1.4.3, which keeps it.
 */
export function pageHref(state: DemoState, page: number) {
  const p = new URLSearchParams();
  if (state.fixed) p.set("fixed", "1");
  if (state.fixed && state.category !== "All") p.set("category", state.category);
  if (state.q) p.set("q", state.q);
  p.set("page", String(page));
  return `/demo?${p.toString()}`;
}
