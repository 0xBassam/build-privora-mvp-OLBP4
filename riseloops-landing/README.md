# RiseLoops Landing Page

This is the corporate marketing / landing site for **RiseLoops**, the parent
technology company behind Privora. It is a standalone Next.js application,
independent of the Privora product app under `frontend/` in this repository.

## Tech Stack

- [Next.js 16](https://nextjs.org/) (App Router, static export)
- React 19 + TypeScript
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

## Deployment (GitHub Pages)

This app builds as a static export (`output: 'export'` in `next.config.mjs`)
and is published to GitHub Pages by
`.github/workflows/deploy-riseloops-pages.yml`, which runs automatically on
every push to this branch that touches `riseloops-landing/`.

Because this is a project page (served from
`https://<owner>.github.io/<repo>/` rather than a custom domain), the build
sets `basePath`/`assetPrefix` to `/build-privora-mvp-OLBP4` whenever the
`GITHUB_PAGES=true` environment variable is set (the workflow sets this
automatically). Building locally with plain `npm run build` does **not** set
this and serves from `/`, which is what you want for local dev/testing.

To build the exact artifact the workflow publishes:

```bash
GITHUB_PAGES=true npm run build
```

The static site is emitted to `riseloops-landing/out/`.

One-time manual step required in the GitHub repository settings (not
something a workflow file can do on its own): under **Settings → Pages**,
set **Source** to **GitHub Actions**. Once that's set, this workflow handles
every subsequent build and deploy.
