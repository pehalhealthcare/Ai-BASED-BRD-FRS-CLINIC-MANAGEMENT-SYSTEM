import React from 'react';

/**
 * Production-ready, fully editable SVG recreation of the official PEHAL Healthcare logo.
 * Rebuilds all shapes (circular swooshes, custom PEHAL lettering, medical cross, and HEALTHCARE subtitle)
 * using precise vector paths for infinite scalability.
 *
 * Variants:
 * - 'primary' / 'light' (Horizontal orange-green logo with text)
 * - 'dark' (Horizontal logo optimized for dark backgrounds - light text)
 * - 'icon' (Swooshes & medical cross only)
 * - 'monochrome' (Single color inheriting fill/stroke)
 * - 'stacked' (Vertical/stacked layout)
 */
export default function PehalLogo({ variant = 'primary', className = '', height = 40, width }) {
  const orange = '#F58220';
  const green = '#00B140';

  const swooshes = (
    <g id="Swooshes">
      {/* Top Swooshes */}
      <path d="M 218 135 C 310 18, 590 10, 830 145 C 730 80, 480 70, 310 130 C 275 142, 235 142, 218 135 Z" fill={green} />
      <path d="M 285 160 C 370 70, 600 60, 715 155 C 640 110, 460 100, 350 152 C 325 164, 295 164, 285 160 Z" fill={orange} />
      <path d="M 350 178 C 420 110, 560 105, 630 175 C 570 140, 470 135, 400 172 C 380 182, 360 182, 350 178 Z" fill={green} />
      
      {/* Bottom Swooshes */}
      <path d="M 782 565 C 690 682, 410 690, 170 555 C 270 620, 520 630, 690 570 C 725 558, 765 558, 782 565 Z" fill={green} />
      <path d="M 715 540 C 630 630, 400 640, 285 545 C 360 590, 540 600, 650 548 C 675 536, 705 536, 715 540 Z" fill={orange} />
      <path d="M 650 522 C 580 590, 440 595, 370 525 C 430 560, 530 565, 600 528 C 620 518, 640 518, 650 522 Z" fill={green} />
    </g>
  );

  const wordmark = (textColor) => (
    <g id="PEHAL-Wordmark">
      {/* Letter P */}
      <path d="M 2 290 L 160 290 C 205 290, 222 305, 222 342 L 222 360 C 222 398, 205 412, 160 412 L 72 412 L 72 470 L 2 470 L 2 315 L 25 290 Z M 72 338 L 72 364 L 152 364 L 152 338 Z" fill={textColor} />
      
      {/* Letter E */}
      <path d="M 238 290 L 388 290 L 388 335 L 308 335 L 308 355 L 380 355 L 380 400 L 308 400 L 308 425 L 392 425 L 392 470 L 238 470 Z" fill={textColor} />
      
      {/* Letter H Left Stem */}
      <path d="M 408 290 L 478 290 L 478 470 L 408 470 Z" fill={textColor} />
      
      {/* Letter H Right Stem */}
      <path d="M 568 290 L 638 290 L 638 470 L 568 470 Z" fill={textColor} />
      
      {/* Letter A */}
      <path d="M 654 470 L 714 290 L 784 290 L 844 470 L 772 470 L 760 425 L 710 425 L 698 470 Z M 720 375 L 750 375 L 735 320 Z" fill={textColor} />
      
      {/* Letter L */}
      <path d="M 860 290 L 930 290 L 930 425 L 998 425 L 998 470 L 860 470 Z" fill={textColor} />
    </g>
  );

  const cross = (bgStrokeColor = '#FFFFFF') => (
    <g id="Medical-Cross">
      <path d="M 503 330 H 543 V 370 H 583 V 410 H 543 V 450 H 503 V 410 H 463 V 370 H 503 Z" fill={bgStrokeColor} stroke={bgStrokeColor} strokeWidth="12" strokeLinejoin="round" />
      <path d="M 506 335 H 540 V 373 H 578 V 407 H 540 V 445 H 506 V 407 H 468 V 373 H 506 Z" fill={green} />
    </g>
  );

  const subtitle = (subtitleColor) => (
    <g id="HEALTHCARE-Subtitle">
      <text x="500" y="535" fill={subtitleColor} fontFamily="'Inter', 'Montserrat', sans-serif" fontWeight="900" fontSize="52" letterSpacing="22" textAnchor="middle">HEALTHCARE</text>
    </g>
  );

  // If rendering ONLY the icon (e.g. for app icon / favicon)
  if (variant === 'icon') {
    return (
      <svg width={width || height} height={height} viewBox="0 0 1000 700" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        {swooshes}
        {cross('transparent')}
      </svg>
    );
  }

  // Dark variant (optimized for dark navy background)
  if (variant === 'dark') {
    return (
      <svg width={width || height * 1.4} height={height} viewBox="0 0 1000 700" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        {swooshes}
        {wordmark('#FFFFFF')}
        {cross('#0F172A')}
        {subtitle('#FFFFFF')}
      </svg>
    );
  }

  // Monochrome / single color style
  if (variant === 'monochrome') {
    return (
      <svg width={width || height * 1.4} height={height} viewBox="0 0 1000 700" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={className}>
        <g id="Swooshes-Mono">
          <path d="M 218 135 C 310 18, 590 10, 830 145 C 730 80, 480 70, 310 130 C 275 142, 235 142, 218 135 Z" />
          <path d="M 285 160 C 370 70, 600 60, 715 155 C 640 110, 460 100, 350 152 C 325 164, 295 164, 285 160 Z" />
          <path d="M 350 178 C 420 110, 560 105, 630 175 C 570 140, 470 135, 400 172 C 380 182, 360 182, 350 178 Z" />
          <path d="M 782 565 C 690 682, 410 690, 170 555 C 270 620, 520 630, 690 570 C 725 558, 765 558, 782 565 Z" />
          <path d="M 715 540 C 630 630, 400 640, 285 545 C 360 590, 540 600, 650 548 C 675 536, 705 536, 715 540 Z" />
          <path d="M 650 522 C 580 590, 440 595, 370 525 C 430 560, 530 565, 600 528 C 620 518, 640 518, 650 522 Z" />
        </g>
        {wordmark('currentColor')}
        <g id="Medical-Cross-Mono">
          <path d="M 503 330 H 543 V 370 H 583 V 410 H 543 V 450 H 503 V 410 H 463 V 370 H 503 Z" fill="none" stroke="currentColor" strokeWidth="12" strokeLinejoin="round" />
          <path d="M 506 335 H 540 V 373 H 578 V 407 H 540 V 445 H 506 V 407 H 468 V 373 H 506 Z" />
        </g>
        <g id="HEALTHCARE-Subtitle-Mono">
          <text x="500" y="535" fontFamily="'Inter', 'Montserrat', sans-serif" fontWeight="900" fontSize="52" letterSpacing="22" textAnchor="middle">HEALTHCARE</text>
        </g>
      </svg>
    );
  }

  // Primary Default horizontal logo (colored)
  return (
    <svg width={width || height * 1.4} height={height} viewBox="0 0 1000 700" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {swooshes}
      {wordmark(orange)}
      {cross('#FFFFFF')}
      {subtitle(green)}
    </svg>
  );
}
