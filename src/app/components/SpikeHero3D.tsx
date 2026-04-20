/**
 * SpikeHero3D — cinematic hero backed by real volleyball action photography.
 *
 * The scene is built from layered effects on top of a rotating set of
 * Pexels / Unsplash action frames:
 *  - Full-bleed crossfade between 4 shots (spike / block / serve / dig)
 *    with a slow Ken-Burns zoom, so each image feels like motion.
 *  - Heavy dark gradient + brand-color radial wash keep the copy legible.
 *  - Parallax on the image stack (moves faster than copy on scroll) so
 *    the handoff into the dark content below feels continuous.
 *  - Dust particles, scanline shimmer and a bottom fade to black match
 *    the unified dark stage of the rest of the page.
 */

import { useEffect, useMemo, useState } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface SpikeHero3DProps {
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  liveCount?: number;
  tournamentCount?: number;
  teamCount?: number;
}

/**
 * Stage frames — mix of Pexels and Unsplash landscape shots tagged
 * volleyball + action. ImageWithFallback covers any 404 so a broken URL
 * just shows the gradient underlay instead of a white flash.
 */
const HERO_FRAMES: Array<{ src: string; alt: string; caption: string }> = [
  {
    src: 'https://images.pexels.com/photos/6203541/pexels-photo-6203541.jpeg?auto=compress&cs=tinysrgb&w=1920',
    alt: 'Jugadora rematando en la red',
    caption: 'Remate · posición 4',
  },
  {
    src: 'https://images.pexels.com/photos/6180408/pexels-photo-6180408.jpeg?auto=compress&cs=tinysrgb&w=1920',
    alt: 'Bloqueo doble en la red',
    caption: 'Bloqueo · muro en red',
  },
  {
    src: 'https://images.pexels.com/photos/31044924/pexels-photo-31044924.jpeg?auto=compress&cs=tinysrgb&w=1920',
    alt: 'Rally intenso en cancha',
    caption: 'Rally · cruce de ataques',
  },
  {
    src: 'https://images.unsplash.com/photo-1534158914592-062992fbe900?auto=format&fit=crop&w=1920&q=80',
    alt: 'Saque desde la línea de fondo',
    caption: 'Saque · línea de fondo',
  },
];

const FRAME_HOLD_MS = 5800; // how long each frame stays before crossfading
const CROSSFADE_MS = 1400;

