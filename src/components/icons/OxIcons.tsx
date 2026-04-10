/**
 * OX GYM Custom Icon Set
 *
 * Style: Ultra clean flat vector, bold filled geometric shapes,
 * no outlines/gradients/shadows, strong silhouettes,
 * angular cuts with chevron & diagonal stripe motifs,
 * bull-inspired geometry, 24×24 grid, centered composition.
 */

interface IconProps {
  size?: number;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════════

export function OxHome({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      {/* Chevron roof + solid base */}
      <path d="M12 2L2 10h3v10h5v-6h4v6h5V10h3L12 2z" />
    </svg>
  );
}

export function OxDumbbell({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      {/* Geometric barbell — bold, symmetrical */}
      <path d="M2 9h2V7h3v10H4v-2H2v-6zm20 0h-2V7h-3v10h3v-2h2V9zM7 10h10v4H7v-4z" />
    </svg>
  );
}

export function OxBag({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      {/* Angular shopping bag with handle */}
      <path d="M8 6V4a4 4 0 118 0v2h4l1 16H3L4 6h4zm2-2a2 2 0 114 0v2h-4V4z" />
    </svg>
  );
}

export function OxMore({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      {/* Three bold horizontal bars — angular */}
      <rect x="3" y="4" width="18" height="3" />
      <rect x="3" y="10.5" width="18" height="3" />
      <rect x="3" y="17" width="18" height="3" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// PEOPLE
// ═══════════════════════════════════════════════════════════════

export function OxUser({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      {/* Bold person silhouette */}
      <circle cx="12" cy="7" r="4.5" />
      <path d="M4 21v-2c0-3.3 2.7-6 6-6h4c3.3 0 6 2.7 6 6v2H4z" />
    </svg>
  );
}

export function OxTrainer({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      {/* Person with checkmark badge */}
      <circle cx="10" cy="7" r="4" />
      <path d="M2 21v-2c0-3 2.2-5.5 5-5.9V21H2zm7-8c2.8.4 5 2.9 5 5.9V21H7V13z" />
      <path d="M17 10l2 2 4-4-1.5-1.5L19 9l-.5-.5L17 10z" />
    </svg>
  );
}

export function OxUsers({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      {/* Two people */}
      <circle cx="8" cy="7" r="3.5" />
      <path d="M2 20v-1.5c0-2.8 2.2-5 5-5h2c2.8 0 5 2.2 5 5V20H2z" />
      <circle cx="17" cy="8" r="2.5" />
      <path d="M15 20v-1.5c0-1.3-.4-2.5-1-3.5.6-.3 1.3-.5 2-.5h1c2.2 0 4 1.8 4 4V20h-6z" />
    </svg>
  );
}

export function OxUserPlus({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      {/* Person + add symbol */}
      <circle cx="10" cy="7" r="4" />
      <path d="M2 21v-2c0-3.3 2.7-6 6-6h4c3.3 0 6 2.7 6 6v2H2z" />
      <path d="M19 4v3h3v2h-3v3h-2V9h-3V7h3V4h2z" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// ACTIONS
// ═══════════════════════════════════════════════════════════════

export function OxCheck({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      {/* Bold angular checkmark */}
      <path d="M9 18L3 12l2.5-2.5L9 13l9.5-9.5L21 6 9 18z" />
    </svg>
  );
}

export function OxPlay({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      {/* Solid play triangle */}
      <path d="M6 3v18l15-9L6 3z" />
    </svg>
  );
}

export function OxSend({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      {/* Bold angular send arrow */}
      <path d="M2 3l20 9-20 9 3-9-3-9zm4.5 7.5L4 6l14 6H6.5zm0 1H18L4 18l2.5-6.5z" />
    </svg>
  );
}

export function OxRefresh({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      {/* Circular refresh arrows */}
      <path d="M12 4V1L8 5l4 4V6c3.3 0 6 2.7 6 6 0 1-.3 2-.7 2.8l1.5 1.5C19.6 15 20 13.6 20 12c0-4.4-3.6-8-8-8z" />
      <path d="M12 20c-3.3 0-6-2.7-6-6 0-1 .3-2 .7-2.8L5.2 9.7C4.4 11 4 12.4 4 14c0 4.4 3.6 8 8 8v3l4-4-4-4v3z" />
    </svg>
  );
}

export function OxLogout({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      {/* Door with exit arrow */}
      <path d="M3 3h10v2H5v14h8v2H3V3z" />
      <path d="M16 7l5 5-5 5v-3H9v-4h7V7z" />
    </svg>
  );
}

export function OxExternalLink({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M14 3h7v7h-2.5V6.5l-8 8L9 13l8-8H13.5V3z" />
      <path d="M5 5h5v2H6v11h11v-4h2v5a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// CHEVRONS & ARROWS
// ═══════════════════════════════════════════════════════════════

export function OxChevronLeft({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      {/* Bold angular chevron — brand motif */}
      <path d="M15.5 4L7 12l8.5 8 2.5-2.5L12 12l6-5.5L15.5 4z" />
    </svg>
  );
}

export function OxChevronRight({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      {/* Bold angular chevron — brand motif */}
      <path d="M8.5 4L17 12l-8.5 8-2.5-2.5L12 12 6 6.5 8.5 4z" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// STATUS & INFO
// ═══════════════════════════════════════════════════════════════

export function OxInfo({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      {/* Solid circle with bold i */}
      <path fillRule="evenodd" d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-1 5h2v2h-2V7zm0 4h2v6h-2v-6z" />
    </svg>
  );
}

export function OxAlert({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      {/* Solid triangle with exclamation */}
      <path d="M12 2L1 21h22L12 2zm-1 8h2v5h-2v-5zm0 6h2v2h-2v-2z" />
    </svg>
  );
}

export function OxHelp({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-1 15v-2h2v2h-2zm3.5-7.5c0 1.3-.8 2.1-1.5 2.5-.4.2-.5.4-.5.5V14h-2v-1.5c0-.8.6-1.4 1.2-1.7.7-.4 1.3-.8 1.3-1.3 0-.8-.7-1.5-1.5-1.5S10 8.7 10 9.5H8c0-1.9 1.6-3.5 3.5-3.5S15 7.6 15 9.5z" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// COMMUNICATION
// ═══════════════════════════════════════════════════════════════

export function OxChat({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      {/* Bold chat bubble with angular tail */}
      <path d="M4 3h16a2 2 0 012 2v10a2 2 0 01-2 2h-5l-3 4-3-4H4a2 2 0 01-2-2V5a2 2 0 012-2z" />
    </svg>
  );
}

export function OxBell({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      {/* Solid bell shape */}
      <path d="M12 2C8.7 2 6 4.7 6 8v4l-2 3v1h16v-1l-2-3V8c0-3.3-2.7-6-6-6z" />
      <path d="M10 20c0 1.1.9 2 2 2s2-.9 2-2h-4z" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// TRACKING & PROGRESS
// ═══════════════════════════════════════════════════════════════

export function OxTrendUp({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      {/* Bold upward arrow with chevron energy */}
      <path d="M14 4h7v7h-2.5V7.5L11 15l-3-3-5 5-2-2 7-7 3 3 6-6H14V4z" />
    </svg>
  );
}

export function OxTrendDown({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M14 20h7v-7h-2.5v3.5L11 9l-3 3-5-5-2 2 7 7 3-3 6 6H14v1z" />
    </svg>
  );
}

export function OxPulse({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      {/* Bold activity pulse / heartbeat */}
      <path d="M2 13h4l2-5 3 10 3-8 2 3h6v-2h-5l-3-4.5-3 8-3-10-3 8.5H2v-2z" />
    </svg>
  );
}

export function OxFlame({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      {/* Solid flame shape */}
      <path d="M12 2c0 4-4 5-4 9a4 4 0 008 0c0-4-4-5-4-9zm0 12a1.5 1.5 0 01-1.5-1.5c0-1.5 1.5-2 1.5-3.5 0 1.5 1.5 2 1.5 3.5A1.5 1.5 0 0112 14z" />
    </svg>
  );
}

export function OxScale({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      {/* Body scale — flat geometric */}
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M12 8a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" fill="currentColor" className="text-void" />
      <path d="M9 14h6v1H9v-1z" fill="currentColor" className="text-void" />
    </svg>
  );
}

export function OxTarget({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      {/* Concentric target — bold */}
      <path fillRule="evenodd" d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 4a6 6 0 100 12 6 6 0 000-12zm0 4a2 2 0 100 4 2 2 0 000-4z" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// REWARDS & ACHIEVEMENTS
// ═══════════════════════════════════════════════════════════════

export function OxTrophy({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      {/* Bold trophy */}
      <path d="M7 2h10v7a5 5 0 01-10 0V2z" />
      <path d="M5 3H2v4c0 1.7 1.3 3 3 3V3zm14 0h3v4c0 1.7-1.3 3-3 3V3z" />
      <rect x="10" y="14" width="4" height="4" />
      <rect x="7" y="18" width="10" height="3" />
    </svg>
  );
}

export function OxAward({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      {/* Medal / badge — angular */}
      <circle cx="12" cy="9" r="6" />
      <path d="M8 14l-2 8 6-3 6 3-2-8" />
    </svg>
  );
}

export function OxStar({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      {/* Bold angular star */}
      <path d="M12 2l3 7h7l-5.5 4.5L18.5 21 12 17l-6.5 4 2-7.5L2 9h7l3-7z" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// FOOD & HEALTH
// ═══════════════════════════════════════════════════════════════

export function OxFork({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      {/* Bold fork & knife — geometric */}
      <path d="M7 2v8a3 3 0 002 2.83V22h2V12.83A3 3 0 0013 10V2h-2v6h-1V2H8v6H7V2z" />
      <path d="M17 2c-1.7 2-2 4-2 6s.7 3.4 2 4v10h2V12c1.3-.6 2-2 2-4s-.3-4-2-6z" />
    </svg>
  );
}

export function OxHeart({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 21l-1.5-1.3C5.4 15.1 2 12.1 2 8.5 2 5.4 4.4 3 7.5 3c1.7 0 3.4.8 4.5 2.1C13.1 3.8 14.8 3 16.5 3 19.6 3 22 5.4 22 8.5c0 3.6-3.4 6.6-8.5 11.2L12 21z" />
    </svg>
  );
}

export function OxShield({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2L3 5v6c0 5.6 3.8 10.7 9 12 5.2-1.3 9-6.4 9-12V5l-9-3z" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// TIME & PLANNING
// ═══════════════════════════════════════════════════════════════

export function OxClock({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm1 5v5.4l3.3 3.3-1.6 1.6L11 13.6V7h2z" />
    </svg>
  );
}

export function OxCalendar({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M7 2h2v2h6V2h2v2h3a1 1 0 011 1v16a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1h3V2z" />
      <rect x="5" y="9" width="14" height="2" fill="currentColor" className="text-void" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// SETTINGS & TOOLS
// ═══════════════════════════════════════════════════════════════

export function OxGear({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M10 2l-1 3.5c-.5.2-1 .5-1.5.8L4 5.5 2 9l3 2c0 .3-.1.7-.1 1s.1.7.1 1l-3 2 2 3.5 3.5-.8c.5.3 1 .6 1.5.8L10 22h4l1-3.5c.5-.2 1-.5 1.5-.8l3.5.8 2-3.5-3-2c0-.3.1-.7.1-1s-.1-.7-.1-1l3-2-2-3.5-3.5.8c-.5-.3-1-.6-1.5-.8L14 2h-4zm2 6a4 4 0 100 8 4 4 0 000-8z" />
    </svg>
  );
}

export function OxSearch({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M10 2a8 8 0 105 14.3l5.4 5.4 2.1-2.1-5.4-5.4A8 8 0 0010 2zm0 3a5 5 0 100 10 5 5 0 000-10z" />
    </svg>
  );
}

export function OxClose({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M5.3 3.9L12 10.6l6.7-6.7 1.4 1.4L13.4 12l6.7 6.7-1.4 1.4L12 13.4l-6.7 6.7-1.4-1.4L10.6 12 3.9 5.3l1.4-1.4z" />
    </svg>
  );
}

export function OxFile({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
      <path d="M14 2v6h6" opacity="0.3" />
    </svg>
  );
}

export function OxLock({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M6 10V7a6 6 0 1112 0v3h1a1 1 0 011 1v10a1 1 0 01-1 1H5a1 1 0 01-1-1V11a1 1 0 011-1h1zm2 0h8V7a4 4 0 00-8 0v3z" />
    </svg>
  );
}

export function OxGlobe({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zM9.5 4.5C8 6.5 7 9 7 12s1 5.5 2.5 7.5C7.2 18.3 5 15.4 5 12s2.2-6.3 4.5-7.5zM12 4c-1 1.5-2 4-2 8s1 6.5 2 8c1-1.5 2-4 2-8s-1-6.5-2-8zm2.5.5C16.8 5.7 19 8.6 19 12s-2.2 6.3-4.5 7.5c1.5-2 2.5-4.5 2.5-7.5s-1-5.5-2.5-7.5zM4 11h16v2H4v-2z" />
    </svg>
  );
}

export function OxMoon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 3a9 9 0 109 9c0-.5 0-1-.1-1.4A6 6 0 0113.4 3.1C12.9 3 12.5 3 12 3z" />
    </svg>
  );
}

export function OxThumbUp({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M2 20h4V9H2v11zm20-9a2 2 0 00-2-2h-6.3l1-4.7.1-.3c0-.4-.2-.8-.4-1L13 2 7.5 7.5c-.3.3-.5.7-.5 1.2V18a2 2 0 002 2h9c.8 0 1.5-.5 1.8-1.2l3-7c.1-.2.2-.5.2-.8v-2z" />
    </svg>
  );
}

export function OxSettings({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      {/* Sliders / settings bars */}
      <rect x="3" y="4" width="18" height="2.5" rx="1" />
      <rect x="3" y="10.75" width="18" height="2.5" rx="1" />
      <rect x="3" y="17.5" width="18" height="2.5" rx="1" />
      <circle cx="8" cy="5.25" r="2.5" />
      <circle cx="16" cy="12" r="2.5" />
      <circle cx="10" cy="18.75" r="2.5" />
    </svg>
  );
}

export function OxMessage({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      {/* Chat with text lines */}
      <path d="M4 3h16a2 2 0 012 2v10a2 2 0 01-2 2h-5l-3 4-3-4H4a2 2 0 01-2-2V5a2 2 0 012-2z" />
    </svg>
  );
}
