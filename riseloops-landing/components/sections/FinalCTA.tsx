"use client";

import { motion } from "framer-motion";
import { PrimaryButton, SecondaryButton } from "../Button";
import { Reveal } from "../Reveal";

export function FinalCTA() {
  return (
    <section id="contact" className="relative py-32 sm:py-44 overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(51,232,201,0.14),transparent_65%)]"
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
          <PrimaryButton href="#products">Explore Privora</PrimaryButton>
          <SecondaryButton href="mailto:hello@riseloops.com">
            Contact RiseLoops
          </SecondaryButton>
        </Reveal>
      </div>
    </section>
  );
}
