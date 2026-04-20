/**
 * VolleyballShowroom — 360° car-showroom-style gallery for SPK-CUP.
 *
 * Interactions:
 *  - Auto-rotates every ~3.4 s while idle.
 *  - Drag horizontally to scrub manually.
 *  - Arrow keys (← / →) to step one frame.
 *  - Play / Pause / Reset controls at the bottom.
 *  - Clicking any non-active card rotates to it directly.
 *
 * Images are Pexels links (free license) with eager loading on the first
 * three frames and lazy on the rest. Skeletons hold their place while a
 * frame's image is still loading.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useSpring, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from 'lucide-react';

interface Frame {
  url: string;
  label: string;
  desc: string;
  credit: string;
  angle: string;
}

const FRAMES: Frame[] = [
  {
    url: 'https://images.pexels.com/photos/6203541/pexels-photo-6203541.jpeg?auto=compress&cs=tinysrgb&w=1280',
    label: 'Remate en red',
    desc: 'Ataque desde posición 4',
    credit: 'Pavel Danilyuk',
    angle: 'Frontal',
  },
  {
    url: 'https://images.pexels.com/photos/31044958/pexels-photo-31044958.jpeg?auto=compress&cs=tinysrgb&w=1280',
    label: 'Confrontación',
    desc: 'Spike vs bloqueo doble',
    credit: 'Franco Monsalvo',
    angle: 'Lateral derecha',
  },
  {
    url: 'https://images.pexels.com/photos/6180408/pexels-photo-6180408.jpeg?auto=compress&cs=tinysrgb&w=1280',
    label: 'Bloqueo doble',
    desc: 'Muro defensivo en red',
    credit: 'Kampus Production',
    angle: '45° izquierda',
  },
  {
    url: 'https://images.pexels.com/photos/31044924/pexels-photo-31044924.jpeg?auto=compress&cs=tinysrgb&w=1280',
    label: 'Rally intenso',
    desc: 'Intercambio de golpes',
    credit: 'Franco Monsalvo',
    angle: 'Trasera',
  },
  {
    url: 'https://images.pexels.com/photos/6203522/pexels-photo-6203522.jpeg?auto=compress&cs=tinysrgb&w=1280',
    label: 'Visión de cancha',
    desc: 'Perspectiva panorámica',
    credit: 'Pavel Danilyuk',
    angle: 'Panorámica',
  },
  {
    url: 'https://images.pexels.com/photos/31044903/pexels-photo-31044903.jpeg?auto=compress&cs=tinysrgb&w=1280',
    label: 'Saque potente',
    desc: 'Servicio desde línea de fondo',
    credit: 'Franco Monsalvo',
    angle: '45° derecha',
  },
  {
    url: 'https://images.pexels.com/photos/6180395/pexels-photo-6180395.jpeg?auto=compress&cs=tinysrgb&w=1280',
    label: 'Spike explosivo',
    desc: 'Ataque ángulo bajo',
    credit: 'Kampus Production',
    angle: 'Contrapicada',
  },
  {
    url: 'https://images.pexels.com/photos/17570645/pexels-photo-17570645.jpeg?auto=compress&cs=tinysrgb&w=1280',
    label: 'Arena profesional',
    desc: 'Estadio con público',
    credit: 'Tom Fisk',
    angle: 'Elevada',
  },
];

/* ─── 3D constants ─────────────────────────────────────────────── */
const COUNT = FRAMES.length;
const ANGLE_STEP = 360 / COUNT;
const CARD_W = 320;
const CARD_H = 400;
const RADIUS = Math.round((CARD_W + 20) / (2 * Math.tan(Math.PI / COUNT)));

function getActiveIndex(rawDeg: number): number {
  const raw = Math.round(-rawDeg / ANGLE_STEP) % COUNT;
  return ((raw % COUNT) + COUNT) % COUNT;
}

