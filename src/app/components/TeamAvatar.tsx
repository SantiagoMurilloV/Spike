import { useState } from 'react';

interface TeamAvatarProps {
  team: {
    initials: string;
    logo?: string;
    colors: { primary: string; secondary?: string };
  };
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-20 h-20 text-2xl',
} as const;

/**
 * TeamAvatar — single source of truth for rendering a team's logo / initials.
 *
 * Rendering rules:
 *  - No logo → square filled with the team's primary colour + bold initials.
 *  - Logo → the uploaded image rendered with `object-contain` on a tinted
 *    backdrop derived from the team colour, so transparent PNGs don't
 *    vanish against white admin tables and non-square logos don't get
 *    hard-cropped (the previous `object-cover` made them look like a
 *    random crop of the image).
 *  - Broken image URL → silently falls back to the initials square so a
 *    deleted upload never leaves a broken-image icon in the UI.
 */
export function TeamAvatar({ team, size = 'md', className = '' }: TeamAvatarProps) {
  const sizeClass = sizeClasses[size];
  const [loadError, setLoadError] = useState(false);

  // Logo renders on a tinted team-colour background so both light and
  // dark logos stay legible in any parent surface (white admin tables,
  // dark match cards, etc.).
  const tintedBackground = `${team.colors.primary}1A`; // 1A = 10% alpha hex

  if (team.logo && !loadError) {
    return (
      <div
        className={`${sizeClass} rounded-sm overflow-hidden flex-shrink-0 ring-1 ring-black/[0.06] ${className}`}
        style={{ backgroundColor: tintedBackground }}
      >
        <img
          src={team.logo}
          alt={team.initials}
          className="w-full h-full object-contain p-[2px]"
          onError={() => setLoadError(true)}
          loading="lazy"
          draggable={false}
        />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-sm flex items-center justify-center text-white font-bold flex-shrink-0 uppercase tracking-tight ${className}`}
      style={{
        backgroundColor: team.colors.primary,
        fontFamily: 'Barlow Condensed, sans-serif',
        letterSpacing: '0.02em',
      }}
    >
      {team.initials}
    </div>
  );
}
