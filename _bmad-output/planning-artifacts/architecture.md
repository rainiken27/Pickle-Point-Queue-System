---
stepsCompleted: ['step-01-init', 'step-02-context', 'step-03-starter', 'step-04-decisions']
inputDocuments: ['prd.md', 'README.md']
workflowType: 'architecture'
project_name: 'pickleball-queue'
user_name: 'Emperor Boplax'
date: '2026-01-01'
lastStep: 4
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**

The system requires 50 functional capabilities organized into 7 core areas:

1. **Player Management & Check-In (FR1-FR7)** - QR code registration, player profiles (name, photo, skill level, gender), check-in flow, preference setting/editing, session time visibility
2. **Queue & Matchmaking (FR8-FR16)** - Individual/group queuing (2-4 players), skill-based matching (Beginner/Intermediate-Advanced), gender preference matching (men's/women's/mixed/random), variety enforcement (avoid last 3 session opponents), time-urgency prioritization, constraint relaxation logic
3. **Court Management & Operations (FR17-FR24)** - Unified 12-court dashboard across 3 buildings, real-time court status, match calling, session completion, score encoding, manual overrides, auto-match suggestions
4. **Session & Time Tracking (FR25-FR31)** - 5-hour facility-wide timer, cross-building time tracking, soft warnings (4:30), personal alerts (4:55), grace period handling (up to 25 min to finish game), re-registration flow
5. **Statistics & Analytics (FR32-FR38)** - Player stats dashboards, court utilization reports, load variance analysis, peak hour insights, session history with scores, variety enforcement data tracking
6. **Multi-Building Coordination (FR39-FR44)** - Auto-routing to shortest queue, physical location awareness (no forced walking), 10-min local match preference, manual building assignment, 10% variance balancing target
7. **Real-Time Synchronization (FR45-FR50)** - TV display queue updates, time warning displays, dashboard court status sync, cashier confirmation, graceful degradation to polling, stale data indicators

**Non-Functional Requirements:**

Critical NFRs that will drive architectural decisions:

- **Performance Targets:**
  - Page load: <2s (dashboard), <1s (TV), <1.5s (cashier)
  - Real-time latency: 1-2s max for queue updates on TV displays
  - Matchmaking speed: <5s to generate suggestions
  - Supabase queries: <500ms player lookups, <200ms session writes

- **Reliability & Resilience:**
  - 99.9% uptime during facility hours
  - Graceful degradation: SSE → 2s polling fallback within 5s
  - Stale data indicators for displays (>5s old)
  - Zero data loss during localStorage → Supabase migration

- **Security & Access Control:**
  - QR codes must be unique and non-guessable
  - Role-based access (court officer, cashier, TV read-only)
  - Player data privacy (only view own stats)
  - 8-hour session token expiry

- **Scalability:**
  - 200+ concurrent daily players
  - 12 courts across 3 buildings
  - 100 players in queue simultaneously
  - 2x growth capacity (400 players) with minimal infrastructure changes

- **Browser & Accessibility:**
  - Modern evergreen browsers only (Chrome, Firefox, Safari, Edge - latest 2 versions)
  - WCAG 2.1 Level A compliance
  - No mobile phone support (tablets and desktop only)

**Scale & Complexity:**

- **Primary domain:** Web Application (SPA pattern with real-time features)
- **Complexity level:** Low-to-Medium
  - Well-understood domain (queue management, matchmaking)
  - No novel algorithms or breakthrough innovation
  - Primary challenges: real-time coordination, data migration safety, matchmaking constraint logic
- **Estimated architectural components:**
  - 3 frontend interfaces (court officer dashboard, TV displays, cashier check-in)
  - Matchmaking engine with priority hierarchy
  - Real-time sync layer (SSE + Supabase subscriptions)
  - Session state management (timers, grace periods)
  - QR code authentication system
  - Database layer (Supabase with migration strategy)
  - Analytics/reporting module

### Technical Constraints & Dependencies

**Existing Technology Stack (MVP Brownfield):**
- Next.js 16 with App Router
- React 18+, TypeScript
- Tailwind CSS 4
- localStorage (current persistence, migrating to Supabase)

**Required Technology Decisions:**
- Backend/Database: Supabase (real-time subscriptions, authentication)
- Real-time Transport: Server-Sent Events (SSE) for TV displays, Supabase real-time for dashboard
- State Management: React hooks + lightweight library (Zustand/Jotai)
- QR Code: Generation and scanning libraries
- Deployment: Vercel or edge platform for low latency

