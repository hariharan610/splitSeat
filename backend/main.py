from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict
import asyncio
import httpx
import os

app = FastAPI(title="SplitSeat API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY", "24a5da0931mshc8d6d8f37c3ffccp169924jsn8540886f5a00")
RAPIDAPI_HOST = "irctc1.p.rapidapi.com"
HEADERS = {
    "x-rapidapi-host": RAPIDAPI_HOST,
    "x-rapidapi-key": RAPIDAPI_KEY,
}
BASE_URL = f"https://{RAPIDAPI_HOST}"

# Default class and quota to check availability
DEFAULT_CLASS = "SL"
DEFAULT_QUOTA = "GN"

# Limit concurrent RapidAPI calls to avoid 429 rate-limit errors
_api_semaphore = asyncio.Semaphore(3)

# ---------------------------------------------------------------------------
# Mock fallback data (used when API quota is exhausted)
# ---------------------------------------------------------------------------

MOCK_DATA = {
    "trains": [
        {"train_number": "12633", "train_name": "Kanyakumari Express", "from_std": "06:00", "to_std": "18:30", "duration": "12:30", "class_type": ["SL", "2A", "3A"]},
        {"train_number": "12631", "train_name": "Nellai SF Express",   "from_std": "19:15", "to_std": "07:00", "duration": "11:45", "class_type": ["SL", "2A", "3A"]},
        {"train_number": "16723", "train_name": "Ananthapuri Express", "from_std": "11:00", "to_std": "23:45", "duration": "12:45", "class_type": ["SL", "2A", "3A"]},
    ],
    # direct-confirmed trains
    "confirmed": {"12631"},
    # split trains — intermediate stop
    "splits": {"12633": "SA"},  # train_no -> mid station code
    "schedule": {
        "12633": [
            {"station_code": "MS",  "station_name": "Chennai Central"},
            {"station_code": "TBM", "station_name": "Tambaram"},
            {"station_code": "SA",  "station_name": "Salem Junction"},
            {"station_code": "ED",  "station_name": "Erode Junction"},
            {"station_code": "CBE", "station_name": "Coimbatore"},
            {"station_code": "TEN", "station_name": "Tirunelveli"},
        ]
    },
}


def _mock_avail(confirmed: bool, seats: int = 42, fare: int = 415) -> Dict:
    if confirmed:
        return {"seat_avl_text": "Available", "availablity_status": "AVAILABLE", "seat_avl": seats, "total_fare": fare}
    return {"seat_avl_text": "WL#12", "availablity_status": "WL#12", "seat_avl": 0, "total_fare": None}


def _mock_triage(origin: str, destination: str, date: str, seat_class: str, quota: str) -> list:
    results = []
    for train in MOCK_DATA["trains"]:
        tn = train["train_number"]
        if tn in MOCK_DATA["confirmed"]:
            avail = _mock_avail(True)
            results.append({
                "train_number": tn, "train_name": train["train_name"],
                "result_type": "direct", "status": _format_status(avail), "status_color": "green",
                "seats": _format_status(avail), "legs": None,
                "departure": train["from_std"], "arrival": train["to_std"], "duration": train["duration"],
                "fare": avail["total_fare"],
            })
        elif tn in MOCK_DATA["splits"]:
            mid_code = MOCK_DATA["splits"][tn]
            sched = MOCK_DATA["schedule"].get(tn, [])
            mid_name = next((s["station_name"] for s in sched if s["station_code"] == mid_code), mid_code)
            a1, a2 = _mock_avail(True, 18, 210), _mock_avail(True, 31, 205)
            results.append({
                "train_number": tn, "train_name": train["train_name"],
                "result_type": "split", "status": "SPLIT FOUND", "status_color": "blue",
                "seats": None,
                "legs": [
                    {"leg_number": 1, "origin": origin, "destination": mid_code, "destination_name": mid_name,
                     "status": "CONFIRMED", "seats": _format_status(a1), "coach_change": True, "fare": a1["total_fare"]},
                    {"leg_number": 2, "origin": mid_code, "origin_name": mid_name, "destination": destination,
                     "status": "CONFIRMED", "seats": _format_status(a2), "coach_change": True, "fare": a2["total_fare"]},
                ],
                "departure": train["from_std"], "arrival": train["to_std"], "duration": train["duration"],
                "fare": None,
            })
        else:
            avail = _mock_avail(False)
            results.append({
                "train_number": tn, "train_name": train["train_name"],
                "result_type": "waitlist", "status": _format_status(avail), "status_color": "red",
                "seats": None, "legs": None,
                "departure": train["from_std"], "arrival": train["to_std"], "duration": train["duration"],
                "fare": None,
            })
    order = {"direct": 0, "split": 1, "waitlist": 2}
    return sorted(results, key=lambda r: order.get(r["result_type"], 3))


