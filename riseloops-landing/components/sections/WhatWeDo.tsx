"use client";

import { motion } from "framer-motion";
import { Lock, ShieldHalf, ClipboardCheck, Cpu } from "lucide-react";
import { SectionHeading } from "../SectionHeading";
import { RevealGroup, revealItem } from "../Reveal";

const ITEMS = [
  {
    icon: Lock,
    title: "Privacy Technology",
    copy: "Products that help organizations understand, govern, and protect personal information.",
  },
  {
    icon: ShieldHalf,
    title: "Cybersecurity",
    copy: "Security capabilities engineered directly into enterprise digital environments.",
  },
  {
    icon: ClipboardCheck,
    title: "Governance & Compliance",
    copy: "Transform complex regulatory requirements into structured and manageable digital workflows.",
  },
  {
    icon: Cpu,
    title: "Intelligent Automation",
    copy: "Use automation and intelligence to reduce repetitive operational work and improve decision-making.",
  },
];

export function WhatWeDo() {
  return (
    <section id="what-we-do" className="relative py-28 sm:py-36">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="WHAT WE DO"
          title="Technology for modern enterprise challenges."
          align="center"
        />

        <RevealGroup className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
