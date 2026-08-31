# RiseLoops Landing Page

This is the corporate marketing / landing site for **RiseLoops**, the parent
technology company behind Privora. It is a standalone Next.js application,
independent of the Privora product app under `frontend/` in this repository.

## Tech Stack

- [Next.js 14](https://nextjs.org/) (App Router)
- React 18 + TypeScript
- Tailwind CSS
- Framer Motion (scroll reveals, hero animation, architecture diagram)
- lucide-react (icons)

## Getting Started

```bash
cd riseloops-landing
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the site.

## Build

```bash
npm run build
npm run start
```

## Structure

- `app/` — App Router entry points: `layout.tsx` (fonts + metadata),
  `page.tsx` (section composition), `globals.css` (Tailwind + custom
  keyframes/utilities).
- `components/` — Shared UI primitives (`Navbar`, `Footer`, `Button`,
  `SectionHeading`, `Reveal`).
- `components/sections/` — One component per landing page section (Hero,
  WhoWeAre, Products, Ecosystem, WhatWeDo, WhyRiseLoops, Philosophy,
  Security, SaudiArabia, Approach, CompanyVision, FinalCTA).

This site is one page with in-page anchor navigation and does not share any
code, dependencies, or build tooling with the Privora product app.