class SearchRequest(BaseModel):
    origin: str
    destination: str
    date: str
    seat_class: str = DEFAULT_CLASS
    quota: str = DEFAULT_QUOTA


# ---------------------------------------------------------------------------
# RapidAPI helpers
# ---------------------------------------------------------------------------

class _RateLimited(Exception):
    pass


async def fetch_trains_between(client: httpx.AsyncClient, origin: str, destination: str, date: str) -> list:
    """Fetch all trains running between origin and destination on the given date."""
    try:
        r = await client.get(
            f"{BASE_URL}/api/v3/trainBetweenStations",
            params={"fromStationCode": origin, "toStationCode": destination, "dateOfJourney": date},
            headers=HEADERS,
            timeout=15,
        )
        if r.status_code == 429:
            raise _RateLimited()
        r.raise_for_status()
        data = r.json()
        if not data.get("status"):
            return []
        return data.get("data", [])
    except _RateLimited:
        raise
    except Exception:
        return []


async def fetch_availability(
    client: httpx.AsyncClient,
    train_no: str,
    from_code: str,
    to_code: str,
    date: str,
    seat_class: str,
    quota: str,
) -> Optional[Dict]:
    """
    Returns availability dict for the specific date, or None on error.
    Response shape: { seat_avl_text, availablity_status, seat_avl, ticket_fare, ... }
    """
    try:
        async with _api_semaphore:
            r = await client.get(
                f"{BASE_URL}/api/v1/checkSeatAvailability",
                params={
                    "trainNo": train_no,
                    "fromStationCode": from_code,
                    "toStationCode": to_code,
                    "date": date,
                    "classType": seat_class,
                    "quota": quota,
                },
                headers=HEADERS,
                timeout=15,
            )
        r.raise_for_status()
        data = r.json()
        if not data.get("status") or not data.get("data"):
            return None
        # API returns availability for multiple dates; pick the one matching our date
        date_str = _normalise_date(date)
        for entry in data["data"]:
            if entry.get("availablity_date") == date_str:
                return entry
        # Fallback: return first entry
        return data["data"][0]
    except Exception:
        return None


async def fetch_train_schedule(client: httpx.AsyncClient, train_no: str) -> list:
    """Returns the full route stop list for a train."""
    try:
        async with _api_semaphore:
            r = await client.get(
                f"{BASE_URL}/api/v1/getTrainSchedule",
                params={"trainNo": train_no},
                headers=HEADERS,
                timeout=15,
            )
        r.raise_for_status()
        data = r.json()
        if not data.get("status"):
            return []
        return data["data"].get("route", [])
    except Exception:
        return []


def _normalise_date(date: str) -> str:
    """Convert YYYY-MM-DD → D-M-YYYY (as returned by the API)."""
    parts = date.split("-")
    if len(parts) == 3 and len(parts[0]) == 4:
        return f"{int(parts[2])}-{int(parts[1])}-{parts[0]}"
    return date


def _is_confirmed(avail: Optional[Dict]) -> bool:
    if not avail:
        return False
    text = avail.get("seat_avl_text", "").upper()
    return text == "AVAILABLE"


def _format_status(avail: Optional[Dict]) -> str:
    if not avail:
        return "UNAVAILABLE"
    status = avail.get("availablity_status", "")
    text = avail.get("seat_avl_text", "")
    if text.upper() == "AVAILABLE":
        seats = avail.get("seat_avl", "")
        return f"AVAILABLE ({seats} seats)"
    return status or text


# ---------------------------------------------------------------------------
# Core algorithm
# ---------------------------------------------------------------------------

