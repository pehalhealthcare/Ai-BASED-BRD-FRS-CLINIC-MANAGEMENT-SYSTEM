const RISK_STYLES = {
  low: 'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100 text-amber-800',
  high: 'bg-rose-100 text-rose-700'
};

const NoShowRiskBadge = ({ risk }) => {
  const level = risk?.level || 'low';
  const reasons = risk?.reasons || [];
  const recommendedAction = risk?.recommendedAction || '';
  const modelStatus = risk?.modelStatus || '';

  return (
    <div className="grid gap-2">
      <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold capitalize ${RISK_STYLES[level] || RISK_STYLES.low}`}>
        {level} risk
      </span>
      {reasons.length ? <p className="text-xs leading-5 text-stone-600">{reasons.join(', ')}</p> : null}
      {recommendedAction ? <p className="text-xs leading-5 text-stone-500">{recommendedAction}</p> : null}
      {modelStatus ? <p className="text-[11px] uppercase tracking-[0.16em] text-stone-400">{modelStatus.replaceAll('_', ' ')}</p> : null}
    </div>
  );
};

export default NoShowRiskBadge;
