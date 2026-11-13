---
title: Ascent
tagline: A personal growth app that turns big goals into a plan for today.
summary: Set a goal, break it into steps, and Ascent turns it into today's tasks, habits and reminders that fit around a 9-to-5. Learning, health, sleep, food and workouts live in one app, and it keeps working without internet.
kicker: Mobile app · goals · habits · health
status: shipped
when: 2026 · in testing
year: 2026
role: Solo · design, app and server
order: 3.5
featured: true
m1: Offline | everything saves instantly and syncs when you're back online
m2: ~150 foods | built in, Nepali and South Asian staples included
m3: Score / 5 | every evening, rolled up into a weekly review
cardStack: React Native · Expo · TypeScript · Node.js · MongoDB
cta: case
stack: [React Native, Expo, TypeScript, Zustand, Node.js, Express, MongoDB, Redis]
highlight: Built around a 9-to-5. The day plan only holds what fits, and "Rough day?" cuts it down to the essentials in one tap.
art: s24
artAlt: Parbat hangs paper stars on a string while his cat bats one
---

Big goals stall because nothing tells you what to do today. Ascent closes that gap. You set a goal, break it into steps, and the app turns it into a short list for today, a few habits to keep, and reminders at the right moments. Then it shows you, day by day, that you're actually climbing.

![Today: top three tasks, goal tasks and habits](/work/ascent/today-tasks.webp)
![Day plan: the day as time blocks with the current block on top](/work/ascent/today-day-plan.webp)
![Goals: every goal with its progress](/work/ascent/goals.webp)

## What it does

- **Today:** your top three first, then tasks from your goals, then today's habits. Tap to tick.
- **Day plan:** your day as time blocks, with what's happening now and the time left. A separate weekend plan, copied from weekdays in one tap.
- **Goals:** track a number (like body weight) or a list of steps (like learning a skill). Each goal shows its pace and a deadline.
- **Plan drafting:** a new goal can start with suggested steps and weekly habits, which you edit before saving.
- **Habits:** daily or weekly, with streaks and a three-week heatmap.
- **Sleep:** last night's hours, how long it took to fall asleep, and a wind-down routine with tips when you're slow to drift off.
- **Food:** a weekly meal plan with calorie and protein targets that come from your weight goal, ticked off as you eat.
- **Workouts:** log each set. The weight goes up once you hit the top of your rep range on every set.
- **Reminders:** a morning plan, an evening check-in, a nudge when a streak is at risk, and a weekly review.

![Goal detail: progress ring, pace and milestones](/work/ascent/goal-detail.webp)
![Habits: streaks and a three-week heatmap](/work/ascent/habits.webp)
![Sleep: last night and the past seven nights](/work/ascent/sleep.webp)

## A day with Ascent

1. Morning: open Today and see the three things that matter most.
2. During the day: the day plan says what's on now. A learning block opens a 60-minute focus session on the next step of your goal.
3. Evening: a short check-in for mood, wins and blockers. Shutdown gives the day a score out of 5 and asks for tomorrow's top three.
4. Sunday: the weekly review shows the week's score, the wins, and what to fix next.

## Built to be relied on

- **Works without internet.** Every change saves on the phone first and syncs when you're back online, so a weak signal never loses a tick.
- **Your data, your call.** Export goals and habits to a file, or clear everything and start fresh.
- **Light and dark**, following the phone's setting.

## How it's built

A phone app for iPhone and Android, built with React Native and Expo, and a small server that keeps your data in sync. I designed every screen first, built the app against a fake server so the design could be tested early, then switched it to the real one.

## What's next

Smarter plan drafting that writes a goal's steps for you, and an App Store release.
