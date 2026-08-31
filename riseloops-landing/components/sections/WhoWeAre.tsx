"use client";

import { ShieldCheck, Building2, MapPinned } from "lucide-react";
import { SectionHeading } from "../SectionHeading";
import { Reveal, RevealGroup, revealItem } from "../Reveal";
import { motion } from "framer-motion";

const CHIPS = [
  { label: "Secure by Design", icon: ShieldCheck },
  { label: "Enterprise Ready", icon: Building2 },
  { label: "Built for Saudi Arabia", icon: MapPinned },
];

export function WhoWeAre() {
  return (
    <section id="who-we-are" className="relative py-28 sm:py-36">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="WHO WE ARE"
          title="Building the next generation of enterprise technology."
        />

        <div className="mt-10 grid max-w-3xl gap-5">
          <Reveal delay={0.1}>
            <p className="text-base sm:text-lg text-mist-400 leading-relaxed text-balance">
              RiseLoops is a Saudi technology company focused on building
              secure, intelligent software platforms for organizations
              operating in complex digital environments.
            </p>
          </Reveal>
          <Reveal delay={0.18}>
            <p className="text-base sm:text-lg text-mist-400 leading-relaxed text-balance">
              We combine software engineering, security, automation,
              governance, and user experience to turn difficult enterprise
              problems into products people can actually use.
            </p>
          </Reveal>
        </div>

        <RevealGroup className="mt-10 flex flex-wrap gap-3">
          {CHIPS.map((chip) => (
            <motion.div
              key={chip.label}
              variants={revealItem}
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-mist-300"
            >
              <chip.icon size={15} className="text-accent-400" />
              {chip.label}
            </motion.div>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
