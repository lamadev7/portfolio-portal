# Parbat Lama — Portfolio (Next.js)

Production-grade Next.js 14 rebuild of the brutalist-terminal portfolio. TypeScript, App Router, server-rendered sections, dynamic-import Three.js backdrop, organised by responsibility.

## Quickstart

```bash
cd nextjs
npm install
npm run dev   # → http://localhost:3000
```

## Production

```bash
npm run build
npm run start
```

Deploys cleanly on Vercel (zero config), Netlify, Cloudflare Pages, or any Node host.

## Stack

- **Next.js 14.2** (App Router, RSC)
- **React 18.3**
- **TypeScript 5.5**
- **Three.js 0.158** (loaded only on the client via `dynamic({ ssr: false })`)
- **JetBrains Mono** via `next/font/google`
- Zero CSS framework — design tokens + scoped styles live in `app/globals.css`

## / — Two Trails

The home route (`/`) is an interactive 3D story of the road from Sarlahi to the Himalaya (Engineer ⇄ Explorer, Recruiter View, Nepal map, scene soundscape, time-of-day lighting). It lives in `components/journey/`:

- `engine.ts` — the three.js world, overlay canvas, audio and scroll state (framework-free class, loaded client-side only)
- `Journey.tsx` — React chrome rendered from `engine.renderVals()`, scaled to the viewport
- `JourneyLoader.tsx` — `dynamic({ ssr: false })` wrapper
- `journey.css` — scoped styles
- assets: `public/snd/*.mp3` (ambiences), `public/fonts/Sawton*.woff2`

Run `npm run dev` and open http://localhost:3000 (classic V3 portfolio at `/classic`; `/journey` redirects home). Press M for the full map, Esc to close, arrows to step.

## Project layout

```
nextjs/
├── app/
│   ├── globals.css          # design tokens + section styles
│   ├── layout.tsx           # root layout, font loading, metadata
│   └── page.tsx             # composes the home page (mostly server components)
├── components/
│   ├── layout/              # Topbar, Rails, Footer  (server)
│   ├── sections/            # Hero, Experience, Work, AgentsSection, EduHonors, Stack, Contact
│   ├── ui/                  # Reusable: SectionHead, CommandLine
│   ├── agents/
│   │   └── AgentGraph.tsx   # Interactive orchestrator graph (client, dynamic)
│   ├── tweaks/
│   │   ├── TweaksPanel.tsx  # Reusable shell + Tweak* controls
│   │   └── TweaksMount.tsx  # Wires the panel into the page
│   └── scene/
│       ├── SceneLoader.tsx  # Client wrapper, dynamic import (ssr:false)
│       ├── Scene.tsx        # Three.js host + render loop
│       ├── workstation.ts   # Desk/monitor/lamp/mug builder
│       ├── logos.ts         # 14 tech-stack 3D logo builders
│       ├── waypoints.ts     # Camera path
│       ├── accent.ts        # CSS-var → THREE.Color
│       └── screen-scenes/
│           ├── index.ts                 # Director (6 paired scenes)
│           ├── helpers.ts               # Canvas helpers + code typewriter
│           ├── react-code.ts            # Scene 1: React code
│           ├── dashboard.ts             # Scene 2: UI + fleet map
│           ├── express-code.ts          # Scene 3: Express + Mongo
│           ├── api-health.ts            # Scene 4: live request log + probes
│           ├── agents-code.ts           # Scene 5: orchestrator class
│           └── orchestrator-live.ts     # Scene 6: live routing visualizer
└── lib/
    ├── data/                # All static portfolio copy as pure TS
    │   ├── experiences.ts
    │   ├── projects.ts
    │   ├── stack.ts
    │   ├── contact.ts
    │   └── education.ts
    └── tweaks/
        └── use-tweaks.ts    # Tweaks state + host postMessage protocol
```

## Rendering strategy

**Server components by default.** Hero, Experience, Work, EduHonors, Stack, Contact, Topbar, Rails, Footer all render server-side with zero client JS — copy edits are an `npm run build` away from production.

**Client islands** are isolated to the bits that genuinely need interactivity:
- `CommandLine` — typing animation in the hero
- `AgentGraph` — clickable SVG node graph + live log (also `dynamic` so it's a separate chunk)
- `Scene` — Three.js backdrop, lazy-loaded with `ssr: false`
- `TweaksMount` — floating live-tweak panel

**Three.js is code-split.** `SceneLoader.tsx` is the only file that loads `three`, behind `dynamic(import, { ssr: false })`. The initial HTML response contains all the readable content; the 3D scene hydrates on its own chunk afterwards.

## Editing content

All copy lives in `lib/data/*.ts` — TypeScript objects, fully typed. To add a project, drop a new entry in `lib/data/projects.ts`. To rewrite the PortPro bullets, edit `lib/data/experiences.ts`. No component changes required.

## Tweaks (live editing)

Toggle the Tweaks panel from the host toolbar (postMessage protocol) and live-pick accent color, scene density, scanline toggle, and 3D backdrop intensity. State persists via the host write-back protocol.

## License

Private — © Parbat Lama, 2026.
