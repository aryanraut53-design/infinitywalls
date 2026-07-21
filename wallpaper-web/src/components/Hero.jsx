import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Zap, Image, RefreshCw, ArrowRight } from 'lucide-react';

// Smooth animated number counter
function useCounter(target, duration = 1500) {
  const [value, setValue] = useState(0);
  const raf = useRef(null);
  useEffect(() => {
    if (!target) return;
    const start = performance.now();
    const run = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * target));
      if (progress < 1) raf.current = requestAnimationFrame(run);
    };
    raf.current = requestAnimationFrame(run);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return value;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 24 },
  },
};

const Hero = ({ counts = { total: 0, live: 0, static: 0 } }) => {
  const liveCount = useCounter(counts.live);
  const staticCount = useCounter(counts.static);

  const STATS = [
    { icon: Zap,       value: `${liveCount.toLocaleString()}+`,   label: 'Live Wallpapers', color: 'text-yellow-400' },
    { icon: Image,     value: `${staticCount.toLocaleString()}+`, label: '4K Static',       color: 'text-blue-400'   },
    { icon: RefreshCw, value: 'Every 20min',                      label: 'Auto Updated',    color: 'text-green-400'  },
  ];

  return (
    <div className="relative pt-20 pb-10 min-h-[90vh] flex flex-col items-center justify-center overflow-hidden">
      {/* Floating Animated Orbs */}
      <div className="absolute inset-0 bg-[#070710] pointer-events-none">
        <motion.div
          animate={{ y: [0, -20, 0], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px]"
        />
        <motion.div
          animate={{ y: [0, 30, 0], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute bottom-1/4 right-1/4 translate-x-1/4 translate-y-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px]"
        />
      </div>

      {/* Content */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 text-center px-4 max-w-5xl mx-auto"
      >
        <motion.div variants={itemVariants}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary/30 text-primary text-xs font-semibold uppercase tracking-widest mb-10 shadow-[0_0_20px_rgba(108,99,255,0.2)]">
            <Sparkles className="w-4 h-4" />
            InfinityWalls — The Ultimate Collection | Developer: Aryan Raut
          </div>
        </motion.div>

        <motion.h1
          variants={itemVariants}
          className="text-6xl sm:text-7xl md:text-8xl font-black tracking-tighter leading-[0.9] mb-6"
        >
          <span className="gradient-text drop-shadow-2xl">Your desktop.</span>
          <br />
          <span className="text-white/20">Redefined.</span>
        </motion.h1>

        <motion.p
          variants={itemVariants}
          className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-12 leading-relaxed font-light"
        >
          Curated live animated wallpapers and 4K ultra-high-definition statics.
          Stream, preview, and download — no account needed.
        </motion.p>

        <motion.div variants={itemVariants}>
          <a
            href="#gallery"
            className="group inline-flex items-center gap-3 bg-white text-black font-semibold px-8 py-4 rounded-full transition-all duration-300 hover:shadow-[0_0_40px_8px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95"
          >
            Browse Collection
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </a>
        </motion.div>

        {/* Stats row with live counts */}
        <motion.div
          variants={itemVariants}
          className="flex items-center justify-center gap-4 md:gap-8 mt-20 flex-wrap"
        >
          {STATS.map(({ icon: Icon, value, label, color }) => (
            <div key={label} className="flex flex-col items-center gap-1 glass px-5 py-3 rounded-2xl border border-white/10">
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${color}`} />
                <span className="text-lg font-bold text-white tabular-nums">{value}</span>
              </div>
              <span className="text-xs text-white/40 font-medium">{label}</span>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#070710] to-transparent pointer-events-none" />
    </div>
  );
};

export default Hero;
