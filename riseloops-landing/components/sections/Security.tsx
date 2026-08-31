"use client";

import { motion } from "framer-motion";
import {
  ShieldCheck,
  KeyRound,
  Lock,
  ClipboardList,
  Code2,
  Building2,
  ArrowRight,
} from "lucide-react";
import { SectionHeading } from "../SectionHeading";
import { Reveal, RevealGroup, revealItem } from "../Reveal";

const ITEMS = [
  { icon: ShieldCheck, label: "Secure by Design" },
  { icon: Lock, label: "Encryption" },
  { icon: KeyRound, label: "Access Control" },
  { icon: ClipboardList, label: "Auditability" },
  { icon: Code2, label: "Secure Development" },
  { icon: Building2, label: "Enterprise Governance" },
];

export function Security() {
  return (
    <section id="security" className="relative py-28 sm:py-36">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-14 lg:grid-cols-2 lg:gap-16 items-start">
          <div>
            <SectionHeading
              eyebrow="SECURITY"
              title="Trust starts with architecture."
            />
            <Reveal delay={0.12} className="mt-6 max-w-lg">
              <p className="text-base text-mist-400 leading-relaxed">
                Security is a foundational engineering principle at
                RiseLoops, not an afterthought. Our products are designed
                around secure architecture, controlled access, auditable
                actions, data protection, and secure software development
                practices.
              </p>
            </Reveal>
            <Reveal delay={0.2} className="mt-8">
              <a
                href="#contact"
                className="group inline-flex items-center gap-2 text-sm font-semibold text-accent-300 hover:text-accent-200 transition-colors focus-ring"
              >
                Security at RiseLoops
                <ArrowRight
                  size={16}
                  className="transition-transform duration-300 group-hover:translate-x-1"
                />
              </a>
            </Reveal>
          </div>

          <RevealGroup className="grid grid-cols-2 gap-3.5">
            {ITEMS.map((item) => (
              <motion.div
                key={item.label}
                variants={revealItem}
                className="card-hover flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-4"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-accent-400/25 bg-accent-400/[0.08]">
                  <item.icon size={16} className="text-accent-400" />
                </div>
                <span className="text-sm font-medium text-mist-300">
                  {item.label}
                </span>
              </motion.div>
            ))}
          </RevealGroup>
        </div>
      </div>
    </section>
  );
}
