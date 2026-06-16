import Badge from '../../components/common/Badge';

const badgeConfig = {
  lowStock: {
    tone: 'warning',
    label: 'Low stock'
  },
  nearExpiry: {
    tone: 'warning',
    label: 'Near expiry'
  },
  expired: {
    tone: 'danger',
    label: 'Expired batch'
  }
};

const StockFlagBadge = ({ flag }) => {
  const config = badgeConfig[flag];

  if (!config) {
    return null;
  }

  return <Badge tone={config.tone}>{config.label}</Badge>;
};

export default StockFlagBadge;
