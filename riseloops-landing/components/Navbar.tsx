"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { label: "Products", href: "#products" },
  { label: "Solutions", href: "#what-we-do" },
  { label: "Technology", href: "#approach" },
  { label: "Security", href: "#security" },
  { label: "Company", href: "#who-we-are" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="fixed top-0 inset-x-0 z-50">
      <div
        className={`mx-auto max-w-6xl px-4 sm:px-6 transition-all duration-500 ${
          scrolled ? "pt-3" : "pt-5"
        }`}
      >
        <nav
          className={`flex items-center justify-between rounded-2xl px-4 sm:px-5 py-3 transition-all duration-500 ${
            scrolled
              ? "bg-ink-950/80 backdrop-blur-xl border border-white/10 shadow-[0_10px_40px_-20px_rgba(0,0,0,0.8)]"
              : "bg-transparent border border-transparent"
          }`}
        >
          <Link
            href="#top"
            className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight focus-ring"
            aria-label="RiseLoops home"
          >
            <span className="relative flex h-7 w-7 items-center justify-center rounded-lg border border-accent-400/40 bg-accent-400/10">
              <span className="h-2.5 w-2.5 rounded-full bg-accent-400 shadow-[0_0_10px_2px_rgba(51,232,201,0.7)]" />
            </span>
            RiseLoops
          </Link>

          <ul className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="text-sm text-mist-300 hover:text-white transition-colors duration-200 focus-ring"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="hidden md:flex items-center gap-5">
            <a
              href="#contact"
              className="text-sm text-mist-300 hover:text-white transition-colors duration-200 focus-ring"
            >
              Contact
            </a>
            <a
              href="#products"
              className="inline-flex items-center rounded-full bg-accent-400 px-5 py-2.5 text-sm font-semibold text-ink-950 transition-all duration-300 hover:bg-accent-300 hover:shadow-[0_0_24px_-4px_rgba(51,232,201,0.6)] focus-ring"
            >
              Explore Products
            </a>
          </div>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-white focus-ring"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </nav>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="md:hidden fixed inset-0 top-0 z-40 bg-ink-950/95 backdrop-blur-xl"
          >
            <motion.div
              initial={{ y: -16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -16, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="flex h-full flex-col px-6 pt-28 pb-10"
            >
              <ul className="flex flex-col gap-2">
                {NAV_LINKS.map((link, i) => (
                  <motion.li
                    key={link.href}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * i, duration: 0.3 }}
                  >
                    <a
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className="block py-4 text-2xl font-display border-b border-white/5 text-white focus-ring"
                    >
                      {link.label}
                    </a>
                  </motion.li>
                ))}
              </ul>
              <div className="mt-auto flex flex-col gap-4">
                <a
                  href="#contact"
                  onClick={() => setOpen(false)}
                  className="text-center py-3 text-mist-300 focus-ring"
                >
                  Contact
                </a>
                <a
                  href="#products"
                  onClick={() => setOpen(false)}
                  className="text-center rounded-full bg-accent-400 py-3 font-semibold text-ink-950 focus-ring"
                >
                  Explore Products
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
