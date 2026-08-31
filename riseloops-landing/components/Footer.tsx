const COLUMNS = [
  {
    title: "Products",
    links: [{ label: "Privora", href: "#products" }],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#who-we-are" },
      { label: "Contact", href: "#contact" },
    ],
  },
  {
    title: "Technology",
    links: [
      { label: "Security", href: "#security" },
      { label: "Our Approach", href: "#approach" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "#" },
      { label: "Terms", href: "#" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative border-t border-white/10 py-16">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2 font-display text-2xl font-semibold">
              <span className="relative flex h-7 w-7 items-center justify-center rounded-lg border border-accent-400/40 bg-accent-400/10">
                <span className="h-2.5 w-2.5 rounded-full bg-accent-400 shadow-[0_0_10px_2px_rgba(51,232,201,0.7)]" />
              </span>
              RiseLoops
            </div>
            <p className="mt-4 max-w-xs text-sm text-mist-500 leading-relaxed">
              Intelligent technology. Secure by design.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-xs font-semibold tracking-[0.2em] text-mist-600 uppercase">
                {col.title}
              </h3>
              <ul className="mt-4 flex flex-col gap-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-mist-400 hover:text-white transition-colors focus-ring"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-2 border-t border-white/10 pt-8 text-xs text-mist-600 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; 2026 RiseLoops. All rights reserved.</p>
          <p>Privora is a RiseLoops product.</p>
        </div>
      </div>
    </footer>
  );
}
