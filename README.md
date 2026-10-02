# Tokenomics Dashboard

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Interactive tokenomics visualization — enter token allocations with vesting schedules, get unlock timelines and supply charts. No backend, runs entirely in the browser, deployable to GitHub Pages.

Try the included [sample configuration](src/examples/sample-token.json) locally using the setup instructions below.

## Features

- **Allocation form** — add/remove allocations with cliff, vesting duration, TGE%, and type (linear/monthly/cliff)
- **Pie chart** — visual distribution of token allocations
- **Supply chart** — stacked area chart of circulating supply over time with large unlock markers
- **Unlock calendar** — month-by-month table with per-category unlocks
- **JSON import/export** — save and load tokenomics configurations
- **Validation** — real-time checks (percentages sum to 100%, etc.)

## Tech Stack

- Vite + React + TypeScript
- Recharts for charts
- Tailwind CSS for styling
- Vitest for unit tests

## Quick Start

```bash
bun install
bun run dev
```

Requires Node.js 20.19+ (or 22.12+) for the Vite/Vitest scripts, and Bun for the lockfile-based install. You can also use `npm install` and `npm run dev`.

Open http://localhost:5173

## Build & Deploy

```bash
bun run build
# Deploy dist/ to GitHub Pages
```

## Vesting Engine

Core logic in `src/lib/vesting.ts` — pure functions, fully tested:

- `calcAllocationUnlock(alloc, totalSupply, month)` — tokens unlocked in a specific month
- `calcCumulativeUnlock(alloc, totalSupply, upToMonth)` — cumulative unlock
- `generateTimeline(config)` — full monthly timeline
- `findLargeUnlocks(timeline, threshold)` — months with >X% of supply unlocking

### Vesting Types

| Type | Behavior |
|------|----------|
| `linear` | Equal monthly portions over vesting period |
| `monthly` | Same as linear (synonym) |
| `cliff` | Remaining tokens unlock once in month `cliffMonths + 1` |

Month 0 contains the TGE unlock. Linear/monthly vesting starts in month `cliffMonths + 1` and finishes in month `cliffMonths + vestingMonths`. A zero-duration schedule releases its remaining tokens once in month `cliffMonths + 1`. Calendar dates preserve the TGE day where possible and clamp to the end of shorter months. Configurations require finite numbers, unique allocation names, a valid date, whole-month durations, and a total schedule of at most 1200 months.

### Example Config

```json
{
  "tokenName": "ALPHA",
  "totalSupply": 1000000000,
  "tgeDate": "2025-03-01",
  "allocations": [
    { "name": "Public Sale", "percent": 12, "cliffMonths": 0, "vestingMonths": 6, "tgePercent": 25, "type": "linear" },
    { "name": "Team", "percent": 18, "cliffMonths": 12, "vestingMonths": 24, "tgePercent": 0, "type": "linear" },
    { "name": "Liquidity", "percent": 10, "cliffMonths": 0, "vestingMonths": 0, "tgePercent": 100, "type": "cliff" },
    { "name": "Ecosystem", "percent": 60, "cliffMonths": 0, "vestingMonths": 36, "tgePercent": 0, "type": "linear" }
  ]
}
```

## Testing

```bash
bun run test
```

## License

MIT