export function VolleyballShowroom() {
  const [rawDeg, setRawDeg] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState<Record<number, boolean>>({});

  const dragStartX = useRef(0);
  const dragStartDeg = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const springDeg = useSpring(0, { stiffness: 58, damping: 22, mass: 1.1 });
  const activeIndex = getActiveIndex(rawDeg);

  useEffect(() => {
    springDeg.set(rawDeg);
  }, [rawDeg, springDeg]);

  const startAutoRotate = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setRawDeg((d) => d - ANGLE_STEP);
    }, 3400);
  }, []);

  const stopAutoRotate = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isPlaying && !isDragging && !hovered) {
      startAutoRotate();
    } else {
      stopAutoRotate();
    }
    return stopAutoRotate;
  }, [isPlaying, isDragging, hovered, startAutoRotate, stopAutoRotate]);

  const scheduleResume = useCallback(() => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      if (isPlaying) startAutoRotate();
    }, 4500);
  }, [isPlaying, startAutoRotate]);

  const goTo = useCallback(
    (targetIdx: number) => {
      const current = Math.round(-rawDeg / ANGLE_STEP);
      let delta = targetIdx - (((current % COUNT) + COUNT) % COUNT);
      if (delta > COUNT / 2) delta -= COUNT;
      if (delta < -COUNT / 2) delta += COUNT;
      setRawDeg(-(current + delta) * ANGLE_STEP);
    },
    [rawDeg],
  );

  const goNext = useCallback(() => {
    stopAutoRotate();
    setRawDeg((d) => d - ANGLE_STEP);
    scheduleResume();
  }, [stopAutoRotate, scheduleResume]);

  const goPrev = useCallback(() => {
    stopAutoRotate();
    setRawDeg((d) => d + ANGLE_STEP);
    scheduleResume();
  }, [stopAutoRotate, scheduleResume]);

  const handlePointerDown = (e: React.PointerEvent) => {
    containerRef.current?.setPointerCapture(e.pointerId);
    setIsDragging(true);
    stopAutoRotate();
    dragStartX.current = e.clientX;
    dragStartDeg.current = rawDeg;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartX.current;
    setRawDeg(dragStartDeg.current + dx * 0.38);
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    const snapped = Math.round(rawDeg / ANGLE_STEP) * ANGLE_STEP;
    setRawDeg(snapped);
    scheduleResume();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev]);

  function distFromActive(i: number): number {
    let d = Math.abs(i - activeIndex);
    if (d > COUNT / 2) d = COUNT - d;
    return d;
  }

  return (
    <section
      className="relative w-full overflow-hidden py-20 select-none"
      style={{ background: 'linear-gradient(160deg, #050b14 0%, #0b1622 55%, #060d18 100%)' }}
    >
      {/* Background grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
        aria-hidden="true"
      />

      {/* Ambient glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          width: '900px',
          height: '550px',
          background:
            'radial-gradient(ellipse at center, rgba(245,158,11,0.06) 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      {/* Header */}
      <div className="relative text-center mb-16 px-4">
        <div
          className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full"
          style={{
            border: '1px solid rgba(245,158,11,0.25)',
            background: 'rgba(245,158,11,0.08)',
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full bg-amber-400"
            style={{ animation: 'pulse 1.8s ease-in-out infinite' }}
          />
          <span className="text-amber-400 text-xs font-semibold tracking-[0.28em] uppercase">
            SPK-CUP · Galería 360°
          </span>
        </div>

        <h2
          className="text-5xl sm:text-6xl font-black text-white leading-none mb-4"
          style={{ letterSpacing: '-0.02em' }}
        >
          Voleibol de{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #fb923c 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            alto rendimiento
          </span>
        </h2>

        <p className="text-slate-500 text-base">
          Arrastra · usa flechas · o presiona{' '}
          <kbd
            className="px-1.5 py-0.5 text-xs rounded font-mono"
            style={{
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.4)',
            }}
          >
            ← →
          </kbd>{' '}
          para girar
        </p>
      </div>

      {/* 3D scene */}
      <div
        ref={containerRef}
        className="relative mx-auto"
        style={{
          height: `${CARD_H + 60}px`,
          perspective: '1500px',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <motion.div
          className="absolute"
          style={{
            left: '50%',
            top: '50%',
            marginTop: `-${CARD_H / 2}px`,
            width: 0,
            height: 0,
            transformStyle: 'preserve-3d',
            rotateY: springDeg,
          }}
        >
          {FRAMES.map((frame, i) => {
            const angleDeg = i * ANGLE_STEP;
            const dist = distFromActive(i);
            const isActive = dist === 0;
            const opacity = Math.max(0.18, 1 - dist * 0.28);
            const scale = isActive ? 1.0 : Math.max(0.78, 1 - dist * 0.1);

            return (
              <div
                key={i}
                className="absolute"
                style={{
                  width: `${CARD_W}px`,
                  height: `${CARD_H}px`,
                  marginLeft: `-${CARD_W / 2}px`,
                  marginTop: 0,
                  transform: `rotateY(${angleDeg}deg) translateZ(${RADIUS}px)`,
                  transformStyle: 'preserve-3d',
                  opacity,
                  transition: 'opacity 0.45s ease',
                }}
                onClick={() => !isDragging && goTo(i)}
              >
                <div
                  className="relative w-full h-full rounded-2xl overflow-hidden"
                  style={{
                    transform: `scale(${scale})`,
                    transition: 'transform 0.45s cubic-bezier(0.34,1.3,0.64,1)',
                    boxShadow: isActive
                      ? '0 0 0 2px rgba(245,158,11,0.8), 0 40px 100px rgba(0,0,0,0.8), 0 0 80px rgba(245,158,11,0.12)'
                      : '0 10px 40px rgba(0,0,0,0.6)',
                    cursor: isActive ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
                  }}
                >
                  {/* Skeleton */}
                  {!imagesLoaded[i] && (
                    <div
                      className="absolute inset-0 rounded-2xl animate-pulse"
                      style={{
                        background: 'linear-gradient(135deg,#0f1f2e,#162333)',
                      }}
                      aria-hidden="true"
                    />
                  )}

                  <img
                    src={frame.url}
                    alt={frame.label}
                    className="w-full h-full object-cover pointer-events-none"
                    draggable={false}
                    loading={i < 3 ? 'eager' : 'lazy'}
                    onLoad={() => setImagesLoaded((prev) => ({ ...prev, [i]: true }))}
                    style={{ display: imagesLoaded[i] ? 'block' : 'none' }}
                  />

                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        'linear-gradient(to top,rgba(0,0,0,0.88) 0%,rgba(0,0,0,0.18) 50%,rgba(0,0,0,0.05) 100%)',
                    }}
                    aria-hidden="true"
                  />

                  {/* Angle badge */}
                  <div className="absolute top-4 left-4">
                    <span
                      className="text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider"
                      style={{
                        background: isActive ? 'rgba(245,158,11,0.92)' : 'rgba(0,0,0,0.55)',
                        color: isActive ? '#000' : 'rgba(255,255,255,0.45)',
                        backdropFilter: 'blur(4px)',
                        transition: 'all 0.35s ease',
                      }}
                    >
                      {frame.angle}
                    </span>
                  </div>

                  {/* Frame number */}
                  <div className="absolute top-4 right-4">
                    <span
                      className="text-xs font-mono px-2 py-1 rounded-lg"
                      style={{
                        background: 'rgba(0,0,0,0.6)',
                        color: isActive ? '#f59e0b' : 'rgba(255,255,255,0.3)',
                        backdropFilter: 'blur(4px)',
                        transition: 'color 0.35s ease',
                      }}
                    >
                      {String(i + 1).padStart(2, '0')}/{String(COUNT).padStart(2, '0')}
                    </span>
                  </div>

                  {/* Active frame content */}
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        key="content"
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.32, ease: 'easeOut' }}
                        className="absolute bottom-0 left-0 right-0 p-5"
                      >
                        <p
                          className="text-xs font-semibold uppercase tracking-[0.25em] mb-1.5"
                          style={{ color: '#f59e0b' }}
                        >
                          {frame.desc}
                        </p>
                        <h3
                          className="text-white text-2xl font-black leading-tight"
                          style={{ letterSpacing: '-0.01em' }}
                        >
                          {frame.label}
                        </h3>
                        <p className="text-white/35 text-xs mt-1.5 font-medium">
                          © {frame.credit} · Pexels
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Active border */}
                  {isActive && (
                    <div
                      className="absolute inset-0 rounded-2xl pointer-events-none"
                      style={{ boxShadow: 'inset 0 0 0 1.5px rgba(245,158,11,0.6)' }}
                      aria-hidden="true"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </motion.div>

        {/* Ground line */}
        <div
          className="absolute bottom-0 left-0 right-0 pointer-events-none"
          style={{
            height: '1px',
            background:
              'linear-gradient(90deg,transparent 0%,rgba(245,158,11,0.25) 30%,rgba(245,158,11,0.45) 50%,rgba(245,158,11,0.25) 70%,transparent 100%)',
          }}
          aria-hidden="true"
        />
        <div
          className="absolute bottom-0 left-0 right-0 pointer-events-none"
          style={{
            height: '60px',
            background: 'linear-gradient(to top,rgba(5,11,20,0.7) 0%,transparent 100%)',
          }}
          aria-hidden="true"
        />
      </div>

      {/* Controls */}
      <div className="relative flex items-center justify-center gap-5 mt-10">
        <button
          onClick={goPrev}
          aria-label="Imagen anterior"
          className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105"
          style={{
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.04)',
            color: 'rgba(255,255,255,0.45)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(245,158,11,0.5)';
            e.currentTarget.style.color = '#f59e0b';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
            e.currentTarget.style.color = 'rgba(255,255,255,0.45)';
          }}
        >
          <ChevronLeft size={20} />
        </button>

        {/* Dots */}
        <div className="flex items-center gap-2">
          {FRAMES.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                goTo(i);
                stopAutoRotate();
                scheduleResume();
              }}
              aria-label={`Ir a imagen ${i + 1}`}
              className="rounded-full transition-all duration-300"
              style={{
                height: '6px',
                width: i === activeIndex ? '28px' : '6px',
                background: i === activeIndex ? '#f59e0b' : 'rgba(255,255,255,0.18)',
              }}
            />
          ))}
        </div>

        <button
          onClick={goNext}
          aria-label="Imagen siguiente"
          className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105"
          style={{
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.04)',
            color: 'rgba(255,255,255,0.45)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(245,158,11,0.5)';
            e.currentTarget.style.color = '#f59e0b';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
            e.currentTarget.style.color = 'rgba(255,255,255,0.45)';
          }}
        >
          <ChevronRight size={20} />
        </button>

        <div className="w-px h-6" style={{ background: 'rgba(255,255,255,0.1)' }} />

        <button
          onClick={() => setIsPlaying((p) => !p)}
          aria-label={isPlaying ? 'Pausar rotación' : 'Reanudar rotación'}
          className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105"
          style={{
            border: `1px solid ${
              isPlaying ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.12)'
            }`,
            background: isPlaying ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.04)',
            color: isPlaying ? '#f59e0b' : 'rgba(255,255,255,0.45)',
          }}
          title={isPlaying ? 'Pausar rotación' : 'Reanudar rotación'}
        >
          {isPlaying ? <Pause size={15} /> : <Play size={15} />}
        </button>

        <button
          onClick={() => {
            setRawDeg(0);
            setIsPlaying(true);
          }}
          aria-label="Reiniciar galería"
          className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105"
          style={{
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.04)',
            color: 'rgba(255,255,255,0.35)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'rgba(255,255,255,0.35)';
          }}
          title="Reiniciar"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      {/* Active frame info chip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="flex justify-center mt-7 px-4"
        >
          <div
            className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full"
            style={{
              border: '1px solid rgba(255,255,255,0.07)',
              background: 'rgba(255,255,255,0.03)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: '#f59e0b' }}
            />
            <span className="text-white/70 text-sm font-medium">
              {FRAMES[activeIndex].label}
            </span>
            <span className="text-white/20 text-sm">·</span>
            <span className="text-white/35 text-xs">{FRAMES[activeIndex].angle}</span>
            <span className="text-white/20 text-sm">·</span>
            <span className="text-white/30 text-xs">{FRAMES[activeIndex].credit}</span>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Progress bar */}
      <div className="flex justify-center mt-5">
        <div
          className="h-px rounded-full overflow-hidden"
          style={{ width: '200px', background: 'rgba(255,255,255,0.08)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${((activeIndex + 1) / COUNT) * 100}%`,
              background: 'linear-gradient(90deg,#f59e0b,#fb923c)',
            }}
          />
        </div>
      </div>
      <p className="text-center text-white/20 text-xs mt-2 tabular-nums">
        {activeIndex + 1} de {COUNT} frames
      </p>
    </section>
  );
}
