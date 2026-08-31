"use client";

import { motion } from "framer-motion";
import { SectionHeading } from "../SectionHeading";
import { Reveal } from "../Reveal";

const NODES = [
  { x: 60, y: 60 },
  { x: 220, y: 30 },
  { x: 340, y: 90 },
  { x: 120, y: 160 },
  { x: 280, y: 190 },
  { x: 400, y: 40 },
  { x: 400, y: 190 },
];

const EDGES: [number, number][] = [
  [0, 1],
  [1, 2],
  [1, 3],
  [2, 4],
  [3, 4],
  [2, 5],
  [4, 6],
  [5, 6],
];

function NetworkVisual() {
  return (
    <svg
      viewBox="0 0 460 230"
      className="mx-auto w-full max-w-md"
      aria-hidden
    >
      {EDGES.map(([a, b], i) => (
        <motion.line
          key={`${a}-${b}`}
          x1={NODES[a].x}
          y1={NODES[a].y}
          x2={NODES[b].x}
          y2={NODES[b].y}
          stroke="rgba(96,191,172,0.28)"
          strokeWidth={1.2}
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.15 * i }}
        />
      ))}
      {NODES.map((node, i) => (
        <motion.circle
          key={i}
          cx={node.x}
          cy={node.y}
          r={i === 1 ? 6 : 4}
          fill={i === 1 ? "#60bfac" : "#7bcaba"}
          initial={{ opacity: 0, scale: 0 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 * i }}
        />
      ))}
      {NODES.map((node, i) => (
        <motion.circle
          key={`pulse-${i}`}
          cx={node.x}
          cy={node.y}
          r={i === 1 ? 6 : 4}
          fill="none"
          stroke="#60bfac"
          strokeWidth={1}
          initial={{ opacity: 0.6, scale: 1 }}
          animate={{ opacity: 0, scale: 2.4 }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            delay: i * 0.3,
            ease: "easeOut",
          }}
        />
      ))}
    </svg>
  );
}

export function SaudiArabia() {
  return (
    <section className="relative py-28 sm:py-36 bg-ink-950/40">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-14 lg:grid-cols-2 lg:gap-16 items-center">
          <SectionHeading
            eyebrow="BUILT IN SAUDI ARABIA"
            title="Built here. Ready for anywhere."
            description="RiseLoops develops enterprise technology with a deep understanding of Saudi Arabia's digital economy, regulatory environment, and ambitious technology transformation. Our vision extends beyond local requirements: build products in Saudi Arabia that can compete globally."
          />
          <Reveal delay={0.15}>
            <NetworkVisual />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
