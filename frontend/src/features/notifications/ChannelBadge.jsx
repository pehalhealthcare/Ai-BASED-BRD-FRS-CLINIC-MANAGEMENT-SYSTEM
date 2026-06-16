const CHANNEL_STYLES = {
  mock: 'bg-sky-100 text-sky-800',
  sms: 'bg-emerald-100 text-emerald-800',
  whatsapp: 'bg-lime-100 text-lime-800',
  email: 'bg-violet-100 text-violet-800',
  in_app: 'bg-stone-200 text-stone-700'
};

const ChannelBadge = ({ channel }) => (
  <span
    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
      CHANNEL_STYLES[channel] || 'bg-stone-100 text-stone-700'
    }`}
  >
    {channel || 'unknown'}
  </span>
);

export default ChannelBadge;
