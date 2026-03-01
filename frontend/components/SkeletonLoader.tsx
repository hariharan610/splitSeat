"use client";

import { useEffect, useState } from "react";

const MESSAGES = [
  "Fetching trains on this route...",
  "Checking seat availability...",
  "Scanning intermediate stops...",
  "Calculating split options...",
  "Almost there...",
];

export default function SkeletonLoader() {
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setMsgIdx((i) => (i + 1) % MESSAGES.length);
    }, 1200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-blue-600 animate-pulse mb-5">
        {MESSAGES[msgIdx]}
      </p>

      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white rounded-xl border border-slate-200 overflow-hidden animate-pulse"
        >
          <div className="flex">
            <div className="w-1 bg-slate-200 shrink-0" />
            <div className="flex-1 px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="h-4 w-44 rounded-md bg-slate-100" />
                  <div className="h-3 w-20 rounded-md bg-slate-100" />
                </div>
                <div className="h-6 w-24 rounded-full bg-slate-100" />
              </div>
              <div className="mt-4 flex items-center gap-3">
                <div className="h-4 w-12 rounded-md bg-slate-100" />
                <div className="h-px w-16 bg-slate-100" />
                <div className="h-5 w-20 rounded-full bg-slate-100" />
                <div className="h-px w-16 bg-slate-100" />
                <div className="h-4 w-12 rounded-md bg-slate-100" />
                <div className="ml-auto h-5 w-14 rounded-md bg-slate-100" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
