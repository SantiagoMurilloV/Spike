import { Tournament } from '../types';
import { Calendar, Users, MapPin, Trophy, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { LiveBadge } from './LiveBadge';
import { formatShortDate } from '../lib/format';

interface TournamentCardProps {
  tournament: Tournament;
  onClick?: () => void;
}

const FORMAT_LABELS: Record<Tournament['format'], string> = {
  groups: 'Fase de grupos',
  knockout: 'Eliminación directa',
  'groups+knockout': 'Grupos + Eliminación',
  league: 'Liga',
};

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

  return (
    <motion.div
      className="group relative bg-white overflow-hidden cursor-pointer"
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
        y: -4,
        boxShadow: 'var(--shadow-elevated)' as unknown as string,
      }}
      transition={{ duration: 0.2 }}
    >
      {/* ── Image / banner area ──────────────────────────────── */}
      <div
        className="spk-tcard-image relative h-44 sm:h-52 overflow-hidden"
        style={
          tournament.coverImage
            ? {
                background: `linear-gradient(to top, rgba(0,0,0,0.75), rgba(0,0,0,0.25)), url(${tournament.coverImage}) center/cover`,
              }
            : {
                background: 'linear-gradient(135deg, #003087 0%, #0F0F14 100%)',
              }
        }
      >
        {!tournament.coverImage && (
          <div
            className="absolute inset-0 opacity-[0.18]"
            aria-hidden="true"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, #E31E24 0 12px, transparent 12px 24px)',
            }}
          />
        )}

        {/* Status badges */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          {isLive && <LiveBadge size="sm" />}
          {isUpcoming && (
            <span
              className="inline-block px-2.5 py-1 bg-black text-white rounded-sm text-[11px] font-bold uppercase"
              style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em' }}
            >
              PRÓXIMO
            </span>
          )}
          {isCompleted && (
            <span
              className="inline-block px-2.5 py-1 bg-black/60 text-white rounded-sm text-[11px] font-bold uppercase"
              style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em' }}
            >
              FINALIZADO
            </span>
          )}
          {tournament.sport && (
            <span
              className="inline-block px-2.5 py-1 bg-white/10 backdrop-blur text-white border border-white/20 rounded-sm text-[11px] font-bold uppercase"
              style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em' }}
            >
              {tournament.sport}
            </span>
          )}
        </div>

        {/* Title over image */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
          <h3
            className="spk-tcard-title text-2xl sm:text-3xl font-bold text-white leading-tight uppercase"
            style={{
              fontFamily: 'Barlow Condensed, sans-serif',
              letterSpacing: '-0.02em',
            }}
          >
            {tournament.name}
          </h3>
          {tournament.club && (
            <p className="text-xs text-white/70 mt-1 truncate" style={{ fontFamily: 'Inter, sans-serif' }}>
              {tournament.club}
            </p>
          )}
        </div>
      </div>

      {/* ── Meta + CTA ───────────────────────────────────────── */}
      <div className="spk-tcard-body p-4 sm:p-5">
        <div className="spk-tcard-meta grid grid-cols-2 gap-2.5 text-xs text-black/70 mb-4">
          <div className="inline-flex items-center gap-1.5 min-w-0">
            <Calendar className="w-3.5 h-3.5 text-black/40 flex-shrink-0" aria-hidden="true" />
            <span className="truncate">{dateLabel}</span>
          </div>
          <div className="inline-flex items-center gap-1.5 min-w-0">
            <Users className="w-3.5 h-3.5 text-black/40 flex-shrink-0" aria-hidden="true" />
            <span className="truncate">{tournament.teamsCount} equipos</span>
          </div>
          <div className="inline-flex items-center gap-1.5 min-w-0">
            <MapPin className="w-3.5 h-3.5 text-black/40 flex-shrink-0" aria-hidden="true" />
            <span className="truncate">{courtsLabel}</span>
          </div>
          <div className="inline-flex items-center gap-1.5 min-w-0">
            <Trophy className="w-3.5 h-3.5 text-black/40 flex-shrink-0" aria-hidden="true" />
            <span className="truncate">{FORMAT_LABELS[tournament.format]}</span>
          </div>
        </div>

        {/* Full-width CTA — switches to red on hover */}
        <button
          type="button"
          className="w-full inline-flex items-center justify-center gap-2 bg-black text-white px-4 py-2.5 rounded-sm font-bold uppercase text-sm transition-colors group-hover:bg-[#E31E24]"
          style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.05em' }}
          aria-label={`Ver torneo ${tournament.name}`}
        >
          Ver torneo
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {/* Bottom red accent — reveals on hover */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#E31E24]"
        style={{ originX: 0 }}
        initial={{ scaleX: 0 }}
        whileHover={{ scaleX: 1 }}
        animate={isLive ? { scaleX: 1 } : undefined}
        transition={{ duration: 0.3 }}
        aria-hidden="true"
      />
    </motion.div>
  );
}
