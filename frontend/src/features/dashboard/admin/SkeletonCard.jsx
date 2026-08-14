import React from 'react';

const SkeletonCard = ({ className = '', lines = 3, height = 'h-32' }) => (
  <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden ${height} ${className}`}>
    <div className="animate-pulse p-5 h-full flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="h-8 w-8 bg-slate-100 rounded-xl" />
        <div className="h-4 w-16 bg-slate-100 rounded-full" />
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`h-3 bg-slate-100 rounded-full ${i === lines - 1 ? 'w-1/2' : 'w-full'}`} />
      ))}
    </div>
  </div>
);

export const SkeletonRow = ({ cols = 4 }) => (
  <div className="animate-pulse flex gap-4 px-4 py-3 border-b border-slate-50">
    {Array.from({ length: cols }).map((_, i) => (
      <div key={i} className="h-3 bg-slate-100 rounded-full flex-1" />
    ))}
  </div>
);

export const SkeletonText = ({ width = 'w-full', height = 'h-3' }) => (
  <div className={`animate-pulse ${height} ${width} bg-slate-100 rounded-full`} />
);

export default SkeletonCard;
