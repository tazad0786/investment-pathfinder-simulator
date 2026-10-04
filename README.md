# WealthWise.ai — Investment Pathfinder & Simulator

A Groww-style **virtual investing academy**. Explore and paper-trade a broad, simulated Indian market, plan goals with SIPs and run every common investment calculator. Nothing here uses real money.

> **Disclaimer:** All prices, NAVs, yields, IPOs and option-chain data are **synthetic and for illustration only**. They are generated deterministically and are not live market data. This is not investment advice.

## Features

| Area | What you can do |
| --- | --- |
| **Explore** | Market indices, top gainers/losers/most active/52-week highs, sector heatmap, curated fund collections, watchlist, IPO and SIP widgets, net-worth summary |
| **Stocks & ETFs** | 250 NSE-style instruments (large/mid/small cap across about 30 sectors, plus ETFs). Use filters, sort and search. Each detail page has charts (1D–5Y), fundamentals, peers, **market and limit orders**, and positions |
| **Mutual funds** | 90+ funds across Equity, Debt, Hybrid, Index, Commodity, International and Solution-oriented categories (45 sub-categories). **SIP** (date and annual step-up), **lumpsum** and **redeem**, with exit loads and ELSS 3-year lock-in |
| **F&O** | Index and stock derivatives. The option chain uses Black-Scholes pricing, IV smile, Greeks and synthetic OI. Futures use cost-of-carry pricing. Also covers margin, payoff chart, exit, and expiry settlement |
| **Bonds** | T-Bills, G-Secs, SDLs, RBI floating-rate bonds, SGBs, tax-free, PSU and corporate bonds. Includes YTM and coupon projections, coupon credits and maturity redemption |
| **IPO** | Upcoming, open, closed and listed IPOs. Apply with UPI-style fund blocking, then get allotment or refund, and see listing-day gains. Listed stocks become tradable |
| **Portfolio** | Net worth, allocation, holdings by asset class, F&O positions, SIP management (edit/pause/resume/cancel), pending orders, transaction ledger with CSV export |
| **Goals & planner** | Inflation-adjusted goals with a required monthly SIP, plus a horizon-based asset mix and suggested funds. Includes a risk-profile wizard with recommendations |
| **Calculators** | SIP, step-up SIP, lumpsum, SWP, goal SIP, FD, RD, PPF, EMI, retirement corpus and CAGR |
| **Wallet & time machine** | Add or withdraw virtual cash (₹10 lakh to start). Advance the simulation by **next day** or **+1 month** to watch SIPs, coupons, IPO allotments, order expiry and F&O expiry happen |
| **AI coach** | Gemini-powered educational chat (`/api/chat`) with an offline fallback |

State is stored in `localStorage` (`wealthwise_state_v2`), so your portfolio persists across reloads. Use **Portfolio → Reset** to start over.

## Getting started

**Prerequisites:** Node.js 20+

```bash
npm install
cp .env.example .env.local   # optional: add GEMINI_API_KEY (and GEMINI_MODEL) for the AI coach
npm run dev                  # http://localhost:3000
```

| Script | Purpose |
| --- | --- |
| `npm run dev` | Express + Vite dev server |
| `npm run build` | Production client build + bundled server (`dist/`) |
| `npm start` | Serve the production build |
| `npm run lint` | TypeScript type-check |
| `npm test` | Unit tests (Vitest) for the finance maths, F&O pricing and the trading engine |

## Project structure

```
src/
  data/        synthetic catalogs: stocks, funds, bonds, indices, F&O underlyings, IPOs
  lib/         finance formulas, Black-Scholes/F&O helpers, chart history, formatting, seeded RNG
  store/       app state, reducer (trading/simulation engine), selectors, React provider
  components/  tabs (Home, Stocks, Funds, F&O, Bonds, IPO, Portfolio, Planner, Calculators) and shared UI
server.ts      Express server: Vite middleware, /api/health, /api/chat (Gemini)
```
