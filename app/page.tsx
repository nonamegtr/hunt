"use client";

import { useEffect, useMemo, useState } from "react";

type Category = "ai" | "biotech" | "ev";

type Stock = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number | null;
  exchange: string | null;
  category: Category;
  subtheme: string;
};

type SortKey = "symbol" | "price" | "changePercent" | "volume" | "marketCap";
type SortDir = "asc" | "desc";

const CATS: Record<Category, { label: string; thesis: string; badge: string; ring: string; chip: string; bar: string; text: string; dot: string }> = {
  ai: {
    label: "AI Infrastructure",
    thesis: "Technology-based · chip & AI-platform startups",
    badge: "AI",
    ring: "ring-violet-400/30",
    chip: "bg-violet-500/15 text-violet-300 border-violet-400/30",
    bar: "bg-violet-400",
    text: "text-violet-300",
    dot: "bg-violet-400",
  },
  biotech: {
    label: "Healthcare",
    thesis: "Demographic tailwind · mRNA, genomics, biotech",
    badge: "BIO",
    ring: "ring-emerald-400/30",
    chip: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
    bar: "bg-emerald-400",
    text: "text-emerald-300",
    dot: "bg-emerald-400",
  },
  ev: {
    label: "Clean Energy",
    thesis: "Policy locked-in · EV, battery, charging",
    badge: "EV",
    ring: "ring-amber-400/30",
    chip: "bg-amber-500/15 text-amber-300 border-amber-400/30",
    bar: "bg-amber-400",
    text: "text-amber-300",
    dot: "bg-amber-400",
  },
};

const fmtNum = (n: number) =>
  !isFinite(n) ? "—" :
  n >= 1e9 ? (n / 1e9).toFixed(2) + "B" :
  n >= 1e6 ? (n / 1e6).toFixed(2) + "M" :
  n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : n.toFixed(0);

const fmtPrice = (n: number) => "$" + n.toFixed(n < 0.01 ? 4 : 3);

