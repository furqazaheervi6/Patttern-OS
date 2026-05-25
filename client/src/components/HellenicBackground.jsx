import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';

// ── SVG symbols ────────────────────────────────────────────────────────────────

const MahoragaWheel = ({ className = '' }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor">
    <circle cx="50" cy="50" r="38" strokeWidth="3.5" />
    <circle cx="50" cy="50" r="30" strokeWidth="1" opacity="0.6" />
    <circle cx="50" cy="50" r="12" strokeWidth="4.5" />
    <circle cx="50" cy="50" r="4" fill="currentColor" />
    {[...Array(8)].map((_, i) => (
      <g key={i} transform={`rotate(${i * 45} 50 50)`}>
        <line x1="50" y1="50" x2="50" y2="4" strokeWidth="3" strokeLinecap="round" />
        <circle cx="50" cy="4" r="3.5" fill="currentColor" />
        <path d="M 45 38 L 50 22 L 55 38 Z" fill="currentColor" opacity="0.9" />
      </g>
    ))}
  </svg>
);

const BrandOfSacrifice = ({ className = '' }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <line x1="50" y1="8" x2="50" y2="92" strokeWidth="5.5" />
    <path d="M 22 35 Q 35 12 50 45 Q 65 12 78 35" strokeWidth="4.5" />
    <path d="M 32 82 Q 40 55 50 45 Q 60 55 68 82" strokeWidth="4.5" />
    <path d="M 50 32 L 40 45 L 50 58 L 60 45 Z" strokeWidth="2" fill="currentColor" opacity="0.3" />
  </svg>
);

// ── Stable ember data — generated once, not on every render ────────────────────

const EMBERS = Array.from({ length: 35 }, (_, i) => ({
  id: i,
  size:    2 + ((i * 7 + 3) % 4),
  color:   ((i * 13) % 10) > 3 ? '#ff4500' : '#ff0000',
  left:    ((i * 17 + 5) % 100),
  xMid:    (((i * 31 + 7) % 200) - 100),
  xEnd:    (((i * 47 + 11) % 300) - 150),
  opacity: 0.2 + ((i * 19 + 3) % 80) / 100,
  scale:   0.5 + ((i * 23 + 7) % 150) / 100,
  dur:     4 + ((i * 29 + 5) % 60) / 10,
  delay:   ((i * 37 + 3) % 100) / 10,
}));

// ── Image sources ──────────────────────────────────────────────────────────────

const STATUE_IMAGES = [
  {
    src: 'https://images.unsplash.com/photo-1679432095838-4945da3b0365?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxncmVlayUyMHdhcnJpb3IlMjBzdGF0dWUlMjBzcGFydGElMjBhbmNpZW50fGVufDF8fHx8MTc3OTUxODcxOHww&ixlib=rb-4.1.0&q=80&w=1080',
    alt: 'Greek warrior statue',
    dy: [-15, 15, -15], dur: 6,
  },
  {
    src: 'https://images.unsplash.com/photo-1742467909368-bd6eb5a76e86?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHw1fHxoZXJvaWMlMjBzdGF0dWUlMjBidXJkZW4lMjBzdHJlbmd0aCUyMGFuY2llbnR8ZW58MXx8fHwxNzc5NTE4NTQ3fDA&ixlib=rb-4.1.0&q=80&w=1080',
    alt: 'Atlas bearing the world',
    dy: [-20, 20, -20], dur: 7,
  },
  {
    src: 'https://images.unsplash.com/photo-1571033690858-b336bfa1dd0f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhbmNpZW50JTIwZ3JlZWslMjBtYXJibGUlMjBzdGF0dWUlMjBtdXNjdWxhciUyMGhlcm9pY3xlbnwxfHx8fDE3Nzk1MTg1NDZ8MA&ixlib=rb-4.1.0&q=80&w=1080',
    alt: 'Heroic Greek titan',
    dy: [-15, 15, -15], dur: 6,
  },
];

// ── Main component ─────────────────────────────────────────────────────────────

