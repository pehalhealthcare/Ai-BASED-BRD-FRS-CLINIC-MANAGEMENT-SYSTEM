const PageHeader = ({ eyebrow, title, description, actions = null }) => (
  <div className="flex flex-col gap-4 rounded-[32px] border border-stone-200/80 bg-[linear-gradient(135deg,_rgba(255,255,255,0.95)_0%,_rgba(236,253,245,0.92)_100%)] p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] lg:flex-row lg:items-start lg:justify-between">
    <div>
      {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">{eyebrow}</p> : null}
      <h1 className="mt-2 text-3xl font-semibold text-stone-900">{title}</h1>
      {description ? <p className="mt-2 max-w-3xl text-sm text-stone-600">{description}</p> : null}
    </div>
    {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
  </div>
);

export default PageHeader;
