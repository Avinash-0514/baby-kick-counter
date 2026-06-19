# Baby Kick Counter

A simple mobile-friendly kick counting and fetal movement pattern tracking app built with Next.js, Vercel, and Neon Postgres.

## Features

- Morning, afternoon, and evening kick count sessions
- Tap `+ Kick` to record each movement
- Undo and clear current session
- Save kick session to Postgres
- Stores individual kick timestamps
- Shows recent history
- Shows simple analysis for each period
- Mobile-first responsive design
- Safety wording for reduced or unusual movement

## Important safety note

This app is only for tracking and awareness. It does not diagnose health. If movement feels reduced, weaker, stopped, or unusual, contact a midwife/doctor or maternity unit immediately.

## Tech stack

- Next.js App Router
- React
- Neon Postgres
- `@neondatabase/serverless`
- Vercel deployment

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local`:

```bash
cp .env.example .env.local
```

3. Add your Neon database connection string:

```env
DATABASE_URL="postgresql://user:password@host.neon.tech/dbname?sslmode=require&channel_binding=require"
```

4. Run the app:

```bash
npm run dev
```

5. Open:

```text
http://localhost:3000
```

## Database

The app automatically creates these tables on first API request:

- `kick_sessions`
- `kick_events`

The same SQL is also available in:

```text
database/schema.sql
```

## Deploy to Vercel

1. Push this folder to GitHub.
2. Open Vercel and create a new project from the GitHub repository.
3. Add a Neon Postgres integration from Vercel Marketplace or create a Neon project directly.
4. Add the `DATABASE_URL` environment variable in Vercel Project Settings.
5. Deploy.

## Basic data model

### kick_sessions

Stores one morning, afternoon, or evening session.

### kick_events

Stores every individual kick timestamp for a session.

## Future improvements

- Login system
- PDF export for midwife/doctor
- Daily reminders
- Emergency contact button
- Chart improvements
- Native Flutter version
- Multi-language support
