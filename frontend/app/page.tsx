"use client";

import { useState } from "react";
import { searchTrains } from "@/lib/api";
import { TrainResult, SearchResponse } from "@/types";
import DirectCard from "@/components/DirectCard";
import SplitCard from "@/components/SplitCard";
import WaitlistCard from "@/components/WaitlistCard";
import SkeletonLoader from "@/components/SkeletonLoader";
import { Search, Scissors, CheckCircle, SplitSquareHorizontal, AlertCircle } from "lucide-react";

export default function Home() {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!origin || !destination || !date) return;
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const data = await searchTrains(
        origin.trim().toUpperCase(),
        destination.trim().toUpperCase(),
        date
      );
      setResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach the server. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  function renderCard(result: TrainResult) {
    switch (result.result_type) {
      case "direct":   return <DirectCard key={result.train_number} result={result} />;
      case "split":    return <SplitCard key={result.train_number} result={result} />;
      case "waitlist": return <WaitlistCard key={result.train_number} result={result} />;
    }
  }

  const hasResults = response && !loading;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600">
            <Scissors className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-base font-bold tracking-tight text-slate-900">
            Split<span className="text-blue-600">Seat</span>
          </span>
        </div>
      </header>

      {/* Hero + search */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
            Beat the IRCTC waitlist.
          </h1>
          <p className="mt-2 text-slate-500 max-w-lg">
            We find two confirmed tickets on the same train that cover your full journey — no waitlist, no stress.
          </p>

          <form
            onSubmit={handleSearch}
            className="mt-7 grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                From
              </label>
              <input
                className="w-full h-11 rounded-lg border border-slate-200 bg-slate-50 px-3.5 text-sm font-semibold uppercase text-slate-900 placeholder:normal-case placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                placeholder="e.g. TBM"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                maxLength={5}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                To
              </label>
              <input
                className="w-full h-11 rounded-lg border border-slate-200 bg-slate-50 px-3.5 text-sm font-semibold uppercase text-slate-900 placeholder:normal-case placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                placeholder="e.g. TEN"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                maxLength={5}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Date
              </label>
              <input
                type="date"
                className="w-full h-11 rounded-lg border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !origin || !destination || !date}
              className="h-11 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold flex items-center gap-2 transition-colors"
            >
              <Search className="h-4 w-4" />
              Search
            </button>
          </form>
        </div>
      </div>

      {/* Results area */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {loading && <SkeletonLoader />}

        {error && (
          <div className="flex items-start gap-3 rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-red-500" />
            {error}
          </div>
        )}

        {hasResults && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm font-semibold text-slate-900">
                {response.origin}
                <span className="mx-2 text-slate-300">→</span>
                {response.destination}
                <span className="ml-2 font-normal text-slate-400">{response.date}</span>
              </p>
              <span className="text-xs text-slate-400">
                {response.results.length} train{response.results.length !== 1 ? "s" : ""}
              </span>
            </div>

            {response.results.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 py-16 text-center text-slate-400 text-sm">
                No trains found for this route.
              </div>
            ) : (
              <div className="space-y-3">{response.results.map(renderCard)}</div>
            )}
          </div>
        )}

        {/* How it works — shown before first search */}
        {!response && !loading && !error && (
          <div className="grid sm:grid-cols-3 gap-4 mt-2">
            {[
              {
                icon: <Search className="h-5 w-5 text-blue-500" />,
                title: "Search your route",
                desc: "Enter your origin, destination and travel date.",
              },
              {
                icon: <SplitSquareHorizontal className="h-5 w-5 text-blue-500" />,
                title: "We scan every stop",
                desc: "Every intermediate station is checked as a possible split point.",
              },
              {
                icon: <CheckCircle className="h-5 w-5 text-emerald-500" />,
                title: "Travel confirmed",
                desc: "Two confirmed seats on the same train — same class, one connection.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-xl bg-white border border-slate-100 p-5 shadow-sm">
                <div className="mb-3">{item.icon}</div>
                <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