async def generate_splits(
    client: httpx.AsyncClient,
    train: dict,
    origin: str,
    destination: str,
    date: str,
    seat_class: str,
    quota: str,
) -> Optional[List]:
    """
    Fetch the train's schedule, then probe every intermediate stop between
    origin and destination as a potential split point.
    Returns the first viable [leg1, leg2] pair, or None.
    """
    train_no = train["train_number"]
    route = await fetch_train_schedule(client, train_no)
    if not route:
        return None

    # Build ordered list of station codes on this route
    codes = [s["station_code"] for s in route]

    try:
        origin_idx = codes.index(origin)
        dest_idx = codes.index(destination)
    except ValueError:
        return None

    if origin_idx >= dest_idx:
        return None

    # Candidate split points: all stations strictly between origin and destination
    intermediate_codes = codes[origin_idx + 1 : dest_idx]

    # Probe all intermediate stops concurrently
    async def probe(mid: str):
        avail1, avail2 = await asyncio.gather(
            fetch_availability(client, train_no, origin, mid, date, seat_class, quota),
            fetch_availability(client, train_no, mid, destination, date, seat_class, quota),
        )
        if _is_confirmed(avail1) and _is_confirmed(avail2):
            return mid, avail1, avail2
        return None

    tasks = [probe(mid) for mid in intermediate_codes]
    results = await asyncio.gather(*tasks)

    for result in results:
        if result:
            mid, avail1, avail2 = result
            # Find the station name
            mid_name = next((s["station_name"] for s in route if s["station_code"] == mid), mid)
            return [
                {
                    "leg_number": 1,
                    "origin": origin,
                    "destination": mid,
                    "destination_name": mid_name,
                    "status": "CONFIRMED",
                    "seats": _format_status(avail1),
                    "coach_change": True,
                    "fare": avail1.get("total_fare"),
                },
                {
                    "leg_number": 2,
                    "origin": mid,
                    "origin_name": mid_name,
                    "destination": destination,
                    "status": "CONFIRMED",
                    "seats": _format_status(avail2),
                    "coach_change": True,
                    "fare": avail2.get("total_fare"),
                },
            ]
    return None


async def triage_trains(origin: str, destination: str, date: str, seat_class: str, quota: str) -> list:
    """
    1. Fetch all trains between origin and destination.
    2. For each train, check direct availability first.
    3. If waitlisted, run generate_splits() to find a 1-stop combo.
    """
    async with httpx.AsyncClient() as client:
        try:
            trains = await fetch_trains_between(client, origin, destination, date)
        except _RateLimited:
            return _mock_triage(origin, destination, date, seat_class, quota)

        if not trains:
            return []

        async def triage_one(train: dict) -> dict:
            train_no = train["train_number"]
            train_name = train["train_name"]

            # Check which classes this train offers; fall back to requested class
            raw_classes = train.get("class_type", [])
            offered_classes = [c if isinstance(c, str) else c.get("value", "") for c in raw_classes] if isinstance(raw_classes, list) else []
            check_class = seat_class if not offered_classes or seat_class in offered_classes else offered_classes[0]

            avail = await fetch_availability(client, train_no, origin, destination, date, check_class, quota)

            if _is_confirmed(avail):
                return {
                    "train_number": train_no,
                    "train_name": train_name,
                    "result_type": "direct",
                    "status": _format_status(avail),
                    "status_color": "green",
                    "seats": _format_status(avail),
                    "legs": None,
                    "departure": train.get("from_std"),
                    "arrival": train.get("to_std"),
                    "duration": train.get("duration"),
                    "fare": avail.get("total_fare") if avail else None,
                }

            # Waitlisted — try to find a split
            legs = await generate_splits(client, train, origin, destination, date, check_class, quota)

            if legs:
                return {
                    "train_number": train_no,
                    "train_name": train_name,
                    "result_type": "split",
                    "status": "SPLIT FOUND",
                    "status_color": "blue",
                    "seats": None,
                    "legs": legs,
                    "departure": train.get("from_std"),
                    "arrival": train.get("to_std"),
                    "duration": train.get("duration"),
                    "fare": None,
                }

            return {
                "train_number": train_no,
                "train_name": train_name,
                "result_type": "waitlist",
                "status": _format_status(avail),
                "status_color": "red",
                "seats": None,
                "legs": None,
                "departure": train.get("from_std"),
                "arrival": train.get("to_std"),
                "duration": train.get("duration"),
                "fare": None,
            }

        results = await asyncio.gather(*[triage_one(t) for t in trains])
        # Sort: direct first, then split, then waitlist
        order = {"direct": 0, "split": 1, "waitlist": 2}
        return sorted(results, key=lambda r: order.get(r["result_type"], 3))


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.post("/api/search")
async def search(request: SearchRequest):
    try:
        results = await triage_trains(
            request.origin.upper(),
            request.destination.upper(),
            request.date,
            request.seat_class,
            request.quota,
        )
        return {
            "results": results,
            "origin": request.origin.upper(),
            "destination": request.destination.upper(),
            "date": request.date,
        }
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 429:
            raise HTTPException(status_code=429, detail="RapidAPI rate limit exceeded. Please wait a minute and try again, or upgrade your plan.")
        raise HTTPException(status_code=502, detail=f"Upstream API error: {e.response.status_code}")
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Upstream API error: {str(e)}")


@app.get("/health")
async def health():
    return {"status": "ok"}
