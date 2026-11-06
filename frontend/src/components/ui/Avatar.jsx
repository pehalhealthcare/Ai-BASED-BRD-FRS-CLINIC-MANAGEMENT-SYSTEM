import { useState, useEffect, useMemo } from 'react';
import { clsx } from 'clsx';

/**
 * Professional Default Healthcare SaaS Avatar SVG
 */
const DefaultAvatarGraphic = ({ className = 'w-full h-full' }) => (
  <svg
    viewBox="0 0 80 80"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={clsx('w-full h-full object-cover select-none', className)}
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="avatarBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#EFF6FF" />
        <stop offset="50%" stopColor="#EEF2FF" />
        <stop offset="100%" stopColor="#F5F3FF" />
      </linearGradient>
      <linearGradient id="avatarPerson" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4F46E5" />
        <stop offset="100%" stopColor="#3B82F6" />
      </linearGradient>
      <linearGradient id="avatarSteth" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#06B6D4" />
        <stop offset="100%" stopColor="#3B82F6" />
      </linearGradient>
    </defs>
    {/* Base circular background */}
    <rect width="80" height="80" rx="40" fill="url(#avatarBg)" />
    {/* Head */}
    <circle cx="40" cy="30" r="14" fill="url(#avatarPerson)" />
    {/* Shoulders & Torso */}
    <path
      d="M16 68C16 54.7452 26.7452 44 40 44C53.2548 44 64 54.7452 64 68V80H16V68Z"
      fill="url(#avatarPerson)"
      fillOpacity="0.9"
    />
    {/* Healthcare Collar / Stethoscope Accent */}
    <path
      d="M32 45C32 49.4183 35.5817 53 40 53C44.4183 53 48 49.4183 48 45"
      stroke="url(#avatarSteth)"
      strokeWidth="3.2"
      strokeLinecap="round"
    />
    <circle cx="40" cy="58" r="2.8" fill="#06B6D4" />
  </svg>
);

/**
 * Avatar — Enterprise healthcare SaaS profile avatar.
 *
 * Supports:
 * - Dynamic profile image fetching with fallback sequence:
 *   1. Uploaded/database image URL or data URI
 *   2. Default professionally designed healthcare SaaS avatar SVG
 *   3. User initials with soft blue-purple gradient background
 * - Prevents empty circles, broken images, and stretching
 * - Subtle blue-purple gradient ring
 * - Online-status indicator
 *
 * @param {object} props
 * @param {string} [props.src] - Image URL or base64 data URI
 * @param {string} [props.name] - Full name (used for initials fallback)
 * @param {'xs'|'sm'|'md'|'lg'|'xl'|'2xl'|string} [props.size='md']
 * @param {boolean} [props.gradientBorder=false] - Subtle blue-purple gradient ring
 * @param {boolean} [props.showOnline=false] - Small online status dot
 * @param {'default'|'initials'} [props.fallbackType='default']
 * @param {string} [props.className]
 * @param {() => void} [props.onClick]
 */
const Avatar = ({
  src,
  name = '',
  size = 'md',
  gradientBorder = false,
  showOnline = false,
  fallbackType = 'default',
  className,
  onClick
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Normalize image source
  const validSrc = useMemo(() => {
    if (!src || typeof src !== 'string') return null;
    const trimmed = src.trim();
    if (!trimmed || trimmed === 'null' || trimmed === 'undefined' || trimmed === 'none') {
      return null;
    }
    return trimmed;
  }, [src]);

  // Reset error state when src changes
  useEffect(() => {
    setImageError(false);
    setImageLoaded(false);
  }, [validSrc]);

  // Size token mappings
  const sizeMap = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
    '2xl': 'w-24 h-24 text-2xl'
  };

  const isCustomSize = typeof size === 'string' && (size.includes('w-') || size.includes('h-'));
  const sizeClass = isCustomSize ? size : (sizeMap[size] || sizeMap.md);

  // Extract initials cleanly
  const initials = useMemo(() => {
    if (!name || typeof name !== 'string') return 'U';
    const clean = name.replace(/[^\w\s]/gi, '').trim();
    if (!clean) return 'U';
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [name]);

  // Dynamic soft blue-purple gradient for initials fallback
  const initialsBgGradient = useMemo(() => {
    const gradients = [
      'from-blue-600 via-indigo-600 to-purple-600',
      'from-indigo-600 via-purple-600 to-pink-600',
      'from-sky-500 via-blue-600 to-indigo-600',
      'from-blue-600 via-teal-600 to-emerald-600'
    ];
    if (!name) return gradients[0];
    const index = name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % gradients.length;
    return gradients[index];
  }, [name]);

  const canShowImage = Boolean(validSrc && !imageError);

  const innerContent = (
    <div className={clsx(
      'relative w-full h-full rounded-full overflow-hidden flex items-center justify-center aspect-square select-none',
      !canShowImage && fallbackType === 'initials' && `bg-gradient-to-tr ${initialsBgGradient} text-white font-black tracking-tight`
    )}>
      {canShowImage ? (
        <img
          src={validSrc}
          alt={name ? `${name}'s profile avatar` : 'Profile Avatar'}
          className={clsx(
            'w-full h-full object-cover object-center rounded-full transition-opacity duration-300',
            imageLoaded ? 'opacity-100' : 'opacity-90'
          )}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
          loading="lazy"
        />
      ) : fallbackType === 'initials' ? (
        <span>{initials}</span>
      ) : (
        <DefaultAvatarGraphic />
      )}
    </div>
  );

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      className={clsx(
        'relative inline-flex shrink-0 rounded-full select-none transition-all duration-200',
        sizeClass,
        gradientBorder && 'p-[1.5px] bg-gradient-to-tr from-blue-500/40 via-indigo-500/50 to-purple-500/40 shadow-[0_2px_8px_rgba(79,70,229,0.12)]',
        !gradientBorder && 'shadow-xs',
        onClick && 'cursor-pointer hover:scale-[1.02] active:scale-[0.98] ring-offset-2 hover:ring-2 hover:ring-indigo-500/40',
        className
      )}
    >
      {innerContent}

      {/* Online status indicator */}
      {showOnline && (
        <span
          className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white shadow-xs z-10"
          title="Online"
        />
      )}
    </div>
  );
};

export default Avatar;
