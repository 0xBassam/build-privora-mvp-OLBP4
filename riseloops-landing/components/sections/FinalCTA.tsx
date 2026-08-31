"use client";

import { motion } from "framer-motion";
import { PrimaryButton, SecondaryButton } from "../Button";
import { Reveal } from "../Reveal";

export function FinalCTA() {
  return (
    <section id="contact" className="relative py-32 sm:py-44 overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(96,191,172,0.14),transparent_65%)]"
        aria-hidden
      />
      <motion.div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-500/20 blur-[110px]"
        animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      />
      <div className="absolute inset-0 grid-bg opacity-60" aria-hidden />

      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <Reveal>
          <span className="text-xs font-semibold tracking-[0.3em] text-accent-400">
            RISELOOPS
          </span>
        </Reveal>
        <Reveal delay={0.1}>
          <h2 className="mt-5 font-display text-3xl sm:text-5xl md:text-6xl font-medium leading-[1.1] text-balance">
            Technology built for what comes next.
          </h2>
        </Reveal>
        <Reveal delay={0.2}>
          <p className="mt-6 text-base sm:text-lg text-mist-400 text-balance">
            Discover the first generation of RiseLoops products.
          </p>
        </Reveal>
        <Reveal delay={0.3} className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <PrimaryButton href="https://privorasa.com" external>
            Explore Privora
          </PrimaryButton>
          <SecondaryButton href="mailto:info@riseloops.sa">
            Contact RiseLoops
          </SecondaryButton>
        </Reveal>
        <Reveal delay={0.4} className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-mist-400">
          <a
            href="mailto:info@riseloops.sa"
            className="hover:text-accent-300 transition-colors focus-ring"
          >
            info@riseloops.sa
          </a>
          <a
            href="tel:+966567008085"
            className="hover:text-accent-300 transition-colors focus-ring"
          >
            +966 56 700 8085
          </a>
        </Reveal>
      </div>
    </section>
  );
}
