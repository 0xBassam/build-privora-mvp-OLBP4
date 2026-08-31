const COLUMNS = [
  {
    title: "Products",
    links: [
      { label: "Privora", href: "https://privorasa.com", external: true },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#who-we-are", external: false },
      { label: "Contact", href: "#contact", external: false },
    ],
  },
  {
    title: "Technology",
    links: [
      { label: "Security", href: "#security", external: false },
      { label: "Our Approach", href: "#approach", external: false },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "#", external: false },
      { label: "Terms", href: "#", external: false },
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
              <img
                src="/brand/logo-symbol-dark.svg"
                alt=""
                aria-hidden="true"
                className="h-8 w-8"
              />
              RiseLoops
            </div>
            <p className="mt-4 max-w-xs text-sm text-mist-500 leading-relaxed">
              Intelligent technology. Secure by design.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <a
                href="mailto:info@riseloops.sa"
                className="text-sm text-mist-400 hover:text-white transition-colors focus-ring w-fit"
              >
                info@riseloops.sa
              </a>
              <a
                href="tel:+966567008085"
                className="text-sm text-mist-400 hover:text-white transition-colors focus-ring w-fit"
              >
                +966 56 700 8085
              </a>
            </div>
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
                      {...(link.external
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
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
