import { SearchResponse } from "@/types";

const API_BASE = "http://localhost:8001";

export async function searchTrains(
  origin: string,
  destination: string,
  date: string
): Promise<SearchResponse> {
  const res = await fetch(`${API_BASE}/api/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ origin, destination, date }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `API error: ${res.status}`);
  }

  return res.json();
}
