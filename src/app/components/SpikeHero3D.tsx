/**
 * SpikeHero3D — full-screen 3D-feel hero that simulates a volleyball serve
 * and spike using CSS perspective + transforms + motion/react.
 *
 * The scene is built from primitives (no heavy 3D lib):
 *  - A court floor rendered as a rotated plane with SVG lines.
 *  - A translucent net across the middle with diagonal mesh texture.
 *  - A stylised volleyball SVG that rotates on itself and follows a
 *    parabolic path (serve → spike loop).
 *  - A silhouette of a player jumping to spike on the right side.
 *  - Ambient spotlights + dust particles to sell the atmosphere.
 *
 * Scroll interaction: parallax on the scene + fade on the hero copy so the
 * handoff to the tournaments section feels continuous on a shared dark
 * background.
 */

import { useMemo } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { ArrowRight } from 'lucide-react';

interface SpikeHero3DProps {
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  liveCount?: number;
  tournamentCount?: number;
  teamCount?: number;
}

export function SpikeHero3D({
  onPrimaryAction,
  onSecondaryAction,
  liveCount = 0,
  tournamentCount = 0,
  teamCount = 0,
}: SpikeHero3DProps) {
  const { scrollY } = useScroll();

  // Parallax the entire scene slightly faster than the copy so it feels
  // layered without pulling the eye off the title.
  const sceneY = useTransform(scrollY, [0, 600], [0, 80]);
  const copyY = useTransform(scrollY, [0, 600], [0, 40]);
  const copyOpacity = useTransform(scrollY, [0, 400], [1, 0]);

  // Generate deterministic dust-particle positions once per mount.
  const particles = useMemo(
    () =>
      Array.from({ length: 24 }).map((_, i) => ({
        id: i,
        x: (i * 97) % 100,
        y: (i * 53) % 100,
        size: 1 + ((i * 7) % 4),
        delay: (i * 0.37) % 6,
        duration: 6 + ((i * 11) % 6),
      })),
    [],
  );

  return (
    <section
      className="relative w-full h-screen min-h-[640px] overflow-hidden"
      style={{
        // Full-bleed black stage with a warm spotlight from the top and
        // faint brand-red/blue washes from the sides so the court reads.
        background:
          'radial-gradient(ellipse 80% 55% at 50% 0%, rgba(255,255,255,0.07), transparent 70%), radial-gradient(ellipse 60% 40% at 15% 85%, rgba(227,30,36,0.12), transparent 70%), radial-gradient(ellipse 60% 40% at 85% 85%, rgba(0,48,135,0.12), transparent 70%), #050505',
      }}
    >
      {/* ── Dust / ambient particles ───────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {particles.map((p) => (
          <motion.span
            key={p.id}
            className="absolute rounded-full bg-white"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              opacity: 0,
            }}
            animate={{
              opacity: [0, 0.35, 0],
              y: [0, -20, -40],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* ── 3D stage (court + net + ball + player) ─────────────── */}
      <motion.div
        className="absolute inset-0"
        style={{
          perspective: '1400px',
          perspectiveOrigin: '50% 40%',
          y: sceneY,
        }}
        aria-hidden="true"
      >
        {/* Court floor — rotated plane + SVG lines */}
        <div
          className="absolute left-1/2 bottom-0 w-[140vw] h-[90vh] -translate-x-1/2"
          style={{
            transformStyle: 'preserve-3d',
            transform: 'rotateX(70deg) translateZ(-100px)',
            transformOrigin: 'center bottom',
          }}
        >
          {/* Floor fill */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(227,30,36,0.12) 0%, rgba(0,0,0,0) 60%), linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0) 60%)',
              maskImage:
                'radial-gradient(ellipse 70% 70% at center, black 40%, transparent 85%)',
              WebkitMaskImage:
                'radial-gradient(ellipse 70% 70% at center, black 40%, transparent 85%)',
            }}
          />
          {/* Court lines */}
          <svg
            viewBox="0 0 1200 800"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full"
          >
            <defs>
              <linearGradient id="courtLine" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="rgba(255,255,255,0.05)" />
                <stop offset="50%" stopColor="rgba(255,255,255,0.35)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
              </linearGradient>
            </defs>
            {/* Outer boundary */}
            <rect
              x="120"
              y="80"
              width="960"
              height="640"
              fill="none"
              stroke="url(#courtLine)"
              strokeWidth="3"
            />
            {/* Mid line */}
            <line
              x1="120"
              y1="400"
              x2="1080"
              y2="400"
              stroke="url(#courtLine)"
              strokeWidth="3"
            />
            {/* Attack lines (3m) */}
            <line
              x1="120"
              y1="280"
              x2="1080"
              y2="280"
              stroke="url(#courtLine)"
              strokeWidth="2"
              strokeDasharray="10 8"
              opacity="0.6"
            />
            <line
              x1="120"
              y1="520"
              x2="1080"
              y2="520"
              stroke="url(#courtLine)"
              strokeWidth="2"
              strokeDasharray="10 8"
              opacity="0.6"
            />
          </svg>
        </div>

        {/* Net — standing plane across the midcourt */}
        <div
          className="absolute left-1/2 top-1/2 w-[70vw] max-w-[900px] h-[120px] -translate-x-1/2 -translate-y-[20%]"
          style={{
            transformStyle: 'preserve-3d',
            transform: 'rotateX(3deg)',
          }}
        >
          {/* Top band */}
          <div className="absolute left-0 right-0 top-0 h-[6px] bg-white/85 shadow-[0_0_18px_rgba(255,255,255,0.35)]" />
          {/* Mesh */}
          <div
            className="absolute left-0 right-0 top-[6px] bottom-0"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, rgba(255,255,255,0.28) 0 1px, transparent 1px 14px), repeating-linear-gradient(90deg, rgba(255,255,255,0.28) 0 1px, transparent 1px 14px)',
              maskImage:
                'linear-gradient(180deg, black 0%, black 85%, transparent 100%)',
              WebkitMaskImage:
                'linear-gradient(180deg, black 0%, black 85%, transparent 100%)',
            }}
          />
          {/* Side poles */}
          <span className="absolute left-0 -top-4 w-[3px] h-[180px] bg-white/40" />
          <span className="absolute right-0 -top-4 w-[3px] h-[180px] bg-white/40" />
        </div>

        {/* Player silhouette — jumps on the right side on loop */}
        <motion.div
          className="absolute left-[62%] top-[32%] w-[180px] md:w-[220px]"
          style={{ transformStyle: 'preserve-3d' }}
          animate={{ y: [40, -10, 40] }}
          transition={{
            duration: 3,
            times: [0, 0.35, 1],
            ease: ['easeOut', 'easeIn'],
            repeat: Infinity,
          }}
        >
          <PlayerSilhouette />
        </motion.div>

        {/* Volleyball — parabolic path synced with the player jump */}
        <motion.div
          className="absolute left-1/2 top-1/2"
          animate={{
            // Serve from left, peak over the net, spike down to the right.
            x: ['-46vw', '-12vw', '6vw', '20vw'],
            y: ['18vh', '-28vh', '-6vh', '12vh'],
            rotate: [0, 540, 900, 1260],
            scale: [0.85, 1.1, 0.95, 0.7],
          }}
          transition={{
            duration: 3,
            times: [0, 0.35, 0.55, 1],
            ease: ['easeOut', 'easeIn', 'easeIn'],
            repeat: Infinity,
          }}
        >
          <Volleyball />
        </motion.div>

        {/* Spike impact flash — triggers briefly at the apex */}
        <motion.div
          className="absolute left-[55%] top-[32%] w-32 h-32 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: [0, 0.9, 0], scale: [0.6, 1.4, 1.8] }}
          transition={{
            duration: 3,
            times: [0.33, 0.4, 0.5],
            repeat: Infinity,
            ease: 'easeOut',
          }}
          style={{
            background:
              'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(227,30,36,0.6) 40%, transparent 70%)',
            filter: 'blur(6px)',
          }}
          aria-hidden="true"
        />
      </motion.div>

      {/* ── Bottom gradient fade into the next section ─────────── */}
      <div
        className="absolute inset-x-0 bottom-0 h-40 pointer-events-none"
        style={{
          background:
            'linear-gradient(to bottom, transparent, rgba(5,5,5,1))',
        }}
        aria-hidden="true"
      />

      {/* ── Copy overlay ───────────────────────────────────────── */}
      <motion.div
        className="relative z-10 h-full flex flex-col justify-center"
        style={{ y: copyY, opacity: copyOpacity }}
      >
        <div className="max-w-[1600px] mx-auto w-full px-6 md:px-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 backdrop-blur-md border border-white/15 rounded-full mb-6 text-xs"
          >
            <span className="w-1.5 h-1.5 bg-spk-red rounded-full spk-live-dot" aria-hidden="true" />
            <span
              className="font-bold tracking-[0.24em] uppercase text-white/80"
              style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
            >
              SPK-CUP · Temporada en curso
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 90 }}
            className="text-[clamp(3rem,9vw,8rem)] font-bold text-white leading-[0.88] tracking-tighter max-w-[18ch]"
            style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
          >
            CADA PUNTO.
            <br />
            <span
              style={{
                background:
                  'linear-gradient(135deg, #E31E24 0%, #FF5C61 50%, #FFFFFF 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              CADA SALTO.
            </span>
            <br />
            CADA RÉCORD.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="mt-6 text-white/60 text-base md:text-lg max-w-xl"
          >
            Sigue torneos en vivo, consulta tablas al instante y revive cada jugada — todo el voleibol del club en un solo lugar.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mt-8 flex flex-wrap gap-3"
          >
            <button
              type="button"
              onClick={onPrimaryAction}
              className="group inline-flex items-center gap-2 px-6 py-3 bg-spk-red hover:bg-spk-red-dark text-white rounded-sm font-bold uppercase transition-colors"
              style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em' }}
            >
              Ver torneos
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
            <button
              type="button"
              onClick={onSecondaryAction}
              className="relative inline-flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/15 text-white rounded-sm font-bold uppercase transition-colors"
              style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em' }}
            >
              {liveCount > 0 && (
                <span className="w-2 h-2 bg-spk-red rounded-full spk-live-dot" aria-hidden="true" />
              )}
              Partidos en vivo
              {liveCount > 0 && (
                <span
                  className="ml-1 bg-spk-red text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm tabular-nums"
                  style={{ letterSpacing: '0.08em' }}
                >
                  {liveCount}
                </span>
              )}
            </button>
          </motion.div>

          {/* Stat strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="mt-12 flex items-center gap-8 md:gap-16"
          >
            <Stat value={tournamentCount} label="Torneos" />
            <div className="w-px h-10 bg-white/10" />
            <Stat value={teamCount} label="Equipos" />
            <div className="w-px h-10 bg-white/10" />
            <Stat value={liveCount} label="En vivo" pulse={liveCount > 0} />
          </motion.div>
        </div>
      </motion.div>

      {/* Scroll hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2"
      >
        <span
          className="text-[10px] tracking-[0.24em] uppercase text-white/40"
          style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
        >
          Desliza
        </span>
        <motion.span
          animate={{ y: [0, 6, 0], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.8, repeat: Infinity }}
          className="w-[2px] h-10 bg-gradient-to-b from-white/70 to-transparent rounded-full"
        />
      </motion.div>
    </section>
  );
}

/* ───────── Helpers ─────────────────────────────────────────────── */

function Stat({
  value,
  label,
  pulse,
}: {
  value: number;
  label: string;
  pulse?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <span
        className="text-3xl md:text-4xl font-bold text-white tabular-nums leading-none"
        style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '-0.02em' }}
      >
        {value}
      </span>
      <span
        className="mt-1 text-[10px] md:text-xs uppercase tracking-[0.2em] text-white/50 flex items-center gap-1.5"
        style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
      >
        {pulse && (
          <span className="w-1.5 h-1.5 bg-spk-red rounded-full spk-live-dot" aria-hidden="true" />
        )}
        {label}
      </span>
    </div>
  );
}

/**
 * Volleyball — SVG with the classic three-panel gradient look, scaled so it
 * reads at a distance. The rotation is handled by the parent motion wrapper.
 */
function Volleyball() {
  return (
    <svg
      width="88"
      height="88"
      viewBox="-50 -50 100 100"
      className="drop-shadow-[0_10px_24px_rgba(0,0,0,0.55)]"
    >
      <defs>
        <radialGradient id="ballBody" cx="30%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#f2f2f2" />
          <stop offset="100%" stopColor="#b9b9b9" />
        </radialGradient>
        <radialGradient id="ballSheen" cx="35%" cy="30%" r="35%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.8)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
      <circle cx="0" cy="0" r="46" fill="url(#ballBody)" stroke="#6b6b6b" strokeWidth="1.2" />
      {/* Three sweeping panels */}
      <path
        d="M -42 -10 C -28 -6, -16 -24, -2 -40"
        fill="none"
        stroke="#6b6b6b"
        strokeWidth="1.6"
      />
      <path
        d="M -42 12 C -22 4, -6 8, 8 30"
        fill="none"
        stroke="#6b6b6b"
        strokeWidth="1.6"
      />
      <path
        d="M 44 -6 C 24 -4, 12 12, -4 36"
        fill="none"
        stroke="#6b6b6b"
        strokeWidth="1.6"
      />
      {/* Sheen */}
      <circle cx="-14" cy="-16" r="22" fill="url(#ballSheen)" />
    </svg>
  );
}

/**
 * PlayerSilhouette — minimalist spiker shape (arm up, mid-jump), SVG so it
 * scales without pixelation. Kept monochrome black-on-red-glow for drama.
 */
function PlayerSilhouette() {
  return (
    <svg viewBox="0 0 160 220" className="w-full h-auto">
      <defs>
        <linearGradient id="playerGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a2a2a" />
          <stop offset="70%" stopColor="#0a0a0a" />
          <stop offset="100%" stopColor="#000000" />
        </linearGradient>
        <radialGradient id="playerGlow" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="rgba(227,30,36,0.35)" />
          <stop offset="100%" stopColor="rgba(227,30,36,0)" />
        </radialGradient>
      </defs>
      <ellipse cx="80" cy="110" rx="90" ry="120" fill="url(#playerGlow)" />
      {/* Body — stylised jump shape */}
      <path
        d="
          M 78 12
          C 88 10, 96 18, 94 30
          C 92 40, 84 44, 80 44
          L 78 52
          L 90 52
          C 98 52, 104 58, 110 66
          L 128 58
          C 134 56, 140 62, 136 68
          L 118 80
          C 114 82, 110 82, 106 80
          L 98 76
          L 102 104
          C 104 122, 108 138, 98 158
          L 92 200
          C 92 208, 86 212, 80 208
          L 76 174
          L 70 208
          C 68 214, 60 214, 58 206
          L 56 158
          C 50 140, 52 122, 58 104
          L 60 74
          L 48 84
          C 44 88, 36 88, 34 82
          L 30 70
          C 28 62, 36 58, 42 62
          L 56 70
          C 60 62, 66 56, 74 54
          L 74 44
          C 68 42, 64 36, 66 28
          C 68 16, 74 12, 78 12
          Z
        "
        fill="url(#playerGrad)"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="0.8"
      />
    </svg>
  );
}
