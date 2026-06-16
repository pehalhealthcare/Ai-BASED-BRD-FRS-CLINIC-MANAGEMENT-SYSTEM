import Badge from '../../components/common/Badge';

const toneByFlag = {
  normal: 'success',
  low: 'warning',
  high: 'danger',
  critical: 'danger'
};

const labelByFlag = {
  normal: 'Normal',
  low: 'Low',
  high: 'High',
  critical: 'Critical'
};

const AbnormalFlagBadge = ({ flag = 'normal' }) => (
  <Badge tone={toneByFlag[flag] || 'neutral'}>{labelByFlag[flag] || flag}</Badge>
);

export default AbnormalFlagBadge;
