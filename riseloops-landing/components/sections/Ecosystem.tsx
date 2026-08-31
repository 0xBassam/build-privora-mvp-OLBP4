"use client";

import { motion } from "framer-motion";
import { SectionHeading } from "../SectionHeading";
import { Reveal } from "../Reveal";

const NODES = [
  { label: "Privora", sub: "Privacy & Data Protection", active: true },
  { label: "Coming Soon", sub: "", active: false },
  { label: "Coming Soon", sub: "", active: false },
  { label: "Coming Soon", sub: "", active: false },
];

export function Ecosystem() {
  return (
    <section className="relative py-28 sm:py-36 overflow-hidden">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="ECOSYSTEM"
          title="One company. A growing technology ecosystem."
          align="center"
        />

        <Reveal delay={0.15} className="mt-16">
          <div className="relative flex flex-col items-center">
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-accent-400/30 bg-accent-400/[0.06] px-8 py-5">
              <span className="h-2.5 w-2.5 rounded-full bg-accent-400 shadow-[0_0_14px_3px_rgba(96,191,172,0.55)]" />
              <span className="font-display text-lg font-semibold">
                RiseLoops
              </span>
            </div>

            <svg
              className="h-16 w-full max-w-3xl"
              viewBox="0 0 700 64"
              aria-hidden
              preserveAspectRatio="none"
            >
              {[85, 295, 405, 615].map((x, i) => (
                <motion.path
                  key={x}
                  d={`M350 0 C350 24, ${x} 20, ${x} 64`}
                  fill="none"
                  stroke="rgba(96,191,172,0.35)"
                  strokeWidth={1.2}
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: 0.2 + i * 0.12 }}
                />
              ))}
            </svg>

            <div className="grid w-full max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              {NODES.map((node) => (
                <div
                  key={node.label + node.sub}
                  className={`flex flex-col items-center gap-1.5 rounded-2xl border px-3 py-5 text-center ${
                    node.active
                      ? "border-accent-400/30 bg-accent-400/[0.06]"
                      : "border-dashed border-white/10 bg-white/[0.02]"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      node.active
                        ? "bg-accent-400 shadow-[0_0_10px_2px_rgba(96,191,172,0.55)]"
                        : "bg-white/20"
                    }`}
                  />
                  <span
                    className={`text-sm font-medium ${
                      node.active ? "text-white" : "text-mist-600"
                    }`}
                  >
                    {node.label}
                  </span>
                  {node.sub ? (
                    <span className="text-[11px] text-mist-500">
                      {node.sub}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