**Migration Constraints:**
- Must maintain 3-phase migration strategy (parallel systems → soft launch → cutover)
- Zero data loss requirement during localStorage → Supabase transition
- No backward compatibility needed (clean cutover)

**Browser & Device Constraints:**
- No IE support
- No mobile phone optimization
- Tablet + desktop only (facility controls hardware)

### Cross-Cutting Concerns Identified

1. **Real-Time Data Synchronization**
   - Queue state must sync across all interfaces within 2 seconds
   - SSE for one-way TV updates, Supabase real-time for bidirectional dashboard
   - Graceful degradation strategy when real-time fails
   - Stale data detection and user notification

2. **Session State Management**
   - 5-hour timers must persist across browser refreshes and connection drops
   - Facility-wide tracking (not per-building)
   - Grace period logic for mid-game time expiration
   - Warning notifications at 4:30 and 4:55 marks

3. **Data Integrity & Migration Safety**
   - localStorage → Supabase migration with parallel validation
   - Queue position consistency across 3 buildings
   - Session timer accuracy during network interruptions
   - Score and stats logging reliability

4. **Authentication & Authorization**
   - QR code uniqueness and security
   - Role-based UI access (court officer vs cashier vs TV read-only)
   - Player data privacy (can only view own stats)
   - Session token management

5. **Performance & Resilience**
   - <2s page loads with real-time subscriptions active
   - Offline handling with connection status indicators
   - Polling fallback strategy
   - Bundle size optimization (target <500KB initial JS)

6. **Matchmaking Algorithm Complexity**
   - Priority hierarchy: Friend groups > Time urgency > Skill > Gender > Variety > Building
   - Constraint relaxation logic after 2 queue cycles (~20 min)
   - Variety enforcement requires historical session data (last 3 sessions)
   - Performance target: <5s to generate match suggestions

## Starter Template Evaluation

### Primary Technology Domain

**Web Application (SPA)** based on project requirements analysis

### Existing Stack Analysis (Brownfield Project)

This is a **brownfield enhancement project** with an established MVP foundation rather than a greenfield startup. The existing technical stack is well-suited for the requirements and will be retained with strategic enhancements.

### Current Foundation: Next.js 16 MVP

**Rationale for Continuing with Existing Stack:**

1. **Proven Foundation** - Existing MVP successfully handles 4-court queue management with localStorage
2. **Technology Alignment** - Next.js 16 with App Router perfectly matches SPA requirements with real-time features
3. **Modern Tooling** - Turbopack, React Compiler, and improved prefetching provide production-grade performance
4. **Migration Path** - Existing codebase provides clear enhancement path rather than costly full rewrite
5. **Team Familiarity** - Development team already understands the current architecture

**Current Stack Configuration:**

```bash
# Existing MVP Stack
Framework: Next.js 16 with App Router
Language: TypeScript
UI Library: React 18+
Styling: Tailwind CSS 4
Icons: Lucide React
Current Persistence: localStorage (migrating to Supabase)
Deployment: Vercel (or similar edge platform)
```

### Architectural Decisions Established by Existing Stack

**Language & Runtime:**
- TypeScript for type safety across 50+ functional requirements
- Node.js v20.9.0+ (Next.js 16 requirement)
- React 18+ with Server Components support where beneficial

**Build Tooling:**
- **Turbopack** (default in Next.js 16 dev) - 5-10× faster than Webpack in development
- **React Compiler** for automatic memoization - reduces unnecessary re-renders with zero runtime cost
- **Layout Deduplication** for improved prefetching - critical for queue lists with 100+ players (downloads shared layout once instead of per-link)
- **App Router** with file-based routing and nested layouts

**Styling Solution:**
- Tailwind CSS 4 for utility-first styling
- Responsive design optimized for 3 distinct interfaces:
  - Court Officer Dashboard (tablet, 1024×768 to 1920×1080)
  - TV Displays (large format, 1920×1080 to 4K, readable from 10+ feet)
  - Cashier Check-In (desktop/tablet, 1280×720 to 1920×1080)
- Lucide React for consistent iconography

**Testing Framework:**
- **Recommended Addition:** **Vitest** for unit/integration tests
  - 4× faster than Jest (3.8s vs 15.5s in benchmarks)
  - Native ESM, TypeScript, JSX support out of the box
  - Jest-compatible API for easy team adoption
  - Parallel test execution with worker threads
  - HMR for tests (only reruns related changes)
  - Installation: `npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths`
