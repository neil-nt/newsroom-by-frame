# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SF&D Insights Engine — a media intelligence platform built for Frame (Scottish PR/creative comms agency). Ingests multi-source data streams, filters through a client-specific context layer using two-stage AI analysis, and outputs actionable PR intelligence.

First client: Castle Water (UK's largest independent business water retailer).

## Commands

```bash
# Development
npm run dev              # Start Next.js dev server (port 3000)
npm run build            # Production build
npm run lint             # ESLint

# Database
npx prisma migrate dev   # Run migrations
npx prisma generate      # Regenerate Prisma client
npx prisma db seed       # Seed database (Castle Water data)
npx prisma studio        # Visual database browser
```

## Architecture

### Tech Stack
- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- Prisma 7 ORM with SQLite (local dev) — **requires driver adapter pattern**
- Claude API (Anthropic SDK) for intelligence layer
- BullMQ + ioredis for job scheduling (installed, not yet wired)

### Prisma 7 Specifics
- Datasource URL is in `prisma.config.ts`, NOT in `schema.prisma`
- PrismaClient **requires** an `adapter` option (no zero-arg constructor)
- Uses `@prisma/adapter-libsql` + `@libsql/client` for SQLite
- Generated client is at `src/generated/prisma/client.ts` (not index.ts)
- Import as: `import { PrismaClient } from "@/generated/prisma/client"`

### Data Flow
1. **Ingestion** (`src/lib/ingestion/`) — Fetches from RSS, NewsAPI, SerpAPI, Twitter, Reddit, Eventbrite
2. **Intelligence** (`src/lib/intelligence/`) — Two-stage AI filtering:
   - Stage 1: `preFilter()` with claude-haiku-4-5 (cheap relevance scoring, ~$0.001/item)
   - Stage 2: `analyzeSignal()` with claude-sonnet-4-5 (full analysis, only items scoring >0.4)
3. **Delivery** (`src/lib/delivery/`) — Slack webhooks (breaking alerts) + email digests (Resend)
4. **Dashboard** (`src/app/dashboard/`) — Server-rendered alert panels by type

### Four Alert Types
- **Breaking News** — Reactive, immediate attention
- **Trending Topics** — Active trends for client commentary
- **White Space** — Proactive opportunities with no competition
- **Speaker Pipeline** — Events and speaking opportunities

### API Routes
- `POST /api/ingest` — Trigger ingestion pipeline
- `GET /api/alerts?clientId=&type=&status=&limit=` — Fetch alerts
- `PATCH /api/alerts` — Update alert status/feedback
- `GET /api/clients` — List clients
- `POST /api/digest` — Trigger email digest

### Key Data Models
Client → ClientContext (1:1), Spokespeople, Competitors, Topics, Sources → RawItems → Alerts

### Environment Variables
All API keys and service config are in `.env`. Required: `DATABASE_URL`, `ANTHROPIC_API_KEY`. Optional: `NEWS_API_KEY`, `SERP_API_KEY`, `TWITTER_BEARER_TOKEN`, `REDDIT_CLIENT_ID/SECRET`, `SLACK_WEBHOOK_URL`, `RESEND_API_KEY`.