export default function HellenicBackground() {
  const [version, setVersion] = useState(0);
  const wheelRotation = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      setVersion(v => {
        wheelRotation.current += 45;
        return (v + 1) % 3;
      });
    }, 12000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }} aria-hidden="true">

      {/* ── Temple ruins base — slow drift ── */}
      <motion.div
        className="absolute inset-[-10%]"
        animate={{ x: ['-2%', '2%', '-2%'], y: ['-1%', '1%', '-1%'], scale: [1, 1.05, 1] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
      >
        <img
          src="https://images.unsplash.com/photo-1508174516034-a466529afd78?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwyfHxhbmNpZW50JTIwZ3JlZWslMjB0ZW1wbGUlMjBydWlucyUyMGRhcmt8ZW58MXx8fHwxNzc5NTE4MzUwfDA&ixlib=rb-4.1.0&q=80&w=1080"
          alt=""
          className="w-full h-full object-cover"
          style={{ opacity: 0.18, filter: 'brightness(0.3) contrast(1.6) grayscale(1)' }}
          loading="lazy"
          decoding="async"
        />
      </motion.div>

      {/* ── Gradient overlays ── */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/20 to-black/90"
        animate={{ opacity: [1, 0.8, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-red-950/15 via-transparent to-black/40 mix-blend-multiply" />

      {/* ── Mahoraga Wheel — adapts 45° on version change ── */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[680px] h-[680px] text-[#e0dac3] mix-blend-overlay"
        animate={{ rotate: wheelRotation.current, scale: [1, 1.02, 1] }}
        transition={{
          rotate: { type: 'spring', stiffness: 120, damping: 12, mass: 1.5 },
          scale:  { duration: 4, repeat: Infinity, ease: 'easeInOut' },
        }}
      >
        <MahoragaWheel className="w-full h-full opacity-30 drop-shadow-[0_0_20px_rgba(224,218,195,0.3)]" />
      </motion.div>

      {/* ── Brand of Sacrifice — heartbeat pulse, top-left ── */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-80 h-80 text-red-700 mix-blend-color-dodge"
        animate={{
          opacity: [0.08, 0.3, 0.08, 0.5, 0.08],
          scale:   [1, 1.05, 1, 1.1, 1],
          filter:  ['blur(4px)', 'blur(8px)', 'blur(4px)', 'blur(12px)', 'blur(4px)'],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', times: [0, 0.4, 0.5, 0.9, 1] }}
      >
        <BrandOfSacrifice className="w-full h-full drop-shadow-[0_0_30px_rgba(255,0,0,0.7)]" />
      </motion.div>

      {/* ── Brand of Sacrifice — subtle, bottom-right ── */}
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-52 h-52 text-red-900 mix-blend-overlay"
        animate={{ rotate: [-5, 5, -5], opacity: [0.12, 0.35, 0.12] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      >
        <BrandOfSacrifice className="w-full h-full" />
      </motion.div>

      {/* ── Cycling statue silhouette ── */}
      <AnimatePresence mode="wait">
        {STATUE_IMAGES.map((img, i) =>
          version === i ? (
            <motion.div
              key={`statue-${i}`}
              className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-full"
              initial={{ opacity: 0, y: 120, scale: 0.92, filter: 'brightness(0)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'brightness(1)' }}
              exit={{ opacity: 0, scale: 1.08, filter: 'brightness(0)' }}
              transition={{ duration: 2.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <motion.div
                className="w-full h-full"
                animate={{ y: img.dy, scale: [1, 1.03, 1] }}
                transition={{ duration: img.dur, repeat: Infinity, ease: 'easeInOut' }}
              >
                <img
                  src={img.src}
                  alt={img.alt}
                  className="w-full h-full object-cover"
                  style={{ opacity: 0.55, filter: 'brightness(0.35) contrast(2) saturate(0.15)' }}
                  loading="lazy"
                  decoding="async"
                />
              </motion.div>
            </motion.div>
          ) : null
        )}
      </AnimatePresence>

      {/* ── Medieval armor — right parallax ── */}
      <motion.div
        className="absolute top-0 right-[-5%] w-[40%] h-full"
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 2, ease: 'easeOut', delay: 0.5 }}
      >
        <motion.div
          className="w-full h-full"
          animate={{ x: [-12, 12, -12], rotateY: [-4, 4, -4] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          style={{ perspective: '1000px' }}
        >
          <img
            src="https://images.unsplash.com/photo-1553986782-9f6de60b51b4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYXJrJTIwbWVkaWV2YWwlMjBhcm1vciUyMHdhcnJpb3J8ZW58MXx8fHwxNzc5NTE4MTI0fDA&ixlib=rb-4.1.0&q=80&w=1080"
            alt=""
            className="w-full h-full object-cover mix-blend-luminosity"
            style={{ opacity: 0.28, filter: 'brightness(0.3) contrast(1.8)' }}
            loading="lazy"
            decoding="async"
          />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-l from-transparent via-black/60 to-black" />
      </motion.div>

      {/* ── Film grain noise ── */}
      <div
        className="absolute inset-0 opacity-[0.18] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />

      {/* ── Red blood mist pulse ── */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(139,0,0,0.12) 60%, transparent 100%)',
          mixBlendMode: 'color-dodge',
        }}
        animate={{ scale: [1, 1.18, 1], opacity: [0.25, 0.55, 0.25] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* ── Vignette ── */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,0.55) 70%, rgba(0,0,0,0.93) 100%)' }}
      />

      {/* ── Burning embers ── */}
      <div className="absolute inset-0 overflow-hidden">
        {EMBERS.map(e => (
          <motion.div
            key={e.id}
            className="absolute rounded-full"
            style={{
              width:  `${e.size}px`,
              height: `${e.size}px`,
              background: e.color,
              left: `${e.left}%`,
              bottom: '-5%',
              boxShadow: `0 0 8px ${e.color}, 0 0 16px #ff0000`,
            }}
            animate={{
              y: ['0vh', '-120vh'],
              x: [0, e.xMid, e.xEnd],
              opacity: [0, e.opacity, 0],
              scale:   [0, e.scale, 0],
            }}
            transition={{
              duration: e.dur,
              repeat: Infinity,
              ease: 'easeOut',
              delay: e.delay,
            }}
          />
        ))}
      </div>

      {/* ── Primary crimson accent glow (replaces old static gradient) ── */}
      <motion.div
        className="absolute"
        style={{
          bottom: '15%', right: '20%',
          width: '600px', height: '600px',
          background: 'radial-gradient(circle, rgba(139,0,0,0.2) 0%, transparent 65%)',
          filter: 'blur(40px)',
        }}
        animate={{ opacity: [0.7, 1, 0.7], scale: [1, 1.08, 1] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute"
        style={{
          top: '10%', left: '15%',
          width: '400px', height: '400px',
          background: 'radial-gradient(circle, rgba(139,0,0,0.1) 0%, transparent 65%)',
          filter: 'blur(60px)',
        }}
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />

    </div>
  );
}