- **E2E Testing:** Playwright recommended (for async Server Components and real-time features testing)

**State Management:**
- **Recommended Addition:** **Zustand**
  - Centralized store for queue state, court status, session timers
  - Persist middleware for localStorage fallback during migration and when real-time connections drop
  - Redux DevTools integration for matchmaking algorithm debugging
  - Perfect for interconnected global state shared across 3 interfaces
  - Installation: `npm install zustand`

**QR Code Generation:**
- **Recommended Addition:** **react-qr-code v2.0.18**
  - Free, open-source, actively maintained (323 projects using it)
  - SVG-based for scalable rendering across device sizes
  - Simple API for generating unique player QR codes
  - Installation: `npm install react-qr-code`

**Real-Time Features:**
- **Recommended Addition:** **Supabase JS SDK**
  - Real-time subscriptions for court officer dashboard
  - Server-Sent Events (SSE) implementation for TV displays (read-only, one-way updates)
  - Authentication and database client
  - Graceful degradation to 2-second polling fallback
  - Installation: `npm install @supabase/supabase-js`

### Code Organization Structure

**App Router Structure:**
```
app/
├── admin/              # Court officer dashboard (12-court management)
├── display/            # TV display interface (read-only real-time)
├── cashier/            # Check-in interface (QR scanning, preferences)
├── api/                # API routes for SSE and custom endpoints
└── layout.tsx          # Root layout with shared providers

lib/
├── matchmaking/        # Priority hierarchy algorithm
├── queue/              # Queue coordination logic
├── session/            # 5-hour timer management, grace periods
├── supabase/           # Supabase client configuration
└── utils/              # Shared utilities

components/
├── court-grid/         # Court status visualization
├── queue-list/         # Real-time queue display
├── player-card/        # Player profile components
└── ui/                 # Reusable UI primitives

hooks/
├── useQueue.ts         # Queue state management
├── useRealtime.ts      # SSE and Supabase real-time subscriptions
├── useSessionTimer.ts  # 5-hour timer tracking
└── useMatchmaking.ts   # Matchmaking algorithm hook

types/
├── player.ts           # Player profile types
├── queue.ts            # Queue and match types
├── court.ts            # Court status types
└── session.ts          # Session and timer types

store/
└── index.ts            # Zustand store configuration
```

### Development Experience

**Developer Tooling:**
- Hot Module Replacement via Turbopack (instant feedback)
- TypeScript strict mode for comprehensive type safety
- ESLint + Prettier (existing configuration)
- Vitest for fast test feedback loop
- React DevTools + Redux DevTools (via Zustand middleware)

**Debugging:**
- Redux DevTools for state inspection (matchmaking algorithm states)
- React DevTools for component profiling
- Network tab for SSE connection monitoring
- Supabase Dashboard for database inspection

### Production Optimizations

**Performance Features:**
- **Cache Components** for time-based caching policies (centralized cache control)
- **Automatic Code Splitting** via App Router (smaller initial bundles)
- **React Compiler Auto-Memoization** (zero runtime cost, reduces re-renders)
- **Layout Deduplication** for shared layouts (queue list optimization - downloads layout once for 100+ player links)
- **Edge Runtime Deployment** on Vercel (low latency globally)

**Bundle Optimization:**
- Target: <500KB initial JavaScript payload
- Dynamic imports for court officer dashboard features (lazy-load heavy components)
- Tree-shaking via Turbopack
- SVG icons (Lucide React) for smaller bundle vs image sprites

### Enhancement Roadmap

The existing MVP provides the foundation. Key additions for the comprehensive system:

**1. Immediate Dependencies (Week 1):**
- Install Zustand for global state management
- Install Vitest + Testing Library for test infrastructure
- Install react-qr-code for QR generation
- Install Supabase SDK for backend migration preparation

**2. Architecture Enhancements (Weeks 2-8):**
- **Matchmaking Engine Module** - Priority hierarchy algorithm (Friend groups > Time urgency > Skill > Gender > Variety > Building)
- **Session State Management Layer** - 5-hour timers, grace periods, cross-building tracking
- **Real-Time Sync Layer** - SSE for TV displays, Supabase real-time for dashboard
- **Multi-Building Coordination Logic** - Auto-routing to shortest queue across 3 buildings

**3. Migration Strategy (Weeks 4-9):**
- **Phase 1 (Weeks 4-5):** Add Supabase alongside localStorage (parallel systems running, data integrity validation)
- **Phase 2 (Weeks 6-7):** Soft launch with QR code check-in for new players, existing players grandfathered
- **Phase 3 (Week 8-9):** Full cutover - all players use QR codes, localStorage deprecated

