---
title: "Trace: a run tracker that lives on the phone"
summary: A local-first run, ride and hike tracker for iPhone, built with Expo. How it keeps recording with the screen off, cleans up noisy GPS, and what a fresh-clone check caught.
date: 2026-11-15
tags: [mobile, react-native, gps]
---

Trace records runs, rides and hikes on an iPhone: a live map, distance, pace, climb and steps while you move, then a history, km splits, charts and an animated replay afterwards. There is no account and no server. Every point stays on the phone, and the maps it uses are free and need no key.

![Four Trace screens: recording a run in Kathmandu with live time, distance and pace; the history list titled by street names; a hike's detail page with its map, totals and elevation profile; and the dark replay with the travelled path drawn in orange.](/blog/trace-screens.png)

## Why build it

I write React for the web every day. Trace was the project to learn what changes on a phone: permissions, background work, sensors, maps, a local database and native builds. A fitness tracker touches all of them, and it comes with a goal you can check: the distance on screen should match the distance you ran.

## How a recording works

One rule shapes the whole app: **the screen never records anything.** A background task receives the location fixes, filters them and writes the good ones to a SQLite database on the phone. The screens only read from that database and redraw when it changes.

![How Trace records: GPS and motion sensors feed a background task that runs even with the screen off; it filters each fix and writes accepted points to SQLite on the phone; the screens only read from SQLite. If the app is killed, the next launch restores the run.](/blog/trace-recording-flow.svg)

That split is what makes the hard cases work:

- **Screen off, phone in a pocket.** The task keeps running and iOS shows the blue location pill.
- **App killed mid-run.** The timer is saved every three seconds, so the next launch picks the run up where it was: same clock, same trail, still recording.
- **Nothing to lose.** The database is the source of truth, so any screen can be rebuilt from it at any time.

## Cleaning up GPS

Raw phone GPS is noisy. Standing still, the position wanders a few metres every second, and adding up those wobbles turns a coffee stop into a phantom kilometre. Every fix goes through a short filter before anything is stored:

![Trace's GPS filter as a funnel: every fix enters; a warm-up waits for a fix accurate to 15 metres; hard limits drop fixes that are too blurry, out of order or impossibly fast; a Kalman filter smooths the position; a point is stored only when it is really moving. Standing still stores nothing.](/blog/trace-gps-filter.svg)

The key decision is that **smoothing and storing are separate steps.** The smoothing sees every plausible fix, but a point is stored only when the smoothed position is actually moving and has left the noise around the last point. At a red light nothing gets through, so the distance stays put. In the unit tests, a straight line recorded with ±5 m of noise comes out within about 5% of the true distance. On the simulator, a 504 m stretch at a steady pace recorded as 498 m.

Elevation gets the same care. Altitude is averaged over five readings and only counts once it has moved three metres, so a flat road doesn't pile up fake climbing.

## After the run

- **History** titles each activity from where it started and ended ("Dabali Marga → Kathmandu Valley"), using the phone's own address lookup.
- **Detail** shows the route, the totals, km splits with the fastest one highlighted, and pace (speed for rides) and elevation profiles.
- **Replay** moves a marker along the real path at 4×, 10× or 30×, skips the stops, and keeps the camera on the marker.
- **Moments.** Photos taken during the activity with any camera app are pinned to the route, at the photo's own location or where you were at that moment, and pop up as the replay passes them.
- **Maps.** Light, dark and detailed street maps from OpenFreeMap, plus satellite imagery with 3D terrain. All free, no keys.

## What a fresh-clone check caught

Before writing this up I cloned the repository from scratch, read every file against the spec, ran it on the iOS simulator and drove it through scripted scenarios: a run, a pause, a killed app, a replay. Most of it did what it set out to do. Seven things didn't, and all seven are fixed:

- **It crashed on launch from a clean clone.** A one-line fix to a dependency had been saved together with 67,000 lines of build output. On a fresh install those files misled the iOS build, a framework never got copied into the app, and it closed before showing anything. It only worked on my machine because the real files were already there. The patch is now the one line it was meant to be.
- **Pausing could wreck a run.** Pause, travel somewhere, resume: the gap counted as distance. In the test below, a 0.4 km run saved as 6 km at 26 seconds per kilometre. When the hop was fast, the speed check also rejected every new fix for several minutes. Each resume now starts a new segment with a fresh GPS warm-up, and distance, pace, splits and replay never bridge two segments.

![The same simulator test before and after the pause fix: run, pause, move 5.5 km, resume, run. Before, it saved as 6.00 km at 0'26"/km. After, 0.38 km at 5'15"/km, against a true run of about 0.40 km at 5'03"/km.](/blog/trace-pause-fix.svg)

- **Splits and charts were missing.** They were in the plan, but the detail page had only totals. They are now drawn with plain views. A charting library would have added two native dependencies for three simple charts.
- **Old activities showed "undefined".** Walks recorded before hikes replaced them kept their old type on a phone that had already applied that migration. A small follow-up migration repairs them.
- **A restored run lost its step count,** and **the map style reset on every launch.** Both now carry over.
- **The idle map left you at the edge of the screen,** because a zoom cut the "centre on me" animation short. It now lands on your position.

The lesson I keep relearning: "works on my phone" is a claim. A fresh clone and a scripted run are how you check it.

## Built with

Expo SDK 57 and React Native 0.86 in TypeScript, Expo Router for screens, MapLibre with OpenFreeMap tiles, Expo Location and Task Manager for background GPS, SQLite with Drizzle for storage, Zustand for the little state that isn't in the database, and Reanimated for motion. The GPS filter, elevation, steps and split maths are covered by 38 unit tests, and every milestone ends with a real walk or run.
