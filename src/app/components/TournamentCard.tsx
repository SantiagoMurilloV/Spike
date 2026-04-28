import { Tournament } from '../types';
import { Calendar, Users, MapPin, Trophy, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { LiveBadge } from './LiveBadge';
import { formatShortDate } from '../lib/format';

interface TournamentCardProps {
  tournament: Tournament;
  onClick?: () => void;
}

/**
 * TournamentCard — hero card for tournament lists.
 *
 * - Image area uses the tournament's `coverImage` if provided, otherwise
 *   falls back to the brand blue→black gradient with the 45° red diagonal
 *   court-line pattern.
 * - Status badge (LIVE / PRÓXIMO / FINALIZADO) sits over the image.
 * - Meta grid below with dates · teams · courts · format.
 * - Full-width "Ver torneo" CTA at the bottom.
 * - Hover: lifts -4px and reveals a 1px red accent rail along the bottom.
 */
export function TournamentCard({ tournament, onClick }: TournamentCardProps) {
  const isLive = tournament.status === 'ongoing';
  const isUpcoming = tournament.status === 'upcoming';
  const isCompleted = tournament.status === 'completed';

  const dateLabel = `${formatShortDate(tournament.startDate)} — ${formatShortDate(tournament.endDate)}`;
  const courtsLabel = `${tournament.courts.length} ${tournament.courts.length === 1 ? 'cancha' : 'canchas'}`;
  // Prefer the real enrollment count from the backend (LIST_SELECT). Fall
  // back to the configured cap when the API hasn't shipped that field
  // yet (older client cache, optimistic local state, etc.) so the card
  // never shows blank.
  const teamsValue = tournament.enrolledCount ?? tournament.teamsCount;

  return (
    <motion.div
      className="group relative bg-white overflow-hidden cursor-pointer flex flex-col"
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      style={{
        border: 'var(--border-strong)',
        borderRadius: 'var(--radius-card)',
        boxShadow: 'var(--shadow-card)',
      }}
      whileHover={{
        y: -6,
        boxShadow: 'var(--shadow-elevated)' as unknown as string,
      }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {/* Left red accent rail — slides in on hover (or stays on for live) */}
      <motion.div
        className="absolute left-0 top-0 bottom-0 w-[3px] bg-spk-red z-20"
        style={{ originY: 0 }}
        initial={{ scaleY: 0 }}
        whileHover={{ scaleY: 1 }}
        animate={isLive ? { scaleY: 1 } : undefined}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        aria-hidden="true"
      />

      {/* ── Image / banner area ──────────────────────────────── */}
      <div className="spk-tcard-image relative h-48 sm:h-56 overflow-hidden">
        {/* Background image or gradient — scales on hover for a subtle
            "zoom into the action" effect. */}
        <motion.div
          className="absolute inset-0"
          style={
            tournament.coverImage
              ? { background: `url(${tournament.coverImage}) center/cover` }
              : { background: 'linear-gradient(135deg, #003087 0%, #0F0F14 100%)' }
          }
          whileHover={{ scale: 1.06 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          aria-hidden="true"
        />

        {/* Diagonal red pattern on the gradient fallback */}
        {!tournament.coverImage && (
          <div
            className="absolute inset-0 opacity-[0.18] pointer-events-none"
            aria-hidden="true"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, #E31E24 0 12px, transparent 12px 24px)',
            }}
          />
        )}

        {/* Dark gradient overlay — ensures title contrast on any image */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10"
          aria-hidden="true"
        />

        {/* Status + sport badges — top left */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
          {isLive && <LiveBadge size="sm" />}
          {isUpcoming && (
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white text-black rounded-sm text-[11px] font-bold uppercase"
              style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em' }}
            >
              <span className="w-1 h-1 rounded-full bg-black" aria-hidden="true" />
              Próximo
            </span>
          )}
          {isCompleted && (
            <span
              className="inline-block px-2.5 py-1 bg-black/70 text-white/90 border border-white/10 rounded-sm text-[11px] font-bold uppercase"
              style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em' }}
            >
              Finalizado
            </span>
          )}
          {tournament.sport && (
            <span
              className="inline-block px-2.5 py-1 bg-white/10 backdrop-blur-md text-white border border-white/20 rounded-sm text-[11px] font-bold uppercase"
              style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em' }}
            >
              {tournament.sport}
            </span>
          )}
        </div>

        {/* Hover arrow in top-right — hints at clickability */}
        <motion.div
          className="absolute top-3 right-3 w-10 h-10 bg-white/10 backdrop-blur-md border border-white/20 rounded-sm flex items-center justify-center z-10"
          initial={{ opacity: 0, scale: 0.8 }}
          whileHover={{ opacity: 1, scale: 1 }}
          aria-hidden="true"
        >
          <ArrowRight className="w-4 h-4 text-white" />
        </motion.div>

        {/* Title block — bottom-aligned, strong type hierarchy */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5 z-10">
          {tournament.club && (
            <p
              className="text-[10px] sm:text-xs text-white/75 uppercase mb-1.5 tracking-[0.14em] truncate"
              style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
            >
              {tournament.club}
            </p>
          )}
          <h3
            className="spk-tcard-title text-xl sm:text-2xl font-bold text-white leading-[0.95] uppercase"
            style={{
              fontFamily: 'Barlow Condensed, sans-serif',
              letterSpacing: '-0.02em',
            }}
          >
            {tournament.name}
          </h3>
        </div>
      </div>

      {/* ── Meta row + CTA ───────────────────────────────────── */}
      <div className="spk-tcard-body flex-1 flex flex-col p-4 sm:p-5 gap-4">
        {/* Meta stats — compact horizontal row with column dividers. */}
        <div className="spk-tcard-meta grid grid-cols-4 divide-x divide-black/10 text-center">
          <Stat icon={Calendar} value={formatShortDate(tournament.startDate)} label="Inicia" />
          <Stat icon={Users} value={`${teamsValue}`} label="Equipos" />
          <Stat icon={MapPin} value={`${tournament.courts.length}`} label={tournament.courts.length === 1 ? 'Cancha' : 'Canchas'} />
          <Stat icon={Trophy} value={shortFormat(tournament.format)} label="Formato" />
        </div>

        {/* Full-width CTA — arrow slides on hover, bg shifts to red */}
        <button
          type="button"
          className="relative overflow-hidden w-full inline-flex items-center justify-center gap-2 bg-spk-black text-white px-4 py-3 rounded-sm font-bold uppercase text-sm transition-colors group-hover:bg-spk-red"
          style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em' }}
          aria-label={`Ver torneo ${tournament.name}`}
        >
          <span className="relative z-10">Ver torneo</span>
          <motion.span
            className="relative z-10 inline-flex"
            initial={{ x: 0 }}
            animate={{ x: 0 }}
            whileHover={{ x: 3 }}
          >
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </motion.span>
        </button>

        {/* Full-date subline as helper text */}
        <p
          className="-mt-2 text-[10px] text-black/40 text-center uppercase tracking-[0.14em]"
          style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
        >
          {dateLabel}
        </p>
      </div>
    </motion.div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────

function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Calendar;
  value: string;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-1 py-1 min-w-0">
      <Icon className="w-3.5 h-3.5 text-black/35 mb-1" aria-hidden="true" />
      <span
        className="text-sm sm:text-base font-bold text-black/90 truncate max-w-full"
        style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '-0.01em' }}
      >
        {value}
      </span>
      <span
        className="text-[9px] text-black/40 uppercase tracking-[0.12em] truncate max-w-full"
        style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
      >
        {label}
      </span>
    </div>
  );
}

/** Short-form format labels so they fit inside the compact stat cell. */
function shortFormat(format: Tournament['format']): string {
  switch (format) {
    case 'groups':
      return 'Grupos';
    case 'knockout':
      return 'Direct.';
    case 'groups+knockout':
      return 'G+KO';
    case 'league':
      return 'Liga';
    default:
      return '—';
  }
}