### Installation Commands

**No starter template initialization needed** - project already exists.

**First implementation story should add these dependencies:**

```bash
# State management
npm install zustand

# Testing infrastructure
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths

# QR code generation
npm install react-qr-code

# Backend and real-time
npm install @supabase/supabase-js

# E2E testing (optional but recommended)
npm install -D @playwright/test
```

**Verify Node.js version:**
```bash
node --version  # Must be v20.9.0 or higher for Next.js 16
```

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- ✅ Data validation strategy: Zod for type-safe schema validation
- ✅ Authentication pattern: QR UUID for players, Supabase Auth for staff
- ✅ API architecture: Next.js API routes + Supabase direct client + SSE
- ✅ State management structure: Zustand with slices (queue, court, player, timer)
- ✅ Database migrations: Supabase CLI with version-controlled SQL migrations

**Important Decisions (Shape Architecture):**
- ✅ Caching strategy: Zustand persist + Supabase built-in caching
- ✅ Component architecture: Atomic UI + feature components
- ✅ Environment setup: Local/Staging/Production with Supabase projects
- ✅ CI/CD pipeline: GitHub Actions for automated testing and deployment
- ✅ Monitoring: Vercel Analytics + Sentry + Supabase logs

**Deferred Decisions (Post-MVP):**
- Advanced caching (Redis) - Current approach sufficient for 200+ daily players
- Custom analytics beyond Vercel/Supabase - Can add if business intelligence needs grow
- CDN for QR code images - Supabase storage sufficient for current scale

### Data Architecture

**Schema Validation: Zod**
- **Version:** Latest stable (will verify during implementation)
- **Rationale:** TypeScript-first validation with type inference, composable schemas for complex types (Player + Preferences + Session)
- **Installation:** `npm install zod`
- **Usage:**
  - Client-side form validation (player preferences, check-in)
  - Server-side API route validation (matchmaking requests, session data)
  - Type generation for Supabase schema integration

**Caching Strategy:**
- **Client-side:** Zustand persist middleware
  - Session timers (persist across refreshes)
  - Offline fallback state during connection drops
  - localStorage → Supabase migration phase parallel system
- **Server-side:** Supabase built-in PostgreSQL query cache
  - Player profile lookups (frequently accessed during matchmaking)
  - Court status queries
  - TTL-based invalidation via Supabase configuration
- **Rationale:** Avoids additional state library (React Query/SWR) since Zustand + Supabase real-time covers most use cases

**Database Migrations:**
- **Tool:** Supabase CLI migrations
- **Workflow:**
  1. Design schema in Supabase Studio (visual editor)
  2. Generate migration: `supabase migration new <name>`
  3. Version control SQL files in `/supabase/migrations/`
  4. Apply locally: `supabase db reset`
  5. Deploy to prod: Supabase dashboard or CLI
  6. Auto-generate TypeScript types: `supabase gen types typescript`
- **3-Phase Migration Strategy:**
  - **Phase 1 (Weeks 4-5):** Create Supabase schema, parallel system validation
  - **Phase 2 (Weeks 6-7):** One-time data transfer script (localStorage → Supabase)
  - **Phase 3 (Week 8-9):** Remove localStorage code, full cutover
- **Rationale:** Version control, rollback capability, team collaboration, automatic type safety

### Authentication & Security

**Player Authentication:**
- **Method:** QR code-based UUID authentication (no password)
- **Implementation:**
  - Generate cryptographically secure UUIDs for each player
  - Store in Supabase `players` table with unique constraint
  - QR scan validates UUID against database
  - Session tokens issued for active play sessions (5-hour window)
- **Security:** UUIDs are non-guessable, unique per player, permanent identifiers

**Staff Authentication:**
- **Method:** Supabase Auth with email/password
- **Roles:**
  - `court_officer` - Full dashboard access (12-court management)
  - `cashier` - Check-in interface access only
- **Implementation:**
  - Role stored in `user_metadata` or separate `staff_roles` table
  - Next.js middleware protects `/admin` and `/cashier` routes
  - Session tokens with 8-hour expiry (configurable)

**Authorization Pattern:**
- **Database-level:** Supabase Row Level Security (RLS) policies
  - Players can only read/update their own profiles
  - Court officers have full CRUD on all tables
  - Cashiers have limited write access (player check-in, queue insertion)
