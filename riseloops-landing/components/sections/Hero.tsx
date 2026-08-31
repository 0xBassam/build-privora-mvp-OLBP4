"use client";

import { motion } from "framer-motion";
import { PrimaryButton, SecondaryButton } from "../Button";

const ORBIT_NODES = [
  { label: "Privacy", angle: -90 },
  { label: "Security", angle: -18 },
  { label: "Governance", angle: 54 },
  { label: "Data", angle: 126 },
  { label: "Automation", angle: 198 },
];

function OrbitVisual() {
  const radius = 150;
  return (
    <div className="relative mx-auto flex h-[340px] w-[340px] sm:h-[420px] sm:w-[420px] items-center justify-center">
      {/* rotating rings */}
      <div className="absolute inset-0 rounded-full border border-white/[0.06]" />
      <div className="absolute inset-8 rounded-full border border-white/[0.06]" />
      <motion.div
        className="absolute inset-0 rounded-full border border-dashed border-accent-400/20 animate-spin-slow"
        aria-hidden
      />
      <motion.div
        className="absolute inset-8 rounded-full border border-dashed border-accent-400/10 animate-spin-slow-reverse"
        aria-hidden
      />

      {/* connecting lines */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="-210 -210 420 420"
        aria-hidden
      >
        {ORBIT_NODES.map((node, i) => {
          const rad = (node.angle * Math.PI) / 180;
          const x = radius * Math.cos(rad);
          const y = radius * Math.sin(rad);
          return (
            <motion.line
              key={node.label}
              x1={0}
              y1={0}
              x2={x}
              y2={y}
              stroke="url(#lineGradient)"
              strokeWidth={1.2}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.4, delay: 0.3 + i * 0.15, ease: "easeOut" }}
            />
          );
        })}
        <defs>
          <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#60bfac" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#60bfac" stopOpacity="0.05" />
          </linearGradient>
        </defs>
      </svg>

      {/* orbit nodes */}
      {ORBIT_NODES.map((node, i) => {
        const rad = (node.angle * Math.PI) / 180;
        const x = radius * Math.cos(rad);
        const y = radius * Math.sin(rad);
        return (
          <motion.div
            key={node.label}
            className="absolute flex flex-col items-center gap-1.5"
            style={{ left: "50%", top: "50%" }}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{
              opacity: 1,
              scale: 1,
              x: [x, x + 4, x],
              y: [y, y - 4, y],
            }}
            transition={{
              opacity: { duration: 0.6, delay: 0.6 + i * 0.15 },
              scale: { duration: 0.6, delay: 0.6 + i * 0.15 },
              x: { duration: 5 + i, repeat: Infinity, ease: "easeInOut" },
              y: { duration: 5 + i, repeat: Infinity, ease: "easeInOut" },
            }}
          >
            <div className="-translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-accent-400 shadow-[0_0_14px_3px_rgba(96,191,172,0.55)]" />
              <span className="whitespace-nowrap rounded-full border border-white/10 bg-ink-900/70 px-2.5 py-1 text-[11px] font-medium text-mist-300 backdrop-blur-sm">
                {node.label}
              </span>
            </div>
          </motion.div>
        );
      })}

      {/* core */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-full glass-panel"
      >
        <motion.span
          className="absolute inset-0 rounded-full bg-accent-400/20 blur-xl animate-pulse-slow"
          aria-hidden
        />
        <span className="relative font-display text-xs sm:text-sm font-semibold tracking-tight text-white text-center leading-tight">
          RiseLoops
          <br />
          Core
        </span>
      </motion.div>
    </div>
  );
}

export function Hero() {
  return (
    <section
      id="top"
      className="relative flex min-h-screen items-center overflow-hidden pt-32 pb-20"
    >
      <div className="absolute inset-0 grid-bg" aria-hidden />
      <div className="absolute inset-0 bg-radial-fade" aria-hidden />
      <div className="absolute -top-40 left-1/2 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-accent-500/10 blur-[120px]" aria-hidden />

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 px-6 lg:grid-cols-2 lg:gap-8">
        <div>
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-block text-xs font-semibold tracking-[0.3em] text-accent-400"
          >
            RISELOOPS
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="mt-5 font-display text-4xl sm:text-5xl lg:text-6xl font-medium leading-[1.08] text-balance"
          >
            Technology built around{" "}
            <span className="shimmer-text">complex problems.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-6 max-w-xl text-base sm:text-lg text-mist-400 leading-relaxed text-balance"
          >
            RiseLoops builds intelligent, secure enterprise platforms that
            transform complex privacy, security, governance, and digital
            operations into simple digital experiences.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-9 flex flex-wrap items-center gap-4"
          >
            <PrimaryButton href="#products">Explore Our Products</PrimaryButton>
            <SecondaryButton href="#who-we-are">Discover RiseLoops</SecondaryButton>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-8 text-sm text-mist-600"
          >
            Built in Saudi Arabia. Designed for enterprise.
          </motion.p>
        </div>

        <div className="relative">
          <OrbitVisual />
        </div>
      </div>
    </section>
  );
}
