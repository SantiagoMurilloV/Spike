interface LiveBadgeProps {
  /** Visual size — controls padding, font size and dot size. */
  size?: 'sm' | 'md' | 'lg';
  /** Hide the text for ultra-compact places. */
  showText?: boolean;
  /** Optional label override. Defaults to "EN VIVO". */
  label?: string;
}

/**
 * Broadcast-style live indicator.
 *
 * - Rectangular `rounded-sm` (the design system reserves round pills for filter
 *   chips, not status badges).
 * - Pulse animation driven by the `.spk-live-dot` helper in `styles/index.css`
 *   so it respects `prefers-reduced-motion` automatically.
 * - Uses `Barlow Condensed` + wide tracking for a chyron feel.
 */
export function LiveBadge({ size = 'md', showText = true, label = 'EN VIVO' }: LiveBadgeProps) {
  const sizes = {
    sm: { container: 'px-2 py-[3px] text-[10px]', dot: 'w-1.5 h-1.5', gap: 'gap-1.5' },
    md: { container: 'px-2.5 py-1 text-[11px]', dot: 'w-2 h-2', gap: 'gap-2' },
    lg: { container: 'px-3.5 py-1.5 text-sm', dot: 'w-2.5 h-2.5', gap: 'gap-2' },
  };

  const s = sizes[size];

  return (
    <span
      role="status"
      aria-label={label.toLowerCase()}
      className={`inline-flex items-center ${s.gap} bg-[#E31E24] text-white rounded-sm ${s.container} font-bold uppercase`}
      style={{
        fontFamily: 'Barlow Condensed, sans-serif',
        letterSpacing: '0.08em',
      }}
    >
      <span className={`${s.dot} bg-white rounded-full spk-live-dot`} aria-hidden="true" />
      {showText && <span>{label}</span>}
    </span>
  );
}
