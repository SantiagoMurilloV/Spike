/**
 * SpikeHero3D — cinematic layered hero built with real volleyball photography
 * (Pexels / Unsplash, free license). This is NOT a carousel: multiple photos
 * are composed on top of each other in the same instant, each with its own
 * independent motion loop, forming a single scene that feels alive.
 *
 * Layers (back → front):
 *  - Arena wide shot, slow Ken-Burns zoom + drift.
 *  - Spike action shot on top with mix-blend-screen, breathing opacity,
 *    slight counter-drift so both photos meld into one image.
 *  - Block/detail photo pinned to the bottom-right corner, soft-masked and
 *    slowly scaling — reads like a broadcast cutaway layer.
 *  - Brand-color chromatic wash (red ↔ blue) and a moving scan-bar for the
 *    broadcast feel.
 *  - Dust particles + subtle grain + corner tick marks for framing.
 *
 * Scroll interaction: the whole stack parallaxes up while the copy fades,
 * so the handoff to the shared dark content below is seamless.
 */

import { useMemo } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface SpikeHero3DProps {
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  liveCount?: number;
  tournamentCount?: number;
  teamCount?: number;
}

/** Open-license Pexels / Unsplash stills — landscape, 1920w. */
const LAYERS = {
  arena:
    'https://images.pexels.com/photos/17570645/pexels-photo-17570645.jpeg?auto=compress&cs=tinysrgb&w=1920',
  spike:
    'https://images.pexels.com/photos/6203541/pexels-photo-6203541.jpeg?auto=compress&cs=tinysrgb&w=1920',
  block:
    'https://images.pexels.com/photos/6180408/pexels-photo-6180408.jpeg?auto=compress&cs=tinysrgb&w=1920',
  serve:
    'https://images.unsplash.com/photo-1534158914592-062992fbe900?auto=format&fit=crop&w=1920&q=80',
};

