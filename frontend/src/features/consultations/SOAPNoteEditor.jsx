const SOAP_SECTIONS = [
  { key: 'subjective', label: 'Subjective', letter: 'S', colorClass: 'soap-s', badgeBg: 'bg-blue-500', badgeText: 'text-white' },
  { key: 'objective', label: 'Objective', letter: 'O', colorClass: 'soap-o', badgeBg: 'bg-emerald-500', badgeText: 'text-white' },
  { key: 'assessment', label: 'Assessment', letter: 'A', colorClass: 'soap-a', badgeBg: 'bg-amber-500', badgeText: 'text-white' },
  { key: 'plan', label: 'Plan', letter: 'P', colorClass: 'soap-p', badgeBg: 'bg-violet-500', badgeText: 'text-white' }
];

const SOAPNoteEditor = ({ value = {}, onChange }) => (
  <section className="grid gap-4 animate-fade-in">
    <div className="flex items-center gap-3">
      <div className="flex -space-x-1">
        {SOAP_SECTIONS.map((s) => (
          <span
            key={s.key}
            className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${s.badgeBg} ${s.badgeText} ring-2 ring-white dark:ring-stone-800`}
          >
            {s.letter}
          </span>
        ))}
      </div>
      <div>
        <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100">SOAP Note</h3>
        <p className="text-xs text-stone-500 dark:text-stone-400">AI formatting is assistive only — review and edit before saving.</p>
      </div>
    </div>

    <div className="grid gap-3 md:grid-cols-2">
      {SOAP_SECTIONS.map((section) => (
        <label
          key={section.key}
          className={`grid gap-2 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800/50 p-4 transition-all duration-200 hover:shadow-md ${section.colorClass}`}
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-stone-700 dark:text-stone-300">
            <span
              className={`inline-flex h-6 w-6 items-center justify-center rounded-lg text-[11px] font-bold ${section.badgeBg} ${section.badgeText}`}
            >
              {section.letter}
            </span>
            {section.label}
          </span>
          <textarea
            className="w-full rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900/50 px-3.5 py-2.5 text-sm text-stone-800 dark:text-stone-200 outline-none transition-all duration-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/30 placeholder:text-stone-400 dark:placeholder:text-stone-500 resize-y"
            rows={3}
            value={value?.[section.key] || ''}
            onChange={(event) => onChange(section.key, event.target.value)}
            placeholder={`Enter ${section.label.toLowerCase()} notes...`}
          />
        </label>
      ))}
    </div>
  </section>
);

export default SOAPNoteEditor;
