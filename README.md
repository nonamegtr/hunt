# Deep-Penny Screener · AI · Healthcare · Clean Energy

Live screener for Nasdaq deep-penny tickers (**under $1.50**) across three high-conviction themes:

- **AI Infrastructure** — chip startups, AI platforms, edge compute (technology-based)
- **Healthcare** — mRNA, genomics, biotech (demographic tailwind)
- **Clean Energy** — EV, battery, charging (policy locked-in)

Quotes pulled from Yahoo Finance via [`yahoo-finance2`](https://github.com/gadicc/node-yahoo-finance2). No API key required.

## Features

- Curated, categorized Nasdaq watchlist (see `lib/tickers.ts`)
- Live thesis cards per category with avg %Δ and gainer count
- Top 3 movers spotlight
- Filters: category toggles, search, min volume, min %Δ
- Sortable table, color-coded category chips, glassmorphic dark UI
- 60s edge cache

## Local development

```bash
npm install
npm run dev
# open http://localhost:3000
```

## Deploy to Vercel (one command)

```bash
npm i -g vercel
vercel login         # one-time
vercel               # follow prompts → done
```

Or push this folder to a GitHub repo and click **Import Project** at https://vercel.com/new.

## Deploy to Netlify

1. Push to GitHub
2. https://app.netlify.com → Add new site → Import from Git → pick the repo
3. Build command: `npm run build`  ·  Publish directory: `.next`
4. Install the **Next.js Runtime** plugin (Netlify suggests it auto