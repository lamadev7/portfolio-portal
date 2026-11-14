# Parbat Lama · Portfolio (Next.js)

A calm editorial portfolio around a painted meadow hero: 24 painted scenes of the same man and his ragdoll cat on a turntable of waving grass. Next.js 14 App Router, TypeScript, server-rendered pages, and three.js loaded only on the client.

## Quickstart

```bash
pnpm install
pnpm dev      # → http://localhost:3000
```

## Production

```bash
pnpm build
pnpm start
```

Deploys cleanly on Vercel (zero config), Netlify, Cloudflare Pages, or any Node host.

## Stack

- **Next.js 14.2** (App Router, RSC)
- **React 18.3**
- **TypeScript 5.5**
- **Three.js 0.158** (loaded only on the client via `dynamic({ ssr: false })`)
- **Newsreader + Inter** via `next/font/google`
- No CSS framework. The site's tokens and styles live in `app/(site)/site.css`

## The site

- `app/(site)/`: home (`/`), `/work`, `/work/[slug]`, `/blog`, `/blog/[slug]`, with the shared header, footer and `site.css`.
- **Themes:** the three dots in the header switch `html[data-theme]` between `day`, `dusk` and `night`. The choice is remembered in `localStorage`, and the hero follows it.
- `components/meadow/`: the meadow hero (`MeadowHero.tsx` plus the three.js engine). Its paintings live in `public/meadow/scenes/`, described by `public/meadow/scenes.json`.
- `components/site/`: header, theme dots, footer, scroll reveal, article art.
- `lib/site/content.ts`: home-page copy (about, domains, agents, modules). Experience, education and stack come from `lib/data/`.

### Content and the admin panel (CMS)

Projects, blog posts and all home-page copy live in MongoDB and are edited at **/admin**.

1. Copy `.env.example` to `.env` and set `MONGODB_URI`, `MONGODB_DB` and `SESSION_SECRET` (`openssl rand -base64 48`). `.env` is git-ignored.
2. `pnpm seed` copies the Markdown in `content/` and the default site copy into the database. It only inserts what's missing, so it never overwrites edits made in the admin; `pnpm seed --force` overwrites from the files.
3. `pnpm admin:password you@example.com` creates the admin login (or resets its password) and prints a generated password once. Change it later at /admin/account.

The admin has:
- **Projects:** every card field (status shipped/TODO, results, features, stack, links, painting, order, featured, draft) and a Markdown write-up with preview.
- **Blog posts:** title, slug, date, tags, painting, draft and a Markdown body with preview.
- **Site content:** hero, rolling lines, facts, links, core stack, experience, agent principles, skills with levels, upcoming post and footer.
- **Account:** change password.

Saving refreshes the affected public pages straight away. Sessions are signed, httpOnly cookies scoped to /admin and last 7 days; rotating `SESSION_SECRET` signs everyone out. If `MONGODB_URI` is unset or the database is unreachable, the public site falls back to the Markdown files in `content/`.

### Visitors, reads, likes and comments

- **Visitors and views:** every page view is counted, and each visitor counts once a day, using an anonymous `pl_vid` cookie. No IP addresses are stored and bots are ignored. The total shows in the footer, and the details are on the admin dashboard.
- **Reads:** each blog post counts one read per visitor. The count shows in the post's meta line and in the admin posts list.
- **Likes and comments:** both need "Sign in with Google". Readers can delete their own comments. You can delete any comment at /admin/comments. Comments are plain text, capped at 2,000 characters and 5 per reader per 10 minutes.

To turn on Google sign-in:

1. In the [Google Cloud console](https://console.cloud.google.com/apis/credentials), create an **OAuth client ID** of type **Web application**.
2. Add the authorised redirect URIs `http://localhost:3100/api/auth/google/callback` (local) and `https://<your-domain>/api/auth/google/callback` (production).
3. Put `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `SITE_URL` in `.env`, and in your host's environment variables, then restart.

Until those are set, the post page shows the sign-in button disabled, with a note that comments open once sign-in is set up.

## Earlier experiments

The earlier versions live under `app/(legacy)/` with their own dark styling: `/trails` (Two Trails, the previous home), `/classic`, `/resume`, `/explorer`, `/lab`, `/lab2` and `/v2`.

## /trails — Two Trails

`/trails` is an interactive 3D story of the road from Sarlahi to the Himalaya (Engineer ⇄ Explorer, Recruiter View, Nepal map, scene soundscape, time-of-day lighting). It lives in `components/journey/`:

- `engine.ts` — the three.js world, overlay canvas, audio and scroll state (framework-free class, loaded client-side only)
- `Journey.tsx` — React chrome rendered from `engine.renderVals()`, scaled to the viewport
- `JourneyLoader.tsx` — `dynamic({ ssr: false })` wrapper
- `journey.css` — scoped styles
- assets: `public/snd/*.mp3` (ambiences), `public/fonts/Sawton*.woff2`

Run `pnpm dev` and open http://localhost:3000/trails (classic V3 portfolio at `/classic`; `/journey` redirects to `/trails`). Press M for the full map, Esc to close, arrows to step.

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