export function SpikeHero3D({
  onPrimaryAction,
  onSecondaryAction,
  liveCount = 0,
  tournamentCount = 0,
  teamCount = 0,
}: SpikeHero3DProps) {
  const { scrollY } = useScroll();
  const sceneY = useTransform(scrollY, [0, 600], [0, 110]);
  const sceneScale = useTransform(scrollY, [0, 600], [1, 1.06]);
  const copyY = useTransform(scrollY, [0, 600], [0, 40]);
  const copyOpacity = useTransform(scrollY, [0, 420], [1, 0]);

  // Deterministic dust-particle positions (SSR-safe).
  const particles = useMemo(
    () =>
      Array.from({ length: 22 }).map((_, i) => ({
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
    <section className="relative w-full h-screen min-h-[640px] overflow-hidden bg-[#050505]">
      {/* ─── Photographic stack (parallaxes as one group) ─────────── */}
      <motion.div
        className="absolute inset-0"
        style={{ y: sceneY, scale: sceneScale }}
        aria-hidden="true"
      >
        {/* L1 — arena wide shot, slow Ken-Burns zoom + pan. */}
        <motion.div
          className="absolute inset-0"
          initial={{ scale: 1.08, x: 0 }}
          animate={{ scale: [1.08, 1.2, 1.08], x: [0, -22, 0] }}
          transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ImageWithFallback
            src={LAYERS.arena}
            alt="Arena de voleibol"
            className="w-full h-full object-cover opacity-55"
          />
        </motion.div>

        {/* L2 — action spike photo blended on top. Breathes opacity +
            counter-drifts so it fuses with the backdrop instead of reading
            as a separate image. */}
        <motion.div
          className="absolute inset-0 mix-blend-screen"
          animate={{
            opacity: [0.55, 0.8, 0.55],
            x: [0, 26, 0],
            y: [0, -16, 0],
            scale: [1.02, 1.08, 1.02],
          }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ImageWithFallback
            src={LAYERS.spike}
            alt="Remate en el punto"
            className="w-full h-full object-cover"
          />
        </motion.div>

        {/* L3 — broadcast cutaway pinned to bottom-right, soft-masked so it
            feathers into the rest of the composition. Hidden on mobile
            to keep the copy readable on tall phones. */}
        <motion.div
          className="absolute bottom-0 right-0 w-[60%] h-[70%] hidden md:block"
          style={{
            maskImage:
              'linear-gradient(to top left, black 30%, transparent 85%)',
            WebkitMaskImage:
              'linear-gradient(to top left, black 30%, transparent 85%)',
          }}
          animate={{ opacity: [0.45, 0.75, 0.45], scale: [1, 1.05, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ImageWithFallback
            src={LAYERS.block}
            alt="Bloqueo en la red"
            className="w-full h-full object-cover"
          />
        </motion.div>

        {/* L4 — subtle left-edge serve layer. Low opacity, slow drift,
            makes the scene feel like it has depth on the left. */}
        <motion.div
          className="absolute top-0 left-0 w-[48%] h-[68%] hidden lg:block"
          style={{
            maskImage:
              'linear-gradient(to bottom right, black 20%, transparent 80%)',
            WebkitMaskImage:
              'linear-gradient(to bottom right, black 20%, transparent 80%)',
          }}
          animate={{ opacity: [0.28, 0.5, 0.28], x: [-6, 6, -6] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ImageWithFallback
            src={LAYERS.serve}
            alt="Saque desde el fondo"
            className="w-full h-full object-cover"
          />
        </motion.div>

        {/* Legibility gradient — darkens the composition enough for the
            headline + CTAs to read on any mix of the layers above. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(5,5,5,0.55) 0%, rgba(5,5,5,0.38) 45%, rgba(5,5,5,0.9) 90%, #050505 100%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 85% 65% at 50% 45%, transparent, rgba(0,0,0,0.65))',
          }}
        />

        {/* Chromatic brand wash — breathes so the scene never sits still. */}
        <motion.div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(115deg, rgba(227,30,36,0.22) 0%, transparent 40%, transparent 60%, rgba(0,48,135,0.22) 100%)',
          }}
          animate={{ opacity: [0.55, 0.9, 0.55] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Broadcast scan-bar — one thin horizontal gradient bar sweeping
            down once every seven seconds. */}
        <motion.span
          className="absolute inset-x-0 h-[2px] pointer-events-none"
          style={{
            background:
              'linear-gradient(to right, transparent, rgba(227,30,36,0.7), rgba(255,255,255,0.4), rgba(0,48,135,0.7), transparent)',
            filter: 'blur(0.5px)',
          }}
          animate={{ top: ['-5%', '105%'] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}
        />

        {/* Fine-grain noise */}
        <div
          className="absolute inset-0 opacity-[0.12] mix-blend-overlay pointer-events-none"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' /%3E%3C/svg%3E\")",
          }}
        />

        {/* Dust motes — rise softly to sell the "live gym" atmosphere. */}
        <div className="absolute inset-0 pointer-events-none">
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

        {/* Broadcast corner ticks — frame the composition. */}
        <CornerTicks />

        {/* Stylised volleyball on a looping parabolic path — the only
            "scripted" motion element; reads as the ball crossing the net in
            the middle of the scene. Kept as SVG because animating a real
            JPG on a precise parabola while also rotating it would look
            janky at 60fps. */}
        <motion.div
          className="absolute left-1/2 top-1/2 pointer-events-none"
          animate={{
            x: ['-46vw', '-12vw', '8vw', '22vw'],
            y: ['18vh', '-28vh', '-6vh', '14vh'],
            rotate: [0, 540, 900, 1260],
            scale: [0.9, 1.15, 1, 0.75],
          }}
          transition={{
            duration: 3.2,
            times: [0, 0.35, 0.55, 1],
            ease: ['easeOut', 'easeIn', 'easeIn'],
            repeat: Infinity,
          }}
        >
          <Volleyball />
        </motion.div>

        {/* Spike-impact flash at the apex of the ball arc. */}
        <motion.div
          className="absolute left-[55%] top-[33%] w-36 h-36 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          animate={{ opacity: [0, 0.85, 0], scale: [0.6, 1.4, 1.8] }}
          transition={{
            duration: 3.2,
            times: [0.32, 0.4, 0.5],
            repeat: Infinity,
            ease: 'easeOut',
          }}
          style={{
            background:
              'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(227,30,36,0.55) 40%, transparent 70%)',
            filter: 'blur(6px)',
          }}
        />
      </motion.div>

      {/* Bottom fade into the shared black stage. */}
      <div
        className="absolute inset-x-0 bottom-0 h-48 pointer-events-none z-10"
        style={{
          background: 'linear-gradient(to bottom, transparent, #050505 95%)',
        }}
        aria-hidden="true"
      />

      {/* ─── Copy overlay ────────────────────────────────────────── */}
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
            className="mt-6 text-white/70 text-base md:text-lg max-w-xl"
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
              className="group inline-flex items-center gap-2 px-6 py-3 bg-spk-red hover:bg-spk-red-dark text-white rounded-sm font-bold uppercase transition-colors shadow-[0_10px_30px_rgba(227,30,36,0.4)]"
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
          aria-hidden="true"
        />
      </motion.div>

      {/* Photo credits — tiny corner strip so attribution is preserved. */}
      <span
        className="absolute bottom-3 right-4 z-20 text-[9px] tracking-[0.18em] uppercase text-white/25"
        style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
      >
        Fotos · Pexels · Unsplash
      </span>
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

/** Minimal broadcast corner ticks so the composition reads as framed. */
function CornerTicks() {
  const common =
    'absolute w-8 h-8 border-white/30 pointer-events-none hidden md:block';
  return (
    <>
      <span className={`${common} top-6 left-6 border-l border-t`} aria-hidden="true" />
      <span className={`${common} top-6 right-6 border-r border-t`} aria-hidden="true" />
      <span className={`${common} bottom-6 left-6 border-l border-b`} aria-hidden="true" />
      <span className={`${common} bottom-6 right-6 border-r border-b`} aria-hidden="true" />
    </>
  );
}

/**
 * Volleyball — SVG with three-panel gradient look, used only for the
 * parabolic motion element so we can keep it crisp at 60fps while rotating.
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
      <path d="M -42 -10 C -28 -6, -16 -24, -2 -40" fill="none" stroke="#6b6b6b" strokeWidth="1.6" />
      <path d="M -42 12 C -22 4, -6 8, 8 30" fill="none" stroke="#6b6b6b" strokeWidth="1.6" />
      <path d="M 44 -6 C 24 -4, 12 12, -4 36" fill="none" stroke="#6b6b6b" strokeWidth="1.6" />
      <circle cx="-14" cy="-16" r="22" fill="url(#ballSheen)" />
    </svg>
  );
}
