"use client";

import { TrainResult } from "@/types";
import { XCircle, Clock } from "lucide-react";

interface Props {
  result: TrainResult;
}

export default function WaitlistCard({ result }: Props) {
  return (
    <div className="bg-white rounded-xl border border-slate-150 overflow-hidden opacity-55">
      <div className="flex">
        <div className="w-1 bg-slate-300 shrink-0" />
        <div className="flex-1 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-slate-600 text-[15px]">{result.train_name}</p>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">#{result.train_number}</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 text-slate-500 text-xs font-semibold px-2.5 py-1 shrink-0 border border-slate-200">
              <XCircle className="h-3.5 w-3.5" />
              {result.status}
            </span>
          </div>

          <div className="mt-3 flex items-center gap-3 flex-wrap">
            {result.departure && result.arrival && (
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-slate-500">{result.departure}</span>
                <div className="h-px w-4 bg-slate-200" />
                <span className="text-sm font-semibold text-slate-500">{result.arrival}</span>
                {result.duration && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 ml-1">
                    <Clock className="h-2.5 w-2.5" />
                    {result.duration}
                  </span>
                )}
              </div>
            )}
            <span className="ml-auto text-xs text-slate-400 italic">No confirmed splits available</span>
          </div>
        </div>
      </div>
    </div>
  );
}
