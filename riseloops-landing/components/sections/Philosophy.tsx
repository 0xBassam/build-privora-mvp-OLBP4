"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Reveal } from "../Reveal";

const STAGES = ["UNDERSTAND", "AUTOMATE", "PROTECT"];

export function Philosophy() {
  return (
    <section className="relative py-32 sm:py-44 overflow-hidden">
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-500/[0.08] blur-[130px]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <Reveal>
          <h2 className="font-display text-3xl sm:text-5xl md:text-6xl font-medium leading-[1.15] text-balance">
            Complex technology should feel simple.
          </h2>
        </Reveal>

        <Reveal delay={0.12} className="mt-14">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
            {STAGES.map((stage, i) => (
              <div key={stage} className="flex items-center gap-4 sm:gap-6">
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.2 }}
                  className="rounded-full border border-accent-400/30 bg-accent-400/[0.06] px-6 py-3 text-sm font-semibold tracking-[0.15em] text-accent-300"
                >
                  {stage}
                </motion.div>
                {i < STAGES.length - 1 && (
                  <motion.div
                    initial={{ opacity: 0, x: -8 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.2 + 0.15 }}
                    className="hidden sm:block"
                  >
                    <ArrowRight size={20} className="text-mist-600" />
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.3} className="mt-14">
          <p className="mx-auto max-w-2xl text-base sm:text-lg text-mist-400 leading-relaxed text-balance">
            RiseLoops transforms complex requirements into intelligent
            workflows, automates repetitive operations, and embeds security
            and governance throughout the technology lifecycle.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
