"use client";

import { motion } from "framer-motion";
import {
  ShieldCheck,
  Layers,
  Building,
  Zap,
  Globe2,
  Sparkles,
} from "lucide-react";
import { SectionHeading } from "../SectionHeading";
import { RevealGroup, revealItem } from "../Reveal";

const ITEMS = [
  {
    icon: ShieldCheck,
    title: "Security by Design",
    copy: "Security is embedded into our products from architecture through deployment.",
  },
  {
    icon: Layers,
    title: "Product First",
    copy: "We turn difficult organizational problems into scalable software products.",
  },
  {
    icon: Building,
    title: "Enterprise Architecture",
    copy: "Designed for performance, reliability, integration, and complex organizational environments.",
  },
  {
    icon: Zap,
    title: "Intelligent Automation",
    copy: "Automation helps teams operate faster without sacrificing governance or control.",
  },
  {
    icon: Globe2,
    title: "Local Understanding",
    copy: "Built with an understanding of Saudi organizations, regulations, and digital transformation priorities.",
  },
  {
    icon: Sparkles,
    title: "Simple Experiences",
    copy: "Sophisticated technology should still feel simple to the people using it.",
  },
];

export function WhyRiseLoops() {
  return (
    <section className="relative py-28 sm:py-36 bg-ink-950/40">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="WHY RISELOOPS"
          title="Built differently."
          align="center"
        />

        <RevealGroup className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map((item) => (
            <motion.div
              key={item.title}
              variants={revealItem}
              className="card-hover rounded-2xl border border-white/10 bg-white/[0.02] p-6"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-accent-400/25 bg-accent-400/[0.08]">
                <item.icon size={19} className="text-accent-400" />
              </div>
              <h3 className="mt-5 font-display text-lg font-medium">
                {item.title}
              </h3>
              <p className="mt-2.5 text-sm text-mist-400 leading-relaxed">
                {item.copy}
              </p>
            </motion.div>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