- **Application-level:** Next.js middleware for route protection
  - `/admin/*` requires `court_officer` role
  - `/cashier/*` requires `cashier` role
  - `/display/*` public (read-only, no auth)
- **API Security:**
  - Supabase RLS enforced on all client queries
  - Next.js API routes validate JWT tokens
  - Rate limiting on matchmaking endpoint (prevent abuse)

**QR Code Security:**
- UUIDs generated with `crypto.randomUUID()` (Node.js built-in)
- Unique constraint in database prevents duplicates
- QR codes printed/issued only at check-in counter (controlled distribution)

### API & Communication Patterns

**API Design:**

**Next.js API Routes** (`/app/api/*`):
- `POST /api/matchmaking/generate` - Generate match suggestions (priority hierarchy algorithm)
- `POST /api/sessions/start` - Start player session, begin 5-hour timer
- `PATCH /api/sessions/complete` - Complete session, log duration and score
- `POST /api/players/validate-qr` - Validate QR code on scan
- `GET /api/display/stream` - SSE endpoint for TV display real-time updates

**Supabase Direct Client** (from frontend):
- Player profiles: Direct queries with RLS protection
- Queue state: Real-time subscriptions (`supabase.from('queue').on('*', callback)`)
- Court status: Real-time subscriptions for dashboard
- Leverages Supabase's row-level security and real-time engine

**Server-Sent Events (SSE) for TV Displays:**
- Endpoint: `GET /api/display/stream`
- Keeps connection open, pushes updates on queue changes
- Payload: `{ type: 'queue_update' | 'court_status' | 'time_warning', data: ... }`
- Graceful degradation: Client falls back to 2-second polling if SSE drops

**Error Handling Standards:**
- HTTP status codes:
  - `400` - Client validation errors (Zod)
  - `401` - Unauthorized
  - `403` - Forbidden (role mismatch)
  - `500` - Server errors
- Response format:
  ```typescript
  {
    error: string,           // Human-readable message
    code: string,            // Machine-readable code (e.g., "INVALID_QR")
    details?: object         // Field-level validation errors from Zod
  }
  ```
