"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { SectionHeading } from "../SectionHeading";
import { Reveal, RevealGroup, revealItem } from "../Reveal";
import { ProductDashboardMock } from "./ProductDashboardMock";

const CAPABILITIES = [
  "Consent Management",
  "Data Subject Requests",
  "Privacy Notices",
  "Breach Management",
  "Data Retention",
  "Purpose Registry",
  "Governance",
  "Audit Trails",
  "Regulatory Compliance",
];

export function Products() {
  return (
    <section id="products" className="relative py-28 sm:py-36">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="OUR PRODUCTS"
          title="Products built for real-world complexity."
          description="We create focused platforms that simplify the most challenging areas of modern enterprise technology."
        />

        <Reveal delay={0.15} className="mt-16">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-6 sm:p-10 lg:p-14">
            <div
              className="pointer-events-none absolute -top-32 right-0 h-72 w-72 rounded-full bg-accent-500/10 blur-[100px]"
              aria-hidden
            />

            <div className="relative grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
              <div>
                <span className="text-xs font-semibold tracking-[0.25em] text-accent-400">
                  PRIVACY &amp; DATA PROTECTION
                </span>
                <div className="mt-4 flex items-baseline gap-3 flex-wrap">
                  <h3 className="font-display text-4xl sm:text-5xl font-medium">
                    Privora
                  </h3>
                  <span className="rounded-full border border-white/15 px-3 py-1 text-[11px] text-mist-400">
                    A RiseLoops Product
                  </span>
                </div>
                <p className="mt-5 text-xl sm:text-2xl font-display text-white/90">
                  Privacy operations, unified.
                </p>
                <p className="mt-4 text-base text-mist-400 leading-relaxed max-w-lg">
                  Privora gives organizations one intelligent platform to
                  manage privacy operations, data protection, consent,
                  regulatory requirements, and governance.
                </p>

                <RevealGroup className="mt-7 flex flex-wrap gap-2">
                  {CAPABILITIES.map((cap) => (
                    <motion.span
                      key={cap}
                      variants={revealItem}
                      className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs text-mist-300"
                    >
                      {cap}
                    </motion.span>
                  ))}
                </RevealGroup>

                <div className="mt-9 flex flex-wrap items-center gap-5">
                  <a
                    href="#contact"
                    className="group inline-flex items-center gap-2 rounded-full bg-accent-400 px-6 py-3 text-sm font-semibold text-ink-950 transition-all duration-300 hover:bg-accent-300 hover:shadow-[0_0_30px_-4px_rgba(51,232,201,0.6)] focus-ring"
                  >
                    Explore Privora
                    <ArrowRight
                      size={16}
                      className="transition-transform duration-300 group-hover:translate-x-1"
                    />
                  </a>
                  <span className="text-sm text-mist-600">
                    Privora by RiseLoops
                  </span>
                </div>
              </div>

              <div>
                <ProductDashboardMock />
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
