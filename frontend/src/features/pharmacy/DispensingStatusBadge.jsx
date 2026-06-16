import Badge from '../../components/common/Badge';

const toneByStatus = {
  draft: 'info',
  dispensed: 'success',
  cancelled: 'danger'
};

const DispensingStatusBadge = ({ status = 'draft' }) => (
  <Badge tone={toneByStatus[status] || 'neutral'}>{String(status).replaceAll('_', ' ')}</Badge>
);

export default DispensingStatusBadge;
