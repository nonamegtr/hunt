import { NextResponse } from "next/server";
import yahooFinance from "yahoo-finance2";
import { NASDAQ_PENNY_TICKERS, TICKER_MAP } from "@/lib/tickers";
import type { Category } from "@/lib/tickers";

export const runtime = "nodejs";
export const maxDuration = 30;
export const revalidate = 60;

export type Stock = {
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

const MAX_PRICE = 1.5;

// @ts-ignore - silence yahoo-finance2 survey notice if available
yahooFinance.suppressNotices?.(["yahooSurvey"]);

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function fetchBatch(batch: string[]): Promise<Stock[]> {
  try {
    const quotes = await yahooFinance.quote(batch, {}, { validateResult: false });
    const list: any[] = Array.isArray(quotes) ? quotes : [quotes];
    return list
      .filter((q) => q && typeof q.regularMarketPrice === "number")
      .map((q) => {
        const meta = TICKER_MAP[q.symbol];
        return {
          symbol: q.symbol ?? "",
          name: q.shortName || q.longName || q.symbol || "",
          price: q.regularMarketPrice,
          change: q.regularMarketChange ?? 0,
          changePercent: q.regularMarketChangePercent ?? 0,
          volume: q.regularMarketVolume ?? 0,
          marketCap: q.marketCap ?? null,
          exchange: q.fullExchangeName ?? q.exchange ?? null,
          category: (meta?.category ?? "ai") as Category,
          subtheme: meta?.subtheme ?? "",
        };
      });
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const batches = chunk(NASDAQ_PENNY_TICKERS, 25);
    const settled = await Promise.allSettled(batches.map(fetchBatch));
    const all: Stock[] = settled.flatMap((s) => (s.status === "fulfilled" ? s.value : []));
    const filtered = all.filter((s) => s.price > 0 && s.price <= MAX_PRICE);

    return NextResponse.json(
      {
        count: filtered.length,
        total: all.length,
        maxPrice: MAX_PRICE,
        updatedAt: new Date().toISOString(),
        stocks: filtered,
      },
      { headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=300" } }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "fetch failed", stocks: [] }, { status: 500 });
  }
}