- Zod validation errors include field paths for form highlighting
- Supabase errors sanitized (don't expose DB internals to client)

### Frontend Architecture

**Component Architecture:**

**Shared UI Components** (`/components/ui/`):
- Atomic design pattern: Button, Card, Input, Badge, Modal primitives
- Shadcn/ui approach (copy/paste components, not npm dependency)
- Tailwind CSS-based, fully customizable per interface needs
- Accessible (WCAG 2.1 Level A minimum)

**Feature Components** (`/components/`):
```
components/
├── court-grid/
│   ├── CourtCard.tsx          # Individual court status display
│   ├── CourtGrid.tsx          # 12-court grid layout
│   └── SessionTimer.tsx       # Live session duration counter
├── queue-list/
│   ├── QueueItem.tsx          # Single queue entry
│   ├── QueueList.tsx          # Virtual scrolling list (100+ players)
│   └── WaitTimeEstimate.tsx   # Dynamic wait time calculation
├── player-card/
│   ├── PlayerProfile.tsx      # Player info display
│   ├── PlayerAvatar.tsx       # Photo + skill badge
│   └── PreferenceEditor.tsx   # Match preference form
└── ui/                        # Shared primitives
```

**Zustand Store Structure:**
```typescript
store/
├── index.ts              // Root store combining slices
├── queueSlice.ts         // Queue state, actions (add, remove, reorder)
├── courtSlice.ts         // Court status, active sessions
├── playerSlice.ts        // Player profiles, preferences cache
└── timerSlice.ts         // Session timers, warnings (4:30, 4:55)
```

**State Management Pattern:**
- Each slice manages its domain (separation of concerns)
- Selectors prevent unnecessary re-renders
- Persist middleware on `timerSlice` for refresh resilience
- Actions dispatch to both Zustand store and Supabase (optimistic updates)

**Performance Optimizations:**
- **React Compiler:** Automatic memoization (zero config needed)
- **Lazy Loading:** Dashboard analytics loaded on-demand
  ```typescript
  const Analytics = lazy(() => import('./components/Analytics'))
  ```
- **Virtual Scrolling:** Queue lists with 100+ players (react-window or Tanstack Virtual)
- **Zustand Selectors:** Component subscribes only to needed slice
  ```typescript
  const queueCount = useStore(state => state.queue.length) // Only re-renders on count change
  ```
- **Bundle Optimization:** Target <500KB initial JS via code splitting

### Infrastructure & Deployment

**Environment Setup:**

**Supabase Projects:**
- **Local Development:**
  - Supabase CLI (`supabase start`)
  - Local PostgreSQL, Auth, Real-time
  - Seed data scripts for testing
- **Staging:**
  - Supabase cloud project (dedicated)
  - Connected to Vercel staging deployment
  - Test migrations before production
- **Production:**
  - Supabase cloud project (separate from staging)
  - Connected to Vercel production deployment
  - Live facility data

**Vercel Deployment Strategy:**
- **Preview Deployments:** Auto-deploy from feature branches (PR previews)
- **Staging:** Deploy from `develop` branch → staging Supabase
- **Production:** Deploy from `main` branch → production Supabase
- **Environment Variables:**
  ```bash
  # .env.local (development)
  NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
  NEXT_PUBLIC_SUPABASE_ANON_KEY=<local-anon-key>
  SUPABASE_SERVICE_ROLE_KEY=<local-service-role-key>

  # Vercel (staging/production)
  NEXT_PUBLIC_SUPABASE_URL=<staging/prod-url>
  NEXT_PUBLIC_SUPABASE_ANON_KEY=<staging/prod-anon-key>
  SUPABASE_SERVICE_ROLE_KEY=<staging/prod-service-role-key>
  ```

**CI/CD Pipeline:**

**GitHub Actions Workflow:**
```yaml
# .github/workflows/ci.yml
name: CI
on: [pull_request, push]
jobs:
  test:
    - Checkout code
    - Setup Node.js v20.9.0+
    - Install dependencies (npm ci)
    - Run ESLint (code quality)
    - Run TypeScript type checking (tsc --noEmit)
    - Run Vitest unit tests (vitest run)
    - Build Next.js (next build)
  e2e: # On staging only
    - Run Playwright E2E tests against staging deployment
```

**Pre-deployment Checks:**
- Linting passes (ESLint)
- Type checking passes (no TypeScript errors)
- Unit tests pass (Vitest)
- Build succeeds (Next.js compiles)
- E2E tests pass on staging (Playwright)

**Monitoring & Logging:**

**Vercel Analytics** (built-in):
- Web Vitals (LCP, FID, CLS)
- Real User Monitoring (page load times, 99.9% uptime tracking)
- Free tier included with Vercel deployment

**Sentry** (error tracking):
- Frontend error tracking (React error boundaries)
- API route error tracking (unhandled exceptions)
- Source maps for production debugging
- Free tier: 5,000 events/month (sufficient for MVP)
- Installation: `npm install @sentry/nextjs`

**Supabase Logs** (built-in):
- Database query logs (slow query detection)
- Auth logs (login attempts, failures)
- Real-time connection logs (SSE health monitoring)
- Access via Supabase Dashboard

**Alerting:**
- Vercel alerts on deployment failures
- Sentry alerts on error spike (>10 errors/min)
- Supabase alerts on database CPU >80%

### Decision Impact Analysis

**Implementation Sequence:**

1. **Week 1: Foundation Setup**
   - Install Zod, Zustand, react-qr-code, Supabase SDK
   - Configure Supabase projects (local, staging, production)
   - Set up GitHub Actions CI/CD pipeline
   - Configure Sentry error tracking

2. **Week 2: Database Schema**
   - Design Supabase schema (players, queue, courts, sessions)
   - Create initial migrations
   - Generate TypeScript types
   - Set up RLS policies

3. **Week 3: Authentication & Authorization**
   - Implement Supabase Auth for staff
   - QR code generation and validation
   - Next.js middleware for route protection
   - Role-based access control

4. **Week 4: API Layer**
   - Next.js API routes (matchmaking, sessions, QR validation)
   - SSE endpoint for TV displays
   - Error handling middleware
   - Zod validation schemas

5. **Week 5+: Feature Implementation**
   - Zustand store slices
   - Component development (court-grid, queue-list, player-card)
   - Real-time subscriptions
   - Performance optimizations

**Cross-Component Dependencies:**

- **Zod schemas** → Used in API routes, form validation, Supabase type generation
- **Supabase RLS policies** → Enforced by direct client queries and API routes
- **Zustand store** → Syncs with Supabase real-time, persists via middleware
- **SSE endpoint** → Triggered by Zustand store mutations, consumed by TV displays
- **QR UUIDs** → Generated at player registration, validated at check-in, tied to sessions
- **Session timers** → Stored in Zustand, persisted to Supabase, displayed on TV via SSE
