import { clsx } from 'clsx';

/**
 * Avatar — user avatar with image support and fallback initials.
 *
 * @param {object} props
 * @param {string} [props.src] - Image URL or base64 data URI
 * @param {string} [props.name] - Full name (used for initials fallback)
 * @param {'xs'|'sm'|'md'|'lg'|'xl'|'2xl'} [props.size='md']
 * @param {string} [props.className]
 * @param {() => void} [props.onClick]
 */
const Avatar = ({ src, name, size = 'md', className, onClick }) => {
  const sizeMap = {
    xs:  'w-6 h-6 text-[10px]',
    sm:  'w-8 h-8 text-xs',
    md:  'w-10 h-10 text-sm',
    lg:  'w-12 h-12 text-base',
    xl:  'w-16 h-16 text-lg',
    '2xl': 'w-24 h-24 text-2xl',
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  // Generate a consistent color from name
  const getColor = (name) => {
    const colors = [
      'from-aura-500 to-aura-600',
      'from-indigo-500 to-indigo-600',
      'from-violet-500 to-purple-600',
      'from-rose-500 to-pink-600',
      'from-amber-500 to-orange-600',
      'from-sky-500 to-blue-600',
    ];
    if (!name) return colors[0];
    const index = name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  return (
    <div
      role={onClick ? 'button' : undefined}
      onClick={onClick}
      className={clsx(
        'relative inline-flex shrink-0 items-center justify-center rounded-full overflow-hidden select-none',
        sizeMap[size],
        onClick && 'cursor-pointer ring-2 ring-offset-2 ring-transparent hover:ring-aura-500 transition',
        !src && `bg-gradient-to-br ${getColor(name)} text-white font-semibold`,
        className
      )}
    >
      {src ? (
        <img
          src={src}
          alt={name || 'Avatar'}
          className="w-full h-full object-cover"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      ) : (
        <span>{getInitials(name)}</span>
      )}
    </div>
  );
};

export default Avatar;
