"use client";

import { TrainResult } from "@/types";
import { CheckCircle2, Clock } from "lucide-react";

interface Props {
  result: TrainResult;
}

export default function DirectCard({ result }: Props) {
  return (
    <div className="group bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md hover:border-emerald-200 transition-all">
      <div className="flex">
        <div className="w-1 bg-emerald-500 shrink-0" />
        <div className="flex-1 px-5 py-4">
          {/* Top row */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-slate-900 text-[15px]">{result.train_name}</p>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">#{result.train_number}</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold px-2.5 py-1 shrink-0 border border-emerald-100">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Confirmed
            </span>
          </div>

          {/* Info row */}
          <div className="mt-3.5 flex items-center gap-4 flex-wrap">
            {result.departure && result.arrival && (
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-bold text-slate-900">{result.departure}</span>
                <div className="flex items-center gap-1.5">
                  <div className="h-px w-6 bg-slate-200" />
                  {result.duration && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 bg-slate-50 border border-slate-100 rounded-full px-2 py-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      {result.duration}
                    </span>
                  )}
                  <div className="h-px w-6 bg-slate-200" />
                </div>
                <span className="text-[15px] font-bold text-slate-900">{result.arrival}</span>
              </div>
            )}
            {result.seats && (
              <span className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-full px-2.5 py-1">
                {result.seats}
              </span>
            )}
            {result.fare && (
              <span className="ml-auto text-base font-bold text-slate-900">₹{result.fare}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
