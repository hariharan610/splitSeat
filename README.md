# SplitSeat

**Beat the IRCTC waitlist — without refreshing the page a hundred times.**

Anyone who has tried to book a train ticket in India knows the frustration: you search a route, and every train is waitlisted. You either gamble on confirmation closer to the journey date, or you don't travel.

SplitSeat takes a different approach. Instead of booking one waitlisted ticket for the full journey, it looks for two *confirmed* tickets on the *same train* — one from your origin to a midpoint station, and another from that midpoint to your destination. Together they cover your entire journey, on the same train, in the same class. You just change coaches at the intermediate stop.

**No waitlist. No stress. Same train.**

---

## Example

You want to travel **TBM → TEN** on the Kanyakumari Express. Direct ticket: waitlisted. SplitSeat finds:

```
TBM ──── [18 seats confirmed · ₹210] ──── SA ──── [31 seats confirmed · ₹205] ──── TEN
              Ticket 1                                     Ticket 2
                                  Salem Junction
                             (change coaches here)
```

Two confirmed tickets. Total ₹415. Same train, same class.

---

## Why this works

IRCTC quota is allocated per segment. A train running from Chennai to Kanyakumari has separate seat pools for each origin-destination pair. When the full-journey quota is exhausted, intermediate segments often still have availability — because those quotas are booked independently by passengers boarding mid-route.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 15 (App Router), Tailwind CSS, shadcn/ui |
| Backend | FastAPI, Python 3.9+, httpx (async) |
| Data | IRCTC RapidAPI (`irctc1.p.rapidapi.com`) |

## Project structure

```
splitseat/
├── backend/
│   ├── main.py          # FastAPI app — triage algorithm + API routes
│   └── requirements.txt
└── frontend/
    ├── app/
    │   ├── page.tsx     # Search UI + results
    │   └── layout.tsx
    ├── components/
    │   ├── DirectCard.tsx    # Green — direct confirmed ticket
    │   ├── SplitCard.tsx     # Blue  — split found
    │   ├── WaitlistCard.tsx  # Grey  — waitlisted, no split available
    │   └── SkeletonLoader.tsx
    ├── lib/api.ts        # fetch wrapper
    └── types/index.ts    # TypeScript types
```

## Getting started

### Prerequisites

- Python 3.9+
- Node.js 18+
- A [RapidAPI](https://rapidapi.com) key subscribed to `irctc1.p.rapidapi.com`

### Backend

```bash
cd backend
pip install fastapi uvicorn httpx pydantic
export RAPIDAPI_KEY=your_key_here
uvicorn main:app --port 8001 --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# runs on http://localhost:3000
```

Open `http://localhost:3000`, enter origin and destination station codes (e.g. `TBM`, `TEN`) and a travel date, then hit **Search**.

## How the algorithm works

1. **Fetch trains** between origin and destination on the given date
2. **Check direct availability** for each train in the requested class
3. If waitlisted → **fetch the train's full route** and probe every intermediate stop concurrently
4. For each candidate midpoint, simultaneously check `origin → mid` and `mid → destination` availability
5. Return the first split where **both legs are confirmed**

All availability checks run through a semaphore (max 3 concurrent) to stay within API rate limits. When the daily quota is exhausted, the app automatically falls back to mock data so the UI remains fully functional for demo purposes.

## Environment variables

| Variable | Description |
|---|---|
| `RAPIDAPI_KEY` | API key for `irctc1.p.rapidapi.com` on RapidAPI |

---

> **Note:** There is no official public API from IRCTC. This project uses a third-party RapidAPI scraper (`irctc1.p.rapidapi.com`) which is suitable for prototyping and demos. The free tier has a limited daily request quota, which can be exhausted quickly given the number of concurrent checks the algorithm performs. When the quota is hit, the app falls back to mock data automatically.

## License

MIT