export function SpikeHero3D({
  onPrimaryAction,
  onSecondaryAction,
  liveCount = 0,
  tournamentCount = 0,
  teamCount = 0,
}: SpikeHero3DProps) {
  const { scrollY } = useScroll();
  const [frameIndex, setFrameIndex] = useState(0);

  // Parallax: the image stack drifts faster than the copy so the scene
  // feels layered as the user scrolls into the content below.
  const sceneY = useTransform(scrollY, [0, 600], [0, 110]);
  const sceneScale = useTransform(scrollY, [0, 600], [1, 1.08]);
  const copyY = useTransform(scrollY, [0, 600], [0, 40]);
  const copyOpacity = useTransform(scrollY, [0, 420], [1, 0]);

  // Auto-advance the background image. Pauses while the tab is backgrounded
  // and honours reduced-motion preferences (freezes on the first frame).
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    let id: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      id = setInterval(() => {
        setFrameIndex((i) => (i + 1) % HERO_FRAMES.length);
      }, FRAME_HOLD_MS);
    };
    const stop = () => {
      if (id) {
        clearInterval(id);
        id = null;
      }
    };
    start();
    const onVis = () => {
      if (document.hidden) stop();
      else if (!id) start();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  // Deterministic dust-particle positions so the scene matches SSR/CSR.
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

  const activeFrame = HERO_FRAMES[frameIndex];

  return (
    <section className="relative w-full h-screen min-h-[640px] overflow-hidden bg-[#050505]">
      {/* ── Image stack (crossfade + Ken-Burns) ────────────────── */}
      <motion.div
        className="absolute inset-0"
        style={{ y: sceneY, scale: sceneScale }}
        aria-hidden="true"
      >
        <AnimatePresence>
          {HERO_FRAMES.map((frame, idx) =>
            idx === frameIndex ? (
              <motion.div
                key={frame.src}
                className="absolute inset-0"
                initial={{ opacity: 0, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1.15 }}
                exit={{ opacity: 0, scale: 1.2 }}
                transition={{
                  opacity: { duration: CROSSFADE_MS / 1000, ease: 'easeInOut' },
                  scale: {
                    duration: (FRAME_HOLD_MS + CROSSFADE_MS) / 1000,
                    ease: 'linear',
                  },
                }}
              >
                <ImageWithFallback
                  src={frame.src}
                  alt={frame.alt}
                  className="w-full h-full object-cover"
                />
              </motion.div>
            ) : null,
          )}
        </AnimatePresence>

        {/* Strong dark gradient so the copy over the top is readable on
            any image (stronger at the bottom for the stat/scroll bar). */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, rgba(5,5,5,0.55) 0%, rgba(5,5,5,0.35) 40%, rgba(5,5,5,0.85) 85%, #050505 100%)',
          }}
        />

        {/* Brand-colour wash — subtle red on the left, blue on the right,
            breathing so the background never feels static between frames. */}
        <motion.div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to right, rgba(227,30,36,0.18), transparent 40%, transparent 60%, rgba(0,48,135,0.18))',
          }}
          animate={{ opacity: [0.4, 0.65, 0.4] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Court-line scanlines — gives the feel of LED-wall broadcast
            graphics without stealing focus from the photo. */}
        <div
          className="absolute inset-0 opacity-[0.08] mix-blend-screen"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, rgba(255,255,255,0.8) 0 1px, transparent 1px 3px)',
          }}
        />
      </motion.div>

      {/* ── Dust / ambient particles ───────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none z-10" aria-hidden="true">
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
            animate={{ opacity: [0, 0.35, 0], y: [0, -20, -40] }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* ── Frame indicator dots (top-right) ───────────────────── */}
      <div className="absolute top-8 right-6 md:right-12 z-20 flex items-center gap-2">
        {HERO_FRAMES.map((_, idx) => {
          const isActive = idx === frameIndex;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => setFrameIndex(idx)}
              aria-label={`Ir a imagen ${idx + 1} de ${HERO_FRAMES.length}`}
              className="group relative h-1.5 overflow-hidden rounded-full bg-white/20 hover:bg-white/40 transition-colors"
              style={{ width: isActive ? 32 : 12 }}
            >
              {isActive && (
                <motion.span
                  key={`progress-${idx}-${frameIndex}`}
                  className="absolute inset-y-0 left-0 bg-spk-red"
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: FRAME_HOLD_MS / 1000, ease: 'linear' }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Copy overlay ───────────────────────────────────────── */}
      <motion.div
        className="relative z-20 h-full flex flex-col justify-center"
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
              className="font-bold tracking-[0.24em] uppercase text-white/85"
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
            className="mt-6 text-white/65 text-base md:text-lg max-w-xl"
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
            <div className="w-px h-10 bg-white/15" />
            <Stat value={teamCount} label="Equipos" />
            <div className="w-px h-10 bg-white/15" />
            <Stat value={liveCount} label="En vivo" pulse={liveCount > 0} />
          </motion.div>
        </div>
      </motion.div>

      {/* ── Bottom caption chip (switches with each frame) ─────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={frameIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.35 }}
          className="absolute bottom-20 md:bottom-24 left-6 md:left-12 z-20"
        >
          <span
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm bg-white/[0.05] border border-white/10 backdrop-blur-md text-[11px] tracking-[0.24em] uppercase text-white/70"
            style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
          >
            <span className="w-1 h-1 rounded-full bg-spk-red" aria-hidden="true" />
            {activeFrame.caption}
          </span>
        </motion.div>
      </AnimatePresence>

      {/* ── Scroll hint ────────────────────────────────────────── */}
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
        className="mt-1 text-[10px] md:text-xs uppercase tracking-[0.2em] text-white/55 flex items-center gap-1.5"
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
