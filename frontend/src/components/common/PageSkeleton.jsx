import React from 'react';

/**
 * Reusable PageSkeleton Components (Option B)
 * Provides matching placeholder dimensions for Dashboard, Tables, and Cards.
 */

export const DashboardSkeleton = () => (
  <div className="space-y-5 animate-fade-in select-none">
    {/* Stat Cards Row */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-slate-100 animate-pulse" />
            <div className="w-12 h-4 rounded-full bg-slate-100 animate-pulse" />
          </div>
          <div className="w-20 h-6 rounded-lg bg-slate-100 animate-pulse" />
          <div className="w-28 h-3 rounded-md bg-slate-100 animate-pulse" />
        </div>
      ))}
    </div>

    {/* Main Middle Row (Appointments & Checked-In Queue) */}
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
      <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-100 p-5 space-y-4 h-[460px]">
        <div className="flex items-center justify-between">
          <div className="w-40 h-5 rounded-lg bg-slate-100 animate-pulse" />
          <div className="w-24 h-7 rounded-xl bg-slate-100 animate-pulse" />
        </div>
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="h-14 rounded-xl bg-slate-50 animate-pulse" />
          ))}
        </div>
      </div>

      <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-100 p-5 space-y-4 h-[460px]">
        <div className="flex items-center justify-between">
          <div className="w-32 h-5 rounded-lg bg-slate-100 animate-pulse" />
          <div className="w-16 h-4 rounded-full bg-slate-100 animate-pulse" />
        </div>
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-20 rounded-xl bg-slate-50 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  </div>
);

export const TableSkeleton = ({ rows = 5 }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-fade-in select-none">
    {/* Toolbar Placeholder */}
    <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
      <div className="w-64 h-9 rounded-xl bg-slate-100 animate-pulse" />
      <div className="flex items-center gap-2">
        <div className="w-28 h-9 rounded-xl bg-slate-100 animate-pulse" />
        <div className="w-24 h-9 rounded-xl bg-slate-100 animate-pulse" />
      </div>
    </div>

    {/* Table Rows Placeholder */}
    <div className="p-4 space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 rounded-xl bg-slate-50 animate-pulse flex items-center px-4 justify-between">
          <div className="w-1/4 h-4 rounded bg-slate-200/70" />
          <div className="w-1/6 h-4 rounded bg-slate-200/70" />
          <div className="w-1/6 h-4 rounded bg-slate-200/70" />
          <div className="w-12 h-6 rounded-full bg-slate-200/70" />
        </div>
      ))}
    </div>
  </div>
);

export const CardsGridSkeleton = ({ count = 6 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-fade-in select-none">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 animate-pulse" />
          <div className="space-y-1.5 flex-1">
            <div className="w-28 h-4 rounded bg-slate-100 animate-pulse" />
            <div className="w-16 h-3 rounded-full bg-slate-100 animate-pulse" />
          </div>
        </div>
        <div className="space-y-2 py-2">
          <div className="w-full h-3 rounded bg-slate-100 animate-pulse" />
          <div className="w-3/4 h-3 rounded bg-slate-100 animate-pulse" />
        </div>
        <div className="w-full h-8 rounded-xl bg-slate-100 animate-pulse" />
      </div>
    ))}
  </div>
);

export default {
  DashboardSkeleton,
  TableSkeleton,
  CardsGridSkeleton
};

