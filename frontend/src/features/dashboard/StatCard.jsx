import Card from '../../components/common/Card';

const StatCard = ({ label, value, hint = '' }) => (
  <Card className="p-5">
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">{label}</p>
    <p className="mt-3 text-3xl font-semibold text-stone-900">{value}</p>
    {hint ? <p className="mt-2 text-sm text-stone-600">{hint}</p> : null}
  </Card>
);

export default StatCard;