export default function Page() {
  const [data, setData] = useState<Stock[] | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalScanned, setTotalScanned] = useState(0);

  const [activeCats, setActiveCats] = useState<Set<Category>>(new Set(["ai", "biotech", "ev"]));
  const [search, setSearch] = useState("");
  const [minVolume, setMinVolume] = useState(0);
  const [minChange, setMinChange] = useState(-100);
  const [sortKey, setSortKey] = useState<SortKey>("changePercent");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/stocks", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed");
      setData(j.stocks ?? []);
      setUpdatedAt(j.updatedAt);
      setTotalScanned(j.total ?? 0);
    } catch (e: any) {
      setError(e.message);
      setData([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  const rows = useMemo(() => {
    if (!data) return [];
    const filtered = data.filter((s) => {
      if (!activeCats.has(s.category)) return false;
      if (s.volume < minVolume) return false;
      if (s.changePercent < minChange) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !s.symbol.toLowerCase().includes(q) &&
          !s.name.toLowerCase().includes(q) &&
          !s.subtheme.toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv) * dir;
      return ((av as number) - (bv as number)) * dir;
    });
  }, [data, activeCats, search, minVolume, minChange, sortKey, sortDir]);

  const statsByCat = useMemo(() => {
    const out: Record<Category, { count: number; gainers: number; avgChange: number }> = {
      ai: { count: 0, gainers: 0, avgChange: 0 },
      biotech: { count: 0, gainers: 0, avgChange: 0 },
      ev: { count: 0, gainers: 0, avgChange: 0 },
    };
    if (!data) return out;
    for (const cat of ["ai", "biotech", "ev"] as Category[]) {
      const items = data.filter((s) => s.category === cat);
      out[cat].count = items.length;
      out[cat].gainers = items.filter((s) => s.changePercent > 0).length;
      out[cat].avgChange = items.length === 0 ? 0 : items.reduce((a, b) => a + b.changePercent, 0) / items.length;
    }
    return out;
  }, [data]);

  const topMovers = useMemo(() => {
    if (!data) return [];
    return [...data].sort((a, b) => b.changePercent - a.changePercent).slice(0, 3);
  }, [data]);

  function toggleCat(c: Category) {
    setActiveCats((prev) => {
      const next = new Set(prev);
      if (next.has(c)) {
        if (next.size === 1) return prev;
        next.delete(c);
      } else next.add(c);
      return next;
    });
  }
  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("desc"); }
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-zinc-400 mb-2">
            <span className="live-dot" />
            <span>Live · Yahoo Finance</span>
            {updatedAt && <span className="text-zinc-500">· Updated {new Date(updatedAt).toLocaleTimeString()}</span>}
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight bg-gradient-to-br from-white to-zinc-400 bg-clip-text text-transparent">
            Deep-Penny Screener
          </h1>
          <p className="mt-2 text-zinc-400 max-w-2xl">
            Nasdaq names trading <span className="text-white font-medium">under $1.50</span> across three high-conviction themes:
            <span className="ml-1 text-violet-300">AI infrastructure</span>,
            <span className="ml-1 text-emerald-300">healthcare</span>,
            and <span className="text-amber-300">clean energy</span>.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="glass px-4 py-2 rounded-lg text-sm hover:bg-white/5 transition disabled:opacity-50 flex items-center gap-2"
        >
          <span className={loading ? "animate-spin inline-block" : "inline-block"}>↻</span>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        {(["ai", "biotech", "ev"] as Category[]).map((c) => {
          const meta = CATS[c];
          const stats = statsByCat[c];
          const active = activeCats.has(c);
          return (
            <button
              key={c}
              onClick={() => toggleCat(c)}
              className={"glass rounded-2xl p-5 text-left transition relative overflow-hidden group " + (active ? "ring-1 " + meta.ring : "opacity-60 hover:opacity-90")}
            >
              <div className={"absolute -top-px left-0 h-px w-full opacity-50 " + meta.bar} />
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={"h-2 w-2 rounded-full " + meta.dot} />
                  <span className={"text-[11px] font-mono uppercase tracking-wider " + meta.text}>{meta.badge}</span>
                </div>
                <span className={"text-xs " + (active ? "text-zinc-300" : "text-zinc-500")}>
                  {active ? "● shown" : "○ hidden"}
                </span>
              </div>
              <div className="text-lg font-semibold text-white mb-1">{meta.label}</div>
              <div className="text-xs text-zinc-400 mb-4 leading-relaxed">{meta.thesis}</div>
              <div className="flex items-baseline gap-4">
                <div>
                  <div className="text-2xl font-semibold tabular text-white">{stats.count}</div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500">Tickers</div>
                </div>
                <div>
                  <div className={"text-2xl font-semibold tabular " + (stats.avgChange >= 0 ? "text-up" : "text-down")}>
                    {stats.avgChange >= 0 ? "+" : ""}{stats.avgChange.toFixed(1)}%
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500">Avg Δ</div>
                </div>
                <div>
                  <div className="text-2xl font-semibold tabular text-white">{stats.gainers}</div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500">Gainers</div>
                </div>
              </div>
            </button>
          );
        })}
      </section>

      {topMovers.length > 0 && (
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {topMovers.map((s) => {
            const meta = CATS[s.category];
            return (
              <div key={s.symbol} className="glass rounded-xl p-4 flex items-center justify-between hover:bg-white/[0.03] transition">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm font-semibold tracking-wide">{s.symbol}</span>
                    <span className={"text-[10px] px-1.5 py-0.5 rounded-md border font-mono " + meta.chip}>{meta.badge}</span>
                  </div>
                  <div className="text-xs text-zinc-400 truncate">{s.name}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-semibold tabular">{fmtPrice(s.price)}</div>
                  <div className={"text-xs tabular font-medium " + (s.changePercent >= 0 ? "text-up" : "text-down")}>
                    {s.changePercent >= 0 ? "▲" : "▼"} {Math.abs(s.changePercent).toFixed(2)}%
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      )}

      <section className="glass rounded-2xl p-4 mb-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-1">
          <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5">Search</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Symbol, name, or theme…"
            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-white/20 focus:bg-black/40 transition"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5">
            Min Volume <span className="text-zinc-300 font-mono">{fmtNum(minVolume)}</span>
          </label>
          <input
            type="range" min={0} max={5000000} step={50000} value={minVolume}
            onChange={(e) => setMinVolume(Number(e.target.value))}
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5">
            Min % Change <span className="text-zinc-300 font-mono">{minChange >= 0 ? "+" : ""}{minChange.toFixed(0)}%</span>
          </label>
          <input
            type="range" min={-50} max={50} step={1} value={minChange}
            onChange={(e) => setMinChange(Number(e.target.value))}
            className="w-full"
          />
        </div>
      </section>

      {error && (
        <div className="mb-4 p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 text-sm">
          {error}
        </div>
      )}

      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between text-xs">
          <span className="text-zinc-400">
            <span className="text-white font-semibold">{rows.length}</span> results
            {data && <span className="text-zinc-500"> · {data.length} under $1.50 of {totalScanned} scanned</span>}
          </span>
          <span className="text-zinc-500 hidden sm:block">Click any column to sort</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-zinc-400 text-xs uppercase tracking-wider">
              <tr>
                <Th onClick={() => toggleSort("symbol")} active={sortKey === "symbol"} dir={sortDir}>Ticker</Th>
                <th className="px-4 py-3 text-left font-medium">Theme</th>
                <Th onClick={() => toggleSort("price")} active={sortKey === "price"} dir={sortDir} align="right">Price</Th>
                <Th onClick={() => toggleSort("changePercent")} active={sortKey === "changePercent"} dir={sortDir} align="right">% Δ</Th>
                <Th onClick={() => toggleSort("volume")} active={sortKey === "volume"} dir={sortDir} align="right">Volume</Th>
                <Th onClick={() => toggleSort("marketCap")} active={sortKey === "marketCap"} dir={sortDir} align="right">Mkt Cap</Th>
              </tr>
            </thead>
            <tbody>
              {loading && !data && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-zinc-500">
                  <span className="inline-flex items-center gap-2"><span className="animate-spin">↻</span> Loading market data…</span>
                </td></tr>
              )}
              {!loading && data && data.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-zinc-500">
                  No tickers came back under $1.50 right now. Try Refresh — Yahoo occasionally rate-limits.
                </td></tr>
              )}
              {!loading && rows.length === 0 && data && data.length > 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-zinc-500">No matches for your filters.</td></tr>
              )}
              {rows.map((s) => {
                const meta = CATS[s.category];
                const up = s.changePercent >= 0;
                return (
                  <tr key={s.symbol} className="border-t border-white/10 hover:bg-white/[0.025] transition animate-fade-in">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold tracking-wide">{s.symbol}</span>
                        <span className={"text-[10px] px-1.5 py-0.5 rounded-md border font-mono " + meta.chip}>{meta.badge}</span>
                      </div>
                      <div className="text-xs text-zinc-500 truncate max-w-[260px]">{s.name}</div>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">{s.subtheme || "—"}</td>
                    <td className="px-4 py-3 text-right font-mono tabular">{fmtPrice(s.price)}</td>
                    <td className={"px-4 py-3 text-right font-mono tabular font-medium " + (up ? "text-up" : "text-down")}>
                      {up ? "+" : ""}{s.changePercent.toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular text-zinc-300">{fmtNum(s.volume)}</td>
                    <td className="px-4 py-3 text-right font-mono tabular text-zinc-300">
                      {s.marketCap ? "$" + fmtNum(s.marketCap) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <footer className="mt-8 text-xs text-zinc-500 flex flex-wrap justify-between gap-2">
        <span>Data delayed and provided by Yahoo Finance for informational purposes only — not investment advice.</span>
        <span className="text-zinc-600">Built with Next.js · Deployed on Vercel</span>
      </footer>
    </main>
  );
}

function Th({ children, onClick, active, dir, align = "left" }: { children: React.ReactNode; onClick: () => void; active: boolean; dir: SortDir; align?: "left" | "right" }) {
  return (
    <th
      onClick={onClick}
      className={"px-4 py-3 select-none cursor-pointer hover:text-zinc-200 transition " + (align === "right" ? "text-right" : "text-left") + (active ? " text-white" : "")}
    >
      {children}
      <span className="ml-1 text-zinc-600">{active ? (dir === "asc" ? "↑" : "↓") : ""}</span>
    </th>
  );
}
