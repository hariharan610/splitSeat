"use client";

import { TrainResult } from "@/types";
import { Scissors, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";

interface Props {
  result: TrainResult;
}

export default function SplitCard({ result }: Props) {
  const legs = result.legs ?? [];
  const leg1 = legs[0];
  const leg2 = legs[1];
  const totalFare = legs.reduce((sum, l) => sum + (l.fare ?? 0), 0);
  const midCode = leg1?.destination ?? "";
  const midName = leg1?.destination_name ?? midCode;

  // Parse seat count from "AVAILABLE (18 seats)" → "18 seats"
  function seatLabel(seats: string | undefined) {
    if (!seats) return null;
    const m = seats.match(/\((.+?)\)/);
    return m ? m[1] : seats;
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md hover:border-blue-200 transition-all">
      <div className="flex">
        <div className="w-1 bg-blue-500 shrink-0" />
        <div className="flex-1 px-5 py-4">

          {/* ── Header ── */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-slate-900 text-[15px]">{result.train_name}</p>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">#{result.train_number}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {result.duration && (
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                  <Clock className="h-3 w-3" />
                  {result.duration}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-1 border border-blue-100">
                <Scissors className="h-3 w-3" />
                Split Found
              </span>
            </div>
          </div>

          {/* ── Journey timeline ── */}
          <div className="mt-4 flex items-start gap-0">

            {/* Origin */}
            <div className="flex flex-col items-center shrink-0 w-12">
              <div className="h-3 w-3 rounded-full bg-blue-500 ring-2 ring-blue-100 mt-0.5" />
              <p className="text-xs font-bold text-slate-800 mt-1.5">{leg1?.origin}</p>
              {result.departure && (
                <p className="text-[11px] text-slate-400 mt-0.5">{result.departure}</p>
              )}
            </div>

            {/* Leg 1 bar */}
            <div className="flex-1 flex flex-col pt-1.5 px-1">
              <div className="relative">
                <div className="h-px bg-blue-300" />
                <div className="absolute -top-4 left-0 right-0 flex justify-center">
                  <span className="inline-flex items-center gap-1 bg-white text-[10px] font-semibold text-emerald-600 px-1.5">
                    <CheckCircle2 className="h-3 w-3" />
                    {seatLabel(leg1?.seats)}
                    {leg1?.fare ? ` · ₹${leg1.fare}` : ""}
                  </span>
                </div>
              </div>
            </div>

            {/* Mid station */}
            <div className="flex flex-col items-center shrink-0 w-20">
              <div className="h-3 w-3 rounded-full bg-white border-2 border-slate-400 ring-2 ring-slate-100 mt-0.5" />
              <p className="text-xs font-bold text-slate-700 mt-1.5">{midCode}</p>
              <p className="text-[10px] text-slate-400 mt-0.5 text-center leading-tight">{midName}</p>
            </div>

            {/* Leg 2 bar */}
            <div className="flex-1 flex flex-col pt-1.5 px-1">
              <div className="relative">
                <div className="h-px bg-blue-300" />
                <div className="absolute -top-4 left-0 right-0 flex justify-center">
                  <span className="inline-flex items-center gap-1 bg-white text-[10px] font-semibold text-emerald-600 px-1.5">
                    <CheckCircle2 className="h-3 w-3" />
                    {seatLabel(leg2?.seats)}
                    {leg2?.fare ? ` · ₹${leg2.fare}` : ""}
                  </span>
                </div>
              </div>
            </div>

            {/* Destination */}
            <div className="flex flex-col items-center shrink-0 w-12">
              <div className="h-3 w-3 rounded-full bg-blue-500 ring-2 ring-blue-100 mt-0.5" />
              <p className="text-xs font-bold text-slate-800 mt-1.5">{leg2?.destination}</p>
              {result.arrival && (
                <p className="text-[11px] text-slate-400 mt-0.5">{result.arrival}</p>
              )}
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="mt-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 text-xs text-amber-600">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>Coach change at <span className="font-semibold">{midName}</span></span>
            </div>
            {totalFare > 0 && (
              <div className="text-right shrink-0">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Total</p>
                <p className="text-base font-bold text-slate-900">₹{totalFare}</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
