import { X } from 'lucide-react';
import Avatar from '../../../components/ui/Avatar';

export const TagList = ({ items, color, onRemove }) => (
  <div className="flex flex-wrap gap-2 min-h-[40px]">
    {items.length > 0 ? items.map((item, i) => (
      <span
        key={i}
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border
          ${color === 'rose'
            ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300'
            : color === 'sky'
            ? 'bg-sky-50 border-sky-200 text-sky-700 dark:bg-sky-500/10 dark:border-sky-500/30 dark:text-sky-300'
            : 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-500/10 dark:border-indigo-500/30 dark:text-indigo-300'
          }`}
      >
        {item}
        {onRemove && (
          <button
            type="button"
            onClick={() => onRemove(i)}
            className="opacity-60 hover:opacity-100 transition ml-0.5"
            aria-label={`Remove ${item}`}
          >
            <X size={12} />
          </button>
        )}
      </span>
    )) : (
      <span className="text-xs text-slate-400 dark:text-slate-500 italic self-center">None added yet</span>
    )}
  </div>
);

export const SectionLabel = ({ children }) => (
  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 mb-2">{children}</p>
);

export const DoctorCard = ({ doc, onViewProfile, onBookSlot }) => (
  <div className="
    p-3.5 rounded-xl border
    bg-white dark:bg-navy-800
    border-slate-200 dark:border-white/10
    hover:border-aura-400 dark:hover:border-aura-500/50
    hover:-translate-y-0.5 hover:shadow-elevated dark:hover:shadow-elevated-dark
    transition-all duration-150 flex flex-col gap-3
  ">
    <div className="flex items-center gap-2.5">
      <Avatar name={doc.fullName} size="sm" />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{doc.fullName}</p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">{doc.specialization}</p>
      </div>
      {doc.isActive && (
        <span className="ml-auto shrink-0 flex items-center gap-1 text-[10px] font-semibold text-aura-600 dark:text-aura-400">
          <span className="w-1.5 h-1.5 rounded-full bg-aura-500 animate-pulse" />
          Online
        </span>
      )}
    </div>
    <div className="flex gap-2">
      <button
        onClick={() => onViewProfile(doc)}
        className="flex-1 py-1.5 text-[11px] font-semibold rounded-lg bg-slate-100 dark:bg-white/8 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/15 transition"
      >
        View Profile
      </button>
      <button
        onClick={() => onBookSlot(doc)}
        className="flex-1 py-1.5 text-[11px] font-semibold rounded-lg bg-aura-600 dark:bg-aura-500 text-white hover:bg-aura-700 dark:hover:bg-aura-600 transition"
      >
        Book Slot
      </button>
    </div>
  </div>
);

export const InputRow = ({ label, value, onChange, type = 'text', placeholder, required, ...props }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      className="
        w-full px-4 py-2.5 rounded-xl text-sm
        bg-white dark:bg-navy-800/60
        border border-slate-200 dark:border-white/10
        text-slate-900 dark:text-slate-100
        placeholder:text-slate-400 dark:placeholder:text-slate-600
        focus:outline-none focus:border-aura-500 focus:ring-2 focus:ring-aura-500/20
        transition
        disabled:opacity-60 disabled:cursor-not-allowed
      "
      {...props}
    />
  </div>
);

export const SelectRow = ({ label, value, onChange, children, required }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
    <select
      value={value}
      onChange={onChange}
      required={required}
      className="
        w-full px-4 py-2.5 rounded-xl text-sm
        bg-white dark:bg-navy-800/60
        border border-slate-200 dark:border-white/10
        text-slate-900 dark:text-slate-100
        focus:outline-none focus:border-aura-500 focus:ring-2 focus:ring-aura-500/20
        transition
      "
    >
      {children}
    </select>
  </div>
);
