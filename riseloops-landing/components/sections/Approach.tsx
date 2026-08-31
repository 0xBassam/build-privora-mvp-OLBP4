"use client";

import { motion } from "framer-motion";
import { SectionHeading } from "../SectionHeading";

const STEPS = [
  "Users",
  "RiseLoops Product Experience",
  "Intelligent Automation",
  "Security & Governance",
  "Enterprise Integrations",
  "Secure Infrastructure",
];

export function Approach() {
  return (
    <section id="approach" className="relative py-28 sm:py-36">
      <div className="mx-auto max-w-3xl px-6">
        <SectionHeading
          eyebrow="OUR APPROACH"
          title="Engineered for enterprise."
          align="center"
        />

        <div className="relative mt-16 flex flex-col items-center">
          {/* vertical line */}
          <div className="absolute left-1/2 top-6 bottom-6 w-px -translate-x-1/2 bg-white/10">
            <motion.div
              className="absolute inset-x-0 top-0 w-px bg-gradient-to-b from-accent-400 to-accent-400/0"
              initial={{ height: 0 }}
              whileInView={{ height: "100%" }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 1.6, ease: "easeInOut" }}
            />
          </div>

          <div className="relative flex w-full flex-col items-center gap-3">
            {STEPS.map((step, i) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ duration: 0.5, delay: i * 0.18 }}
                className={`relative z-10 flex items-center gap-3 rounded-2xl border px-6 py-4 ${
                  i === 0 || i === STEPS.length - 1
                    ? "border-white/10 bg-ink-900"
                    : "border-accent-400/25 bg-accent-400/[0.05]"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    i === 0 || i === STEPS.length - 1
                      ? "bg-white/30"
                      : "bg-accent-400 shadow-[0_0_10px_2px_rgba(96,191,172,0.5)]"
                  }`}
                />
                <span className="text-sm sm:text-base font-medium text-white">
                  {step}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
