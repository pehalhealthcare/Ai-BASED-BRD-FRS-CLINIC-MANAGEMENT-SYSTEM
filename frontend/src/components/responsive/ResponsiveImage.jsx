import React from 'react';

/**
 * ResponsiveImage Component
 * Uses native <picture> element for performant, sharp responsive image switching.
 */
export default function ResponsiveImage({
  sources = {},
  src,
  alt = 'AI-CMS Healthcare Platform',
  className = '',
  imgClassName = '',
  loading = 'lazy',
  fetchPriority = 'auto',
  style = {},
  onClick,
}) {
  const { mobile, tablet, desktop } = sources;
  const fallbackSrc = src || desktop || tablet || mobile;

  return (
    <picture className={`inline-block ${className}`} onClick={onClick}>
      {mobile && (
        <source
          media="(max-width: 767px)"
          srcSet={mobile}
        />
      )}
      {tablet && (
        <source
          media="(max-width: 1199px)"
          srcSet={tablet}
        />
      )}
      {desktop && (
        <source
          media="(min-width: 1200px)"
          srcSet={desktop}
        />
      )}
      <img
        src={fallbackSrc}
        alt={alt}
        loading={loading}
        // @ts-ignore
        fetchpriority={fetchPriority}
        className={`w-full h-auto object-cover ${imgClassName}`}
        style={style}
      />
    </picture>
  );
}
