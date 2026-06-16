import Card from '../../components/common/Card';

const SectionCard = ({ title, description = '', actions = null, children, className = '' }) => (
  <Card className={`p-0 ${className}`}>
    <div className="flex flex-col gap-3 border-b border-stone-200 px-6 py-5 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
        {description ? <p className="mt-1 text-sm text-stone-600">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
    <div className="p-6">{children}</div>
  </Card>
);

export default SectionCard;
