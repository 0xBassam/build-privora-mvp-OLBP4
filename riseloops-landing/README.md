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

The site is served from the custom domain **riseloops.sa**, which GitHub
Pages serves from the domain root (not a `/<repo>/` subpath), so no
`basePath`/`assetPrefix` is configured — the export is root-relative.
`public/CNAME` (containing `riseloops.sa`) is copied into the export output
by Next.js and picked up by `actions/deploy-pages` to configure the custom
domain automatically on deploy.

The static site is emitted to `riseloops-landing/out/` by `npm run build`.

Manual steps required in the GitHub repository/DNS settings (not something a
workflow file can do on its own):

1. **Settings → Pages → Source**: **GitHub Actions**.
2. **DNS for riseloops.sa** (at your domain registrar): add `A` records for
   the apex domain pointing to GitHub Pages' IPs —
   `185.199.108.153`, `185.199.109.153`, `185.199.110.153`,
   `185.199.111.153` (optionally matching `AAAA` records for IPv6:
   `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`,
   `2606:50c0:8003::153`). If you also want `www.riseloops.sa` to work, add a
   `CNAME` record for `www` pointing to `<owner>.github.io`.
3. Once DNS propagates and the workflow has deployed at least once (so the
   `CNAME` file is live), **Settings → Pages → Custom domain** should show
   `riseloops.sa` as verified — then enable **Enforce HTTPS**.

Actions must actually be able to run jobs on this repository for any of this
to take effect — see the repository's Settings → Actions → General if
workflow runs are failing before a runner is even assigned.
