---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories', 'step-04-final-validation']
inputDocuments: ['prd.md', 'architecture.md']
workflowType: 'epics-and-stories'
project_name: 'pickleball-queue'
user_name: 'Emperor Boplax'
date: '2026-01-01'
lastStep: 4
totalEpics: 9
totalStories: 61
workflowComplete: true
completedDate: '2026-01-01'
validationStatus: 'passed'
requirementsCoverage: '50/50 (100%)'
---

# pickleball-queue - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for pickleball-queue, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

**Player Management & Check-In (FR1-FR7):**
- FR1: Players can register with a unique QR code for facility access
- FR2: Players can maintain a profile with name, photo, skill level (Beginner or Intermediate/Advanced), and gender
- FR3: Cashiers can scan a player's QR code to check them in for a 5-hour session
- FR4: Players can set match preferences at check-in (skill level, gender preference, match type)
- FR5: Players can edit their match preferences mid-session
- FR6: Cashiers can view returning player preferences from previous sessions
- FR7: Players can view their remaining session time

**Queue & Matchmaking (FR8-FR16):**
- FR8: Players can join the queue as individuals or in groups (2-4 players)
- FR9: Players can see their queue position and estimated wait time on TV displays
- FR10: The system can match players based on skill level preferences
- FR11: The system can match players based on gender preferences (men's, women's, mixed, random)
- FR12: The system can keep friend groups together when matching
- FR13: The system can avoid matching players who have played together in their last 3 sessions (variety enforcement)
- FR14: The system can prioritize time-urgent players (approaching 5-hour limit) in matchmaking
- FR15: The system can relax matchmaking constraints if no valid match exists after 2 queue cycles
- FR16: The system can prevent players from joining the queue while currently playing

**Court Management & Operations (FR17-FR24):**
- FR17: Court officers can view all 12 courts across 3 buildings in a unified dashboard
- FR18: Court officers can see real-time court status (available, occupied, session duration)
- FR19: Court officers can call the next matched group to a specific court
- FR20: Court officers can complete a session and log its duration
- FR21: Court officers can encode final scores for completed matches
- FR22: Court officers can manually override matchmaking suggestions
- FR23: Court officers can view auto-generated match suggestions with skill/gender/variety details
- FR24: The system can sync court status updates to TV displays within 2 seconds

**Session & Time Tracking (FR25-FR31):**
- FR25: The system can start a 5-hour session timer when a player checks in
- FR26: The system can track session time across all 3 buildings facility-wide
- FR27: The system can display a soft warning at the 4:30 mark on TV displays
- FR28: The system can alert court officers when players reach the 4:55 mark
- FR29: The system can allow players called to court near their 5-hour limit to finish their game (grace period up to 25 minutes)
- FR30: The system can prevent players from re-entering the queue after their 5-hour limit expires
- FR31: Players can register for a new 5-hour session at the counter after completing their current session

**Statistics & Analytics (FR32-FR38):**
- FR32: Players can view their personal stats (total games played, opponents faced, session history)
- FR33: Court officers can view court utilization reports across all 12 courts
- FR34: Court officers can view load variance across the 3 buildings
- FR35: Court officers can view peak hour analysis
- FR36: The system can track and display player behavior insights
- FR37: The system can log session durations with scores
- FR38: The system can maintain historical data for variety enforcement (last 3 sessions per player)

**Multi-Building Coordination (FR39-FR44):**
- FR39: The system can calculate estimated wait time per building based on queue depth
- FR40: The system can auto-route players to the building with the shortest queue
- FR41: The system can respect player physical location (no forced walking between buildings)
- FR42: The system can offer skill-appropriate matches at the current building within 10 minutes before routing elsewhere
- FR43: Court officers can manually assign players to specific buildings
- FR44: The system can balance queue load across 3 buildings within 10% variance

**Real-Time Synchronization (FR45-FR50):**
- FR45: TV displays can show real-time queue updates (position, wait time, next matches)
- FR46: TV displays can show time warnings for players approaching their limit
- FR47: The court officer dashboard can receive real-time court status updates
- FR48: The cashier interface can confirm queue entry instantly after check-in
- FR49: The system can gracefully degrade to polling if real-time connection fails
- FR50: The system can display connection status indicators when data is stale (>5 seconds old)

### NonFunctional Requirements

**Performance (NFR-P1 to NFR-P11):**
- NFR-P1: Court officer dashboard must load within 2 seconds on broadband
- NFR-P2: TV displays must load within 1 second
- NFR-P3: Cashier check-in interface must load within 1.5 seconds
- NFR-P4: All interfaces must achieve Time to Interactive (TTI) within 3 seconds
- NFR-P5: Queue updates must be reflected on TV displays within 1-2 seconds of action
- NFR-P6: SSE message processing must complete within 100ms
- NFR-P7: Court status changes must sync across all interfaces within 2 seconds
- NFR-P8: Matchmaking algorithm must generate match suggestions within 5 seconds
- NFR-P9: Supabase query responses must complete within 500ms for player lookups
- NFR-P10: Session logging must complete within 200ms
- NFR-P11: Queue position calculation must complete in real-time (< 100ms)

**Reliability & Availability (NFR-R1 to NFR-R9):**
- NFR-R1: System must maintain 99.9% uptime during facility operating hours
- NFR-R2: Planned maintenance must occur outside operating hours or with 48-hour notice
- NFR-R3: If SSE connection fails, system must gracefully degrade to 2-second polling within 5 seconds
- NFR-R4: TV displays must show "Connection Lost" indicator if data is stale (>5 seconds old)
- NFR-R5: Court officer dashboard must allow manual refresh if real-time sync fails
- NFR-R6: System must attempt automatic reconnection every 5 seconds during connection loss
- NFR-R7: localStorage → Supabase migration must achieve 100% data preservation with zero loss
- NFR-R8: System must maintain queue state consistency across all 3 buildings at all times
- NFR-R9: Session timers must remain accurate across browser refreshes and connection interruptions

**Security & Privacy (NFR-S1 to NFR-S8):**
- NFR-S1: Player profile data (name, photo, skill level, gender) must be stored securely in Supabase with access controls
- NFR-S2: QR codes must be unique and non-guessable
- NFR-S3: Court officer and cashier interfaces must require authentication
- NFR-S4: Session tokens must expire after 8 hours of inactivity
- NFR-S5: Only court officers can access the unified dashboard
- NFR-S6: Only cashiers can access check-in interface
- NFR-S7: TV displays must be read-only (no data modification capabilities)
- NFR-S8: Players can only view their own stats (not other players' data)

**Scalability (NFR-SC1 to NFR-SC5):**
- NFR-SC1: System must support 200+ concurrent daily players without performance degradation
- NFR-SC2: System must handle 12 courts across 3 buildings simultaneously
- NFR-SC3: Queue system must support up to 100 players in queue at any given time
- NFR-SC4: System architecture must support 2x player growth (400 daily players) with minimal infrastructure changes
- NFR-SC5: Database schema must support addition of new buildings/courts without major refactoring

**Usability (NFR-U1 to NFR-U6):**
- NFR-U1: TV displays must use minimum 24px body text and 48px+ headers for readability from 10+ feet
- NFR-U2: Court officer dashboard touch targets must be minimum 44×44px for tablet interaction
- NFR-U3: Cashier check-in flow must complete in under 45 seconds for new players, under 20 seconds for returning players
- NFR-U4: System must provide clear visual feedback for all user actions within 200ms
- NFR-U5: All error messages must be user-friendly and actionable (no technical jargon)
- NFR-U6: System must prevent invalid state transitions (e.g., queuing while playing)

**Browser Compatibility (NFR-B1 to NFR-B3):**
- NFR-B1: System must fully support latest 2 versions of Chrome, Firefox, Safari, and Edge (Chromium-based)
- NFR-B2: System must degrade gracefully in unsupported browsers with clear messaging
- NFR-B3: No support required for Internet Explorer or mobile phone browsers

**Accessibility (NFR-A1 to NFR-A4):**
- NFR-A1: System must meet WCAG 2.1 Level A compliance
- NFR-A2: All interactive elements must support keyboard navigation (Tab, Enter, Space)
- NFR-A3: Color contrast must be minimum 4.5:1 for normal text, 3:1 for large text
- NFR-A4: All icons and images must have appropriate alt text

### Additional Requirements

**From Architecture - No Starter Template Required:**
- **IMPORTANT:** This is a brownfield enhancement project. Existing MVP foundation: Next.js 16 with App Router, React 18+, TypeScript, Tailwind CSS 4, localStorage (migrating to Supabase)
- **No template initialization needed** - project already exists

**Dependencies to Install (First Implementation Story):**
- Zustand for state management (`npm install zustand`)
- Vitest + Testing Library for test infrastructure (`npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths`)
- react-qr-code for QR generation (`npm install react-qr-code`)
- Supabase SDK for backend and real-time (`npm install @supabase/supabase-js`)
- Playwright for E2E testing (optional but recommended: `npm install -D @playwright/test`)

**Database & Migrations:**
- Supabase CLI migrations with version-controlled SQL files in `/supabase/migrations/`
- 3-phase migration strategy: Phase 1 (parallel systems validation), Phase 2 (one-time data transfer), Phase 3 (full cutover)
- Auto-generate TypeScript types from Supabase schema (`supabase gen types typescript`)
- Supabase Row Level Security (RLS) policies for authorization

**Authentication & Authorization:**
- QR code-based UUID authentication for players (crypto.randomUUID(), stored in Supabase `players` table)
- Supabase Auth with email/password for staff (court_officer and cashier roles)
- Next.js middleware for route protection (`/admin/*` requires court_officer, `/cashier/*` requires cashier role)
- Session tokens with 8-hour expiry

**API Architecture:**
- Next.js API routes: `/api/matchmaking/generate`, `/api/sessions/start`, `/api/sessions/complete`, `/api/players/validate-qr`, `/api/display/stream` (SSE endpoint)
- Supabase direct client from frontend with RLS protection
- Server-Sent Events (SSE) for TV display real-time updates
- Error handling with HTTP status codes (400, 401, 403, 500) and standardized response format

**State Management Structure:**
- Zustand store with domain slices: `queueSlice`, `courtSlice`, `playerSlice`, `timerSlice`
- Persist middleware on `timerSlice` for refresh resilience
- Optimistic updates pattern (dispatch to both Zustand and Supabase)

**Data Validation:**
- Zod for schema validation (`npm install zod`)
- Client-side form validation and server-side API route validation
- Type generation for Supabase schema integration

**Caching Strategy:**
- Client-side: Zustand persist middleware (session timers, offline fallback)
- Server-side: Supabase built-in PostgreSQL query cache

**Environment Setup:**
- Local development: Supabase CLI (`supabase start`)
- Staging: Supabase cloud project + Vercel staging deployment
- Production: Separate Supabase cloud project + Vercel production deployment
- Environment variables for NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

**CI/CD Pipeline:**
- GitHub Actions workflow (`.github/workflows/ci.yml`)
- Pre-deployment checks: ESLint, TypeScript type checking, Vitest unit tests, Next.js build, Playwright E2E tests
- Auto-deploy from feature branches (PR previews), staging from `develop` branch, production from `main` branch

**Monitoring & Logging:**
- Vercel Analytics for Web Vitals and Real User Monitoring
- Sentry for error tracking (frontend + API routes) - `npm install @sentry/nextjs`
- Supabase logs for database queries, auth, and real-time connections
- Alerting: Vercel deployment failures, Sentry error spikes, Supabase CPU alerts

**Code Organization:**
- App Router structure: `/app/admin/`, `/app/display/`, `/app/cashier/`, `/app/api/`
- Library modules: `/lib/matchmaking/`, `/lib/queue/`, `/lib/session/`, `/lib/supabase/`, `/lib/utils/`
- Components: `/components/court-grid/`, `/components/queue-list/`, `/components/player-card/`, `/components/ui/`
- Hooks: `/hooks/useQueue.ts`, `/hooks/useRealtime.ts`, `/hooks/useSessionTimer.ts`, `/hooks/useMatchmaking.ts`
- Types: `/types/player.ts`, `/types/queue.ts`, `/types/court.ts`, `/types/session.ts`
- Store: `/store/index.ts` (Zustand store configuration)

**Performance Optimizations:**
- React Compiler for automatic memoization
- Lazy loading dashboard analytics (`const Analytics = lazy(() => import('./components/Analytics'))`)
- Virtual scrolling for queue lists with 100+ players (react-window or Tanstack Virtual)
- Zustand selectors to prevent unnecessary re-renders
- Bundle optimization target: <500KB initial JS payload
- Dynamic imports for heavy components

**Testing Framework:**
- Vitest for unit/integration tests (4× faster than Jest)
- Playwright for E2E tests (async Server Components and real-time features)
- Test data seeding scripts for local development

**Implementation Sequence (from Architecture):**
1. Week 1: Foundation setup (dependencies, Supabase projects, CI/CD, Sentry)
2. Week 2: Database schema (migrations, RLS policies, TypeScript types)
3. Week 3: Authentication & authorization (Supabase Auth, QR validation, middleware)
4. Week 4: API layer (Next.js routes, SSE endpoint, error handling, Zod schemas)
5. Week 5+: Feature implementation (Zustand slices, components, real-time subscriptions)

### FR Coverage Map

**Epic 1: Player Registration & Authentication**
- FR1: Players can register with a unique QR code for facility access
- FR2: Players can maintain a profile with name, photo, skill level, and gender

**Epic 2: Player Check-In & Session Management**
- FR3: Cashiers can scan a player's QR code to check them in for a 5-hour session
- FR4: Players can set match preferences at check-in (skill level, gender preference, match type)
- FR6: Cashiers can view returning player preferences from previous sessions
- FR7: Players can view their remaining session time
- FR25: The system can start a 5-hour session timer when a player checks in

**Epic 3: Queue System & Real-Time TV Displays**
- FR8: Players can join the queue as individuals or in groups (2-4 players)
- FR9: Players can see their queue position and estimated wait time on TV displays
- FR16: The system can prevent players from joining the queue while currently playing
- FR45: TV displays can show real-time queue updates (position, wait time, next matches)
- FR48: The cashier interface can confirm queue entry instantly after check-in
- FR49: The system can gracefully degrade to polling if real-time connection fails
- FR50: The system can display connection status indicators when data is stale (>5 seconds old)

**Epic 4: Court Officer Dashboard & Court Management**
- FR17: Court officers can view all 12 courts across 3 buildings in a unified dashboard
- FR18: Court officers can see real-time court status (available, occupied, session duration)
- FR19: Court officers can call the next matched group to a specific court
- FR20: Court officers can complete a session and log its duration
- FR22: Court officers can manually override matchmaking suggestions
- FR24: The system can sync court status updates to TV displays within 2 seconds
- FR47: The court officer dashboard can receive real-time court status updates

**Epic 5: Intelligent Matchmaking Engine**
- FR10: The system can match players based on skill level preferences
- FR11: The system can match players based on gender preferences (men's, women's, mixed, random)
- FR12: The system can keep friend groups together when matching
- FR13: The system can avoid matching players who have played together in their last 3 sessions (variety enforcement)
- FR14: The system can prioritize time-urgent players (approaching 5-hour limit) in matchmaking
- FR15: The system can relax matchmaking constraints if no valid match exists after 2 queue cycles
- FR23: Court officers can view auto-generated match suggestions with skill/gender/variety details

**Epic 6: Multi-Building Queue Coordination**
- FR39: The system can calculate estimated wait time per building based on queue depth
- FR40: The system can auto-route players to the building with the shortest queue
- FR41: The system can respect player physical location (no forced walking between buildings)
- FR42: The system can offer skill-appropriate matches at the current building within 10 minutes before routing elsewhere
- FR43: Court officers can manually assign players to specific buildings
- FR44: The system can balance queue load across 3 buildings within 10% variance

**Epic 7: Time Limit Enforcement & Warnings**
- FR5: Players can edit their match preferences mid-session
- FR26: The system can track session time across all 3 buildings facility-wide
- FR27: The system can display a soft warning at the 4:30 mark on TV displays
- FR28: The system can alert court officers when players reach the 4:55 mark
- FR29: The system can allow players called to court near their 5-hour limit to finish their game (grace period up to 25 minutes)
- FR30: The system can prevent players from re-entering the queue after their 5-hour limit expires
- FR31: Players can register for a new 5-hour session at the counter after completing their current session
- FR46: TV displays can show time warnings for players approaching their limit

**Epic 8: Score Tracking & Player Statistics**
- FR21: Court officers can encode final scores for completed matches
- FR32: Players can view their personal stats (total games played, opponents faced, session history)
- FR37: The system can log session durations with scores
- FR38: The system can maintain historical data for variety enforcement (last 3 sessions per player)

**Epic 9: Analytics & Operational Reporting**
- FR33: Court officers can view court utilization reports across all 12 courts
- FR34: Court officers can view load variance across the 3 buildings
- FR35: Court officers can view peak hour analysis
- FR36: The system can track and display player behavior insights

## Epic List

### Epic 1: Player Registration & Authentication
Players can register with QR codes and maintain profiles for facility access.

**FRs covered:** FR1, FR2

### Epic 2: Player Check-In & Session Management
Players can check in at the counter and start timed 5-hour sessions.

**FRs covered:** FR3, FR4, FR6, FR7, FR25

### Epic 3: Queue System & Real-Time TV Displays
Players can join the queue and see their position on large TV displays in real-time.

**FRs covered:** FR8, FR9, FR16, FR45, FR48, FR49, FR50

### Epic 4: Court Officer Dashboard & Court Management
Court officers can manage all 12 courts across 3 buildings from a unified dashboard.

**FRs covered:** FR17, FR18, FR19, FR20, FR22, FR24, FR47

### Epic 5: Intelligent Matchmaking Engine
System automatically matches players based on skill, gender preferences, friend groups, variety, and time urgency.

**FRs covered:** FR10, FR11, FR12, FR13, FR14, FR15, FR23

### Epic 6: Multi-Building Queue Coordination
System intelligently distributes players across 3 buildings to minimize wait times.

**FRs covered:** FR39, FR40, FR41, FR42, FR43, FR44

### Epic 7: Time Limit Enforcement & Warnings
5-hour facility-wide time limits enforced with warnings and grace periods.

**FRs covered:** FR5, FR26, FR27, FR28, FR29, FR30, FR31, FR46

### Epic 8: Score Tracking & Player Statistics
Scores are recorded and players can view their personal statistics.

**FRs covered:** FR21, FR32, FR37, FR38

### Epic 9: Analytics & Operational Reporting
Court officers access operational insights and facility utilization reports.

**FRs covered:** FR33, FR34, FR35, FR36

## Epic 1: Player Registration & Authentication

**Goal:** Players can register with QR codes and maintain profiles for facility access

**FRs Covered:** FR1, FR2

### Story 1.1: Project Foundation & Supabase Setup

As a developer,
I want to set up the Supabase project infrastructure and install required dependencies,
So that the application has a secure backend foundation for player data.

**Acceptance Criteria:**

**Given** the project repository exists
**When** I run the dependency installation commands
**Then** the following packages are installed: `@supabase/supabase-js`, `react-qr-code`, `zustand`, `zod`, `vitest`, `@vitejs/plugin-react`, `jsdom`, `@testing-library/react`, `@testing-library/dom`, `vite-tsconfig-paths`
**And** Supabase CLI is configured for local development
**And** three Supabase projects are created (local, staging, production)
**And** environment variables are configured (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)
**And** Supabase client configuration file is created at `/lib/supabase/client.ts`
**And** Node.js version is v20.9.0 or higher

### Story 1.2: Player Database Schema & Migrations

As a developer,
I want to create the players table schema with RLS policies,
So that player profile data can be stored securely.

**Acceptance Criteria:**

**Given** Supabase is configured
**When** I create a new migration file
**Then** a `players` table is created with columns: `id` (UUID primary key), `qr_uuid` (UUID unique not null), `name` (text not null), `photo_url` (text), `skill_level` (enum: 'beginner', 'intermediate_advanced'), `gender` (enum: 'male', 'female', 'other'), `created_at` (timestamp), `updated_at` (timestamp)
**And** a unique constraint exists on `qr_uuid`
**And** RLS is enabled on the `players` table
**And** RLS policy allows players to read/update only their own profiles
**And** TypeScript types are auto-generated from schema using `supabase gen types typescript`
**And** the migration applies successfully to local database

### Story 1.3: Player Registration & QR Code Generation

As a facility administrator,
I want to register new players and generate unique QR codes for them,
So that each player receives a permanent identifier for facility access.

**Acceptance Criteria:**

**Given** I am on the player registration page
**When** I enter player details (name, skill level, gender) and optionally upload a photo
**Then** a cryptographically secure UUID is generated using `crypto.randomUUID()`
**And** the player record is inserted into the `players` table with the generated `qr_uuid`
**And** a QR code is generated using `react-qr-code` containing the `qr_uuid`
**And** the QR code is displayed on screen for printing/saving
**And** the system prevents duplicate QR codes (enforced by unique constraint)
**And** an error message is shown if registration fails with actionable guidance

### Story 1.4: Player Profile Display & Validation

As a player,
I want to view my profile information,
So that I can verify my details are correct.

**Acceptance Criteria:**

**Given** I have a registered player account
**When** I navigate to my profile page (authenticated via QR UUID)
**Then** I see my name, photo, skill level, and gender displayed
**And** the data is fetched from Supabase within 500ms (NFR-P9)
**And** only my own profile data is accessible (RLS policy enforced)
**And** if the photo is missing, a default placeholder is shown
**And** if profile data cannot be loaded, a user-friendly error message is displayed

---

## Epic 2: Player Check-In & Session Management

**Goal:** Players can check in at the counter and start timed 5-hour sessions

**FRs Covered:** FR3, FR4, FR6, FR7, FR25

### Story 2.1: Session Database Schema

As a developer,
I want to create the sessions table schema,
So that player sessions can be tracked with timestamps.

**Acceptance Criteria:**

**Given** Supabase is configured
**When** I create a new migration file
**Then** a `sessions` table is created with columns: `id` (UUID primary key), `player_id` (UUID foreign key to players), `start_time` (timestamp not null), `end_time` (timestamp), `duration_minutes` (integer), `building` (enum: 'building_a', 'building_b', 'building_c'), `status` (enum: 'active', 'completed', 'expired'), `created_at` (timestamp)
**And** RLS policies allow cashiers to insert sessions and court officers to update them
**And** TypeScript types are auto-generated from schema

### Story 2.2: Player Preferences Database Schema

As a developer,
I want to create the player_preferences table schema,
So that match preferences can be stored and retrieved.

**Acceptance Criteria:**

**Given** Supabase is configured
**When** I create a new migration file
**Then** a `player_preferences` table is created with columns: `id` (UUID primary key), `player_id` (UUID foreign key to players), `skill_level_pref` (enum: 'beginner', 'intermediate_advanced'), `gender_pref` (enum: 'mens', 'womens', 'mixed', 'random'), `match_type` (enum: 'solo', 'group'), `updated_at` (timestamp)
**And** RLS policies allow players to read/update their own preferences
**And** TypeScript types are auto-generated from schema

### Story 2.3: Cashier Check-In Interface

As a cashier,
I want to scan a player's QR code to check them in,
So that their 5-hour session can start.

**Acceptance Criteria:**

**Given** I am on the cashier check-in interface at `/cashier`
**When** I scan a player's QR code (UUID)
**Then** the player's profile is fetched from Supabase and displayed (name, photo, skill level)
**And** if the QR code is invalid, an error message is shown
**And** if the player is already in an active session, a warning is displayed
**And** the interface loads within 1.5 seconds (NFR-P3)
**And** the cashier interface requires authentication (Supabase Auth with cashier role)

### Story 2.4: Match Preference Setting at Check-In

As a cashier,
I want to help players set their match preferences during check-in,
So that the matchmaking system knows their preferences.

**Acceptance Criteria:**

**Given** a player's QR code has been scanned successfully
**When** the preference setting form is displayed
**Then** I can select skill level preference (Beginner or Intermediate/Advanced)
**And** I can select gender preference (Men's, Women's, Mixed, Random)
**And** I can select match type (Solo or Group 2-4 players)
**And** if the player has previous preferences, they are auto-loaded from `player_preferences` table (FR6)
**And** the preferences are validated using Zod schema before saving
**And** the preferences are saved to the `player_preferences` table
**And** the form submission completes within 200ms (NFR-P10)

### Story 2.5: Session Start & Timer Initialization

As a cashier,
I want to start a player's 5-hour session after check-in,
So that their facility time window begins.

**Acceptance Criteria:**

**Given** player preferences have been set
**When** I click "Start Session"
**Then** a new session record is created in the `sessions` table with `start_time` set to current timestamp and `status` = 'active'
**And** the session timer is initialized in Zustand `timerSlice` store
**And** the player is notified "Session started - 5 hours remaining"
**And** the session persists across browser refreshes (Zustand persist middleware)
**And** the cashier receives instant confirmation (FR48)
**And** session logging completes within 200ms (NFR-P10)

### Story 2.6: Remaining Session Time Display

As a player,
I want to view my remaining session time,
So that I know how much time I have left to play.

**Acceptance Criteria:**

**Given** I have an active session
**When** I view the TV display or check with the cashier
**Then** I see my remaining time displayed in HH:MM format
**And** the timer counts down in real-time
**And** the timer remains accurate across browser refreshes (NFR-R9)
**And** the time display updates every second
**And** if the session data cannot be fetched, a "Timer unavailable" message is shown

---

## Epic 3: Queue System & Real-Time TV Displays

**Goal:** Players can join the queue and see their position on large TV displays in real-time

**FRs Covered:** FR8, FR9, FR16, FR45, FR48, FR49, FR50

### Story 3.1: Queue Database Schema

As a developer,
I want to create the queue table schema,
So that queue entries can be tracked with positions and timestamps.

**Acceptance Criteria:**

**Given** Supabase is configured
**When** I create a new migration file
**Then** a `queue` table is created with columns: `id` (UUID primary key), `player_id` (UUID foreign key to players), `group_id` (UUID nullable), `position` (integer not null), `building` (enum: 'building_a', 'building_b', 'building_c'), `status` (enum: 'waiting', 'called', 'playing'), `joined_at` (timestamp not null), `estimated_wait_minutes` (integer)
**And** RLS policies allow cashiers to insert queue entries and court officers to update them
**And** an index exists on `position` and `building` for fast lookups
**And** TypeScript types are auto-generated from schema

### Story 3.2: Solo Queue Entry

As a cashier,
I want to add a player to the queue as an individual,
So that they can wait for a match.

**Acceptance Criteria:**

**Given** a player has completed check-in and set preferences
**When** I click "Add to Queue" with match type = Solo
**Then** a queue entry is created in the `queue` table with `player_id`, `group_id` = null, `status` = 'waiting'
**And** the queue position is automatically calculated based on existing entries
**And** the system prevents adding the player if they have `status` = 'playing' (FR16)
**And** the estimated wait time is calculated based on queue depth and average session duration
**And** the queue entry is added to Zustand `queueSlice` store
**And** the operation completes within 100ms (NFR-P11)
**And** a confirmation message is displayed to the cashier

### Story 3.3: Group Queue Entry

As a cashier,
I want to add 2-4 players to the queue as a group,
So that friends can play together.

**Acceptance Criteria:**

**Given** 2-4 players have completed check-in
**When** I select "Group Queue" and select the players
**Then** a unique `group_id` (UUID) is generated for the group
**And** queue entries are created for each player with the same `group_id`
**And** all group members have the same queue position
**And** the system validates that all players have compatible preferences (or shows a warning)
**And** the system prevents adding any player who has `status` = 'playing' (FR16)
**And** a confirmation message is displayed showing group composition

### Story 3.4: Queue State Management with Zustand

As a developer,
I want to implement Zustand queue state management,
So that queue data is available across all interfaces.

**Acceptance Criteria:**

**Given** Zustand is installed
**When** I create the `queueSlice` in `/store/queueSlice.ts`
**Then** the slice includes state: `queueEntries` (array), `loading` (boolean), `error` (string | null)
**And** the slice includes actions: `addToQueue`, `removeFromQueue`, `updatePosition`, `setQueueEntries`
**And** the slice subscribes to Supabase real-time updates on the `queue` table
**And** optimistic updates are implemented (update local state before server confirmation)
**And** Redux DevTools integration is enabled for debugging
**And** the store is properly typed with TypeScript

### Story 3.5: TV Display Interface & Real-Time Queue Updates

As a player,
I want to see the queue on a TV display,
So that I know my position and estimated wait time.

**Acceptance Criteria:**

**Given** I am waiting in the queue
**When** I look at the TV display at `/display`
**Then** I see a list of queue positions with player names and estimated wait times
**And** my entry is highlighted or marked clearly
**And** the display uses minimum 24px body text and 48px+ headers (NFR-U1)
**And** the display is optimized for 1920×1080 to 4K resolution
**And** queue updates are reflected within 1-2 seconds of changes (NFR-P5)
**And** the display has high contrast for readability from 10+ feet
**And** the TV display is read-only with no interaction (NFR-S7)

### Story 3.6: Server-Sent Events (SSE) for TV Displays

As a developer,
I want to implement SSE for real-time TV display updates,
So that queue changes push to displays instantly.

**Acceptance Criteria:**

**Given** the TV display interface is loaded
**When** queue changes occur (new entry, position update, player called)
**Then** an SSE connection is established to `/api/display/stream`
**And** the server pushes updates with event types: `queue_update`, `court_status`, `time_warning`
**And** the TV display processes SSE messages within 100ms (NFR-P6)
**And** if the SSE connection drops, the display attempts reconnection every 5 seconds (NFR-R6)
**And** the display gracefully degrades to 2-second polling if SSE fails (NFR-R3)
**And** the connection keeps alive with periodic heartbeat messages

### Story 3.7: Connection Status & Graceful Degradation

As a player,
I want to know if the TV display data is stale,
So that I can trust the information shown.

**Acceptance Criteria:**

**Given** the TV display is active
**When** the SSE connection is healthy
**Then** a green indicator shows "Connected" in the corner
**And** when the connection is lost for >5 seconds, a red "Connection Lost" indicator is shown (NFR-R4)
**And** when data is >5 seconds old, a yellow "Stale Data" indicator is shown (FR50)
**And** the display automatically falls back to 2-second polling within 5 seconds of SSE failure (NFR-R3, FR49)
**And** when the connection is restored, the indicator returns to green
**And** the polling fallback fetches queue data from Supabase directly

---

## Epic 4: Court Officer Dashboard & Court Management

**Goal:** Court officers can manage all 12 courts across 3 buildings from a unified dashboard

**FRs Covered:** FR17, FR18, FR19, FR20, FR22, FR24, FR47

### Story 4.1: Court Database Schema

As a developer,
I want to create the courts table schema,
So that court status can be tracked.

**Acceptance Criteria:**

**Given** Supabase is configured
**When** I create a new migration file
**Then** a `courts` table is created with columns: `id` (UUID primary key), `court_number` (integer 1-12 not null), `building` (enum: 'building_a', 'building_b', 'building_c'), `status` (enum: 'available', 'occupied'), `current_session_id` (UUID foreign key to sessions nullable), `session_start_time` (timestamp nullable)
**And** a unique constraint exists on (`court_number`, `building`)
**And** RLS policies allow court officers full CRUD access
**And** 12 court records are seeded (4 per building: Building A courts 1-4, Building B courts 5-8, Building C courts 9-12)
**And** TypeScript types are auto-generated from schema

### Story 4.2: Staff Authentication & Authorization

As a developer,
I want to implement Supabase Auth for staff with role-based access,
So that only authorized court officers and cashiers can access their interfaces.

**Acceptance Criteria:**

**Given** Supabase Auth is configured
**When** I create staff users with email/password
**Then** user roles are stored in `user_metadata` or a separate `staff_roles` table with columns: `user_id` (UUID foreign key to auth.users), `role` (enum: 'court_officer', 'cashier')
**And** Next.js middleware is created at `/middleware.ts` to protect routes
**And** `/admin/*` routes require `court_officer` role (NFR-S5)
**And** `/cashier/*` routes require `cashier` role (NFR-S6)
**And** unauthorized access redirects to login page
**And** session tokens expire after 8 hours of inactivity (NFR-S4)

### Story 4.3: Court Officer Dashboard Layout

As a court officer,
I want to view all 12 courts in a unified dashboard,
So that I can manage the entire facility from one screen.

**Acceptance Criteria:**

**Given** I am authenticated as a court officer
**When** I navigate to `/admin/dashboard`
**Then** I see a grid layout displaying all 12 courts organized by building
**And** each court card shows: court number, status (available/occupied), current session duration if occupied
**And** the dashboard is optimized for tablet (1024×768 to 1920×1080) in landscape orientation
**And** touch targets are minimum 44×44px (NFR-U2)
**And** the dashboard loads within 2 seconds (NFR-P1)
**And** the dashboard achieves Time to Interactive within 3 seconds (NFR-P4)

### Story 4.4: Court State Management with Zustand

As a developer,
I want to implement Zustand court state management,
So that court status is synchronized across the dashboard.

**Acceptance Criteria:**

**Given** Zustand is installed
**When** I create the `courtSlice` in `/store/courtSlice.ts`
**Then** the slice includes state: `courts` (array of court objects), `loading` (boolean), `error` (string | null)
**And** the slice includes actions: `setCourts`, `updateCourtStatus`, `assignSession`, `completeSession`
**And** the slice subscribes to Supabase real-time updates on the `courts` table
**And** court status changes sync within 2 seconds (NFR-P7, FR47)
**And** the store is properly typed with TypeScript

### Story 4.5: Real-Time Court Status Display

As a court officer,
I want to see court status updates in real-time,
So that I always have current information.

**Acceptance Criteria:**

**Given** I am viewing the dashboard
**When** a court status changes (session starts or ends)
**Then** the court card updates within 2 seconds without manual refresh (FR47)
**And** available courts are shown with a green indicator
**And** occupied courts are shown with a red indicator and live session timer
**And** the session timer updates every second
**And** if real-time connection fails, a manual refresh button is available (NFR-R5)
**And** Supabase real-time subscriptions are used for updates

### Story 4.6: Call Next Group to Court

As a court officer,
I want to call the next matched group to a specific court,
So that players can start their game.

**Acceptance Criteria:**

**Given** a court is available and players are in the queue
**When** I click "Call Next" on a court card
**Then** the system fetches the next queue entry (lowest position for that building)
**And** the queue entry status is updated to 'called'
**And** the court status is updated to 'occupied' with `current_session_id`
**And** the session start time is recorded
**And** the TV display shows "CALLED TO COURT X: [Player Names]"
**And** the queue positions are recalculated for remaining entries
**And** the court card immediately reflects the new status
**And** if no players are in queue, a message "No players waiting" is shown

### Story 4.7: Complete Session & Log Duration

As a court officer,
I want to mark a session as complete,
So that the court becomes available and session duration is logged.

**Acceptance Criteria:**

**Given** a court is occupied with an active session
**When** I click "Complete Session" on the court card
**Then** the session end time is recorded in the `sessions` table
**And** the session duration is calculated (end_time - start_time) in minutes
**And** the session status is updated to 'completed'
**And** the court status is updated to 'available' with `current_session_id` = null
**And** the queue entry status is updated to remove players from queue
**And** session logging completes within 200ms (NFR-P10)
**And** the court card immediately shows as available
**And** the TV display updates to remove the players from "Currently Playing"

### Story 4.8: Manual Matchmaking Override

As a court officer,
I want to manually assign specific players to a court,
So that I can handle exceptions and special requests.

**Acceptance Criteria:**

**Given** I am viewing the dashboard with queue entries visible
**When** I click "Manual Assign" on a court card
**Then** a modal opens showing all players currently in the queue
**And** I can select 2-4 players to assign to the court
**And** the selected players are assigned to the court bypassing automatic matchmaking (FR22)
**And** the queue positions are updated for remaining players
**And** a confirmation message is shown with the manual assignment details
**And** the TV display updates to show the called players

### Story 4.9: Court Status Sync to TV Displays

As a player,
I want to see current court status on TV displays,
So that I know which courts are available.

**Acceptance Criteria:**

**Given** I am viewing the TV display
**When** court status changes (session starts or completes)
**Then** the TV display shows a court grid with status indicators
**And** available courts are shown in green
**And** occupied courts are shown in red with session duration
**And** court status updates sync within 2 seconds of changes (FR24)
**And** the display uses SSE for real-time updates (same connection as queue updates)
**And** the display is readable from 10+ feet away

---

## Epic 5: Intelligent Matchmaking Engine

**Goal:** System automatically matches players based on skill, gender preferences, friend groups, variety, and time urgency

**FRs Covered:** FR10, FR11, FR12, FR13, FR14, FR15, FR23

### Story 5.1: Match History Database Schema

As a developer,
I want to create the match_history table schema,
So that player matchups can be tracked for variety enforcement.

**Acceptance Criteria:**

**Given** Supabase is configured
**When** I create a new migration file
**Then** a `match_history` table is created with columns: `id` (UUID primary key), `session_id` (UUID foreign key to sessions), `player_id` (UUID foreign key to players), `opponent_ids` (UUID array - other players in the match), `match_date` (timestamp not null)
**And** an index exists on `player_id` and `match_date` for fast variety lookups
**And** RLS policies allow court officers to insert match history
**And** TypeScript types are auto-generated from schema

### Story 5.2: Matchmaking Algorithm - Priority Hierarchy

As a developer,
I want to implement the matchmaking priority hierarchy algorithm,
So that matches are generated following the correct priority order.

**Acceptance Criteria:**

**Given** players are waiting in the queue
**When** the matchmaking algorithm runs at `/lib/matchmaking/algorithm.ts`
**Then** the algorithm follows this priority order: 1) Friend Groups (highest), 2) Time Urgency, 3) Skill Level, 4) Gender Preference, 5) Variety, 6) Building Assignment
**And** the algorithm returns match suggestions with details (players, court, building, priority factors)
**And** the algorithm completes within 5 seconds (NFR-P8)
**And** the algorithm is properly typed with TypeScript
**And** unit tests validate the priority hierarchy using Vitest

### Story 5.3: Friend Group Matching

As a player,
I want to stay with my friends when we queue as a group,
So that we can play together.

**Acceptance Criteria:**

**Given** 2-4 players have joined the queue with the same `group_id`
**When** the matchmaking algorithm runs
**Then** all players with the same `group_id` are kept together in one match (FR12)
**And** friend groups receive highest priority in matching (priority level 1)
**And** if a group of 2 is found, the algorithm fills remaining 2 slots with compatible solo queue players
**And** if a group of 3 is found, the algorithm fills remaining 1 slot with a compatible solo queue player
**And** if a group of 4 is found, they are matched immediately
**And** the match suggestion includes all group members

### Story 5.4: Skill-Based Matching

As a player,
I want to be matched with players of similar skill level,
So that games are competitive and enjoyable.

**Acceptance Criteria:**

**Given** players have set skill level preferences (Beginner or Intermediate/Advanced)
**When** the matchmaking algorithm runs
**Then** the algorithm attempts to match players within the same skill tier (FR10)
**And** skill matching has priority level 3 (after friend groups and time urgency)
**And** if no same-skill match is available after 2 queue cycles (~20 min), the constraint can be relaxed (FR15)
**And** the match suggestion displays skill levels of all players
**And** court officers see skill compatibility in the match details (FR23)

### Story 5.5: Gender Preference Matching

As a player,
I want my gender preference to be respected,
So that I can play in my preferred match type.

**Acceptance Criteria:**

**Given** players have set gender preferences (Men's, Women's, Mixed, Random)
**When** the matchmaking algorithm runs
**Then** the algorithm respects gender preferences when creating matches (FR11)
**And** gender matching has priority level 4 (after skill)
**And** "Random" preference matches with any gender composition
**And** "Mixed" preference requires at least one male and one female player
**And** "Men's" preference requires all male players
**And** "Women's" preference requires all female players
**And** if no gender-compatible match exists after 2 queue cycles, the constraint can be relaxed (FR15)
**And** the match suggestion displays gender composition

### Story 5.6: Variety Enforcement - Avoid Recent Opponents

As a player,
I want to avoid playing with the same opponents repeatedly,
So that I have variety in my matches.

**Acceptance Criteria:**

**Given** match history exists in the `match_history` table
**When** the matchmaking algorithm runs
**Then** the algorithm queries each player's last 3 matches from `match_history`
**And** the algorithm avoids pairing players who played together in their last 3 sessions (FR13)
**And** variety enforcement has priority level 5 (after gender)
**And** if no variety-compliant match exists after 2 queue cycles, this constraint is relaxed first (FR15)
**And** the match suggestion indicates if players have played together recently
**And** historical data is maintained for at least the last 3 sessions per player (FR38)

### Story 5.7: Time-Urgency Priority

As a player,
I want priority matching when I'm approaching my 5-hour limit,
So that I don't miss my chance to play.

**Acceptance Criteria:**

**Given** players have active sessions with remaining time
**When** the matchmaking algorithm runs
**Then** players with <30 minutes remaining in their 5-hour window receive elevated priority (FR14)
**And** time urgency has priority level 2 (second only to friend groups)
**And** the algorithm sorts time-urgent players by least remaining time first
**And** if multiple time-urgent players exist, they are grouped together when possible
**And** the match suggestion indicates which players are time-urgent
**And** court officers see time-urgency warnings in match details (FR23)

### Story 5.8: Constraint Relaxation Logic

As a developer,
I want to implement constraint relaxation after 2 queue cycles,
So that players aren't stuck waiting indefinitely.

**Acceptance Criteria:**

**Given** a player has been in the queue for 2 complete queue cycles (~20 minutes)
**When** no valid match exists following all constraints
**Then** constraints are relaxed in reverse priority order: 1) Variety first, 2) Gender second, 3) Skill last (FR15)
**And** friend groups are never broken (always highest priority)
**And** the system logs which constraints were relaxed for the match
**And** court officers see a notification "Constraints relaxed for: [Player Name]"
**And** the match suggestion indicates relaxed constraints
**And** the algorithm re-evaluates after each relaxation step

### Story 5.9: Match Suggestion API & Display

As a court officer,
I want to see auto-generated match suggestions with details,
So that I can call players to courts efficiently.

**Acceptance Criteria:**

**Given** players are waiting in the queue and a court is available
**When** I view the dashboard
**Then** match suggestions are displayed with player names, skill levels, gender composition, and variety status (FR23)
**And** the suggestions indicate which priority factors were applied
**And** the suggestions show estimated compatibility score
**And** I can click "Call to Court" to assign the suggested match
**And** I can click "Skip" to request an alternative match
**And** the `/api/matchmaking/generate` endpoint is created using Next.js API routes
**And** the endpoint validates requests with Zod schema
**And** match generation completes within 5 seconds (NFR-P8)

---

## Epic 6: Multi-Building Queue Coordination

**Goal:** System intelligently distributes players across 3 buildings to minimize wait times

**FRs Covered:** FR39, FR40, FR41, FR42, FR43, FR44

### Story 6.1: Building-Level Queue State

As a developer,
I want to track queue depth per building,
So that wait times can be calculated independently.

**Acceptance Criteria:**

**Given** the queue system is active
**When** players join the queue
**Then** each queue entry is assigned to a building (Building A, B, or C)
**And** the Zustand `queueSlice` includes a `getQueueByBuilding(building)` selector
**And** the selector returns queue entries filtered by building
**And** queue depth per building is calculated in real-time
**And** the calculation completes within 100ms (NFR-P11)

### Story 6.2: Wait Time Calculation Per Building

As a player,
I want to see estimated wait time for each building,
So that I can choose where to wait.

**Acceptance Criteria:**

**Given** queue entries exist across multiple buildings
**When** the wait time calculation runs at `/lib/queue/waitTime.ts`
**Then** the algorithm calculates wait time based on queue depth and average session duration
**And** the formula is: `wait_time = (queue_depth / courts_in_building) * avg_session_duration`
**And** average session duration is calculated from the last 20 completed sessions
**And** if no session history exists, a default of 15 minutes is used
**And** wait time is displayed on the cashier interface for each building (FR39)
**And** the calculation updates when new sessions complete or players join queue

### Story 6.3: Auto-Routing to Shortest Queue

As a cashier,
I want the system to recommend the building with the shortest queue,
So that players are distributed optimally.

**Acceptance Criteria:**

**Given** a player is checking in and setting preferences
**When** the building assignment logic runs
**Then** the system recommends the building with the lowest estimated wait time (FR40)
**And** the recommendation is displayed to the cashier: "Recommended: Building B (~8 min wait)"
**And** the cashier can accept the recommendation or manually override
**And** the queue entry is created for the recommended building
**And** the algorithm recalculates after each player is added

### Story 6.4: Physical Location Awareness

As a cashier,
I want to respect the player's current physical location,
So that they aren't forced to walk to a different building.

**Acceptance Criteria:**

**Given** a player is checking in at a specific building's counter
**When** the building assignment logic runs
**Then** the system detects which building the cashier is at (via cashier account configuration)
**And** if the player is physically present at Building A, they are not auto-routed to Building B or C (FR41)
**And** the system only recommends alternate buildings if explicitly requested
**And** the cashier interface shows: "Player is at Building A - assigning to Building A queue"
**And** manual building override is available if needed

### Story 6.5: Local Match Preference (10-Minute Window)

As a player,
I want to wait for a local match at my current building if one is available soon,
So that I don't have to walk to another building unnecessarily.

**Acceptance Criteria:**

**Given** a player is at Building A and queue depth is higher than other buildings
**When** the building assignment logic runs
**Then** the system checks if a skill-appropriate match is available at the current building within 10 minutes (FR42)
**And** if yes, the player remains at their current building
**And** if no, the system recommends auto-routing to the shortest queue at another building
**And** the cashier sees: "Local match available in ~8 min at Building A" or "Shorter wait at Building B (~5 min) - recommend routing?"
**And** the player (via cashier) can choose to wait locally or accept routing

### Story 6.6: Manual Building Assignment Override

As a court officer,
I want to manually assign players to specific buildings,
So that I can handle special requests or balance loads.

**Acceptance Criteria:**

**Given** I am viewing the dashboard with queue entries
**When** I select a queue entry and click "Reassign Building"
**Then** a dropdown shows all 3 buildings (Building A, B, C)
**And** I can select the target building
**And** the queue entry `building` field is updated
**And** the player's queue position is recalculated for the new building
**And** a notification is sent to the TV display at the new building showing the player's name (FR43)
**And** the manual override is logged for reporting purposes

### Story 6.7: Queue Load Balancing Target (10% Variance)

As a court officer,
I want to see if queue loads are balanced across buildings,
So that I can identify and address imbalances.

**Acceptance Criteria:**

**Given** players are distributed across 3 buildings
**When** I view the dashboard analytics panel
**Then** I see queue depth for each building: "Building A: 12 | Building B: 10 | Building C: 11"
**And** I see the load variance percentage calculated as: `max(queue_depths) - min(queue_depths) / avg(queue_depths) * 100`
**And** if variance is >10%, a yellow warning is shown: "Queue imbalance detected" (FR44)
**And** if variance is ≤10%, a green indicator is shown: "Balanced"
**And** the metric updates in real-time as queue changes occur
**And** I can manually trigger rebalancing recommendations

---

## Epic 7: Time Limit Enforcement & Warnings

**Goal:** 5-hour facility-wide time limits enforced with warnings and grace periods

**FRs Covered:** FR5, FR26, FR27, FR28, FR29, FR30, FR31, FR46

### Story 7.1: Session Timer with Zustand Persistence

As a developer,
I want to implement persistent session timers in Zustand,
So that timers survive browser refreshes.

**Acceptance Criteria:**

**Given** Zustand is configured with persist middleware
**When** I create the `timerSlice` in `/store/timerSlice.ts`
**Then** the slice includes state: `activeSessions` (map of player_id to session data with start_time and remaining_time)
**And** the slice includes actions: `startTimer`, `updateTimer`, `pauseTimer`, `expireTimer`
**And** the persist middleware saves timer state to localStorage
**And** timers are restored from localStorage on page reload
**And** timer accuracy is maintained across browser refreshes and connection interruptions (NFR-R9)
**And** the store is properly typed with TypeScript

### Story 7.2: Facility-Wide Time Tracking

As a player,
I want my session time to be tracked across all 3 buildings,
So that I can move between buildings without resetting my timer.

**Acceptance Criteria:**

**Given** I have an active session that started at Building A
**When** I move to Building B or C and join the queue there
**Then** my session timer continues from the original start time (FR26)
**And** the timer is fetched from the `sessions` table using my `player_id`
**And** the timer is not reset when changing buildings
**And** the remaining time is calculated as: `5 hours - (current_time - start_time)`
**And** if the player has multiple active sessions (error state), the oldest is used
**And** the TV display at any building shows my correct remaining time

### Story 7.3: Preference Editing Mid-Session

As a player,
I want to edit my match preferences during my session,
So that I can adjust if my plans change.

**Acceptance Criteria:**

**Given** I have an active session and am waiting in the queue
**When** I approach the cashier and request a preference change
**Then** the cashier can pull up my player profile via QR scan
**And** the preference editing form is displayed with current values pre-filled
**And** I can change skill level preference, gender preference, or match type (FR5)
**And** the updated preferences are saved to `player_preferences` table
**And** if I'm currently in the queue, my queue entry is updated with new preferences
**And** the matchmaking algorithm uses the updated preferences for future matches
**And** a confirmation message is shown: "Preferences updated"

### Story 7.4: Soft Warning at 4:30 Mark

As a player,
I want to receive a soft warning when I have 30 minutes remaining,
So that I'm aware my time is running low.

**Acceptance Criteria:**

**Given** I have an active session
**When** my remaining time reaches 4:30 (30 minutes left)
**Then** a soft warning is displayed on the TV display next to my name (FR27)
**And** the warning shows: "[Player Name] - 30 min remaining" with a yellow indicator
**And** the warning is triggered automatically by the timer system
**And** the warning persists on the TV display until the 4:55 mark
**And** no personal notification is sent to court officers at this stage

### Story 7.5: Personal Alert at 4:55 Mark

As a court officer,
I want to be alerted when a player reaches 4:55 remaining,
So that I can notify them personally.

**Acceptance Criteria:**

**Given** a player's session reaches 4:55 remaining (5 minutes left)
**When** the timer system detects this threshold
**Then** a personal alert is sent to the court officer dashboard (FR28)
**And** the alert displays: "⚠️ [Player Name] - 5 min remaining - Notify player"
**And** the player's name is highlighted in red on the TV display with "5 MIN REMAINING"
**And** the court officer can mark the alert as "Notified" to dismiss it
**And** the alert remains active until marked or the session ends
**And** if the player is currently playing, the alert notes: "Currently on Court X"

### Story 7.6: Grace Period Handling for Mid-Game Time Expiration

As a player,
I want to finish my game if I'm called to court near my 5-hour limit,
So that I don't have to leave mid-match.

**Acceptance Criteria:**

**Given** I am called to a court between 4:50 and 5:00 remaining
**When** I start playing the match
**Then** I am allowed to complete the game with a grace period of up to 25 minutes (FR29)
**And** the grace period maximum is 5:25 total time (5 hours + 25 min)
**And** at 5:25, the court officer receives an alert: "⚠️ [Player Name] - Grace period ended - Must leave court"
**And** the session status is marked as 'grace_period' in the database
**And** the TV display shows: "[Player Name] - Grace period (finish game)"
**And** if the game completes before 5:25, the session ends normally

### Story 7.7: Prevent Re-Queue After Time Limit

As a system,
I want to prevent players from re-entering the queue after their 5-hour limit,
So that the time limit is enforced.

**Acceptance Criteria:**

**Given** a player's session has reached 5:00 (or 5:25 with grace period)
**When** the cashier attempts to add them to the queue
**Then** the system shows an error: "Session time limit reached. Player must register for a new session." (FR30)
**And** the session status is automatically updated to 'expired'
**And** the player is removed from the queue if they were waiting
**And** the player is blocked from queue entry at the API level (Zod validation)
**And** the error message is user-friendly and actionable (NFR-U5)

### Story 7.8: New Session Registration After Completion

As a player,
I want to register for a new 5-hour session after my current one expires,
So that I can continue playing if I choose.

**Acceptance Criteria:**

**Given** my current session has expired (status = 'expired' or 'completed')
**When** I approach the cashier to register for a new session
**Then** the cashier scans my QR code and sees my session status
**And** the cashier can click "Start New Session"
**And** a new session record is created with a fresh `start_time`
**And** my preferences are pre-loaded from the previous session
**And** I can update preferences if desired before joining the queue (FR31)
**And** the new session timer starts at 5:00 hours
**And** the previous session remains in history for stats tracking
**And** I am added to the queue with the new session ID

### Story 7.9: Time Warnings on TV Display

As a player,
I want to see time warnings for approaching limits on the TV display,
So that I and other players are aware.

**Acceptance Criteria:**

**Given** players have active sessions at various time points
**When** I view the TV display
**Then** players with <30 min remaining show a yellow "30 MIN" badge next to their name (FR46)
**And** players with <5 min remaining show a red "5 MIN" badge next to their name
**And** players in grace period show an orange "GRACE PERIOD" badge
**And** the warnings update in real-time as timers count down
**And** the warnings use high contrast colors for visibility from 10+ feet
**And** the warnings are received via the SSE connection

---

## Epic 8: Score Tracking & Player Statistics

**Goal:** Scores are recorded and players can view their personal statistics

**FRs Covered:** FR21, FR32, FR37, FR38

### Story 8.1: Score Input Interface for Court Officers

As a court officer,
I want to encode final scores for completed matches,
So that match results are recorded.

**Acceptance Criteria:**

**Given** I have marked a session as complete
**When** the completion modal appears
**Then** I see a score input form with fields for Team 1 score and Team 2 score
**And** I can enter numeric scores (0-21 typical for pickleball)
**And** I can identify which players were on which team (auto-populated from match)
**And** the scores are validated (must be numeric, one team must reach 11+ with 2-point margin)
**And** I can skip score entry if players didn't track it
**And** the scores are saved to the `sessions` table in new columns: `team1_score`, `team2_score` (FR21, FR37)
**And** the session duration is also logged in the same record
**And** a confirmation message is shown: "Score recorded"

### Story 8.2: Match History Recording

As a developer,
I want to record completed matches to match_history,
So that variety enforcement and stats have data.

**Acceptance Criteria:**

**Given** a session is completed with scores
**When** the session is marked complete
**Then** for each player in the match, a `match_history` record is created
**And** each record includes: `session_id`, `player_id`, `opponent_ids` (array of other 3 players), `match_date`
**And** the match history is used by the variety enforcement algorithm (FR38)
**And** the last 3 sessions per player are queryable efficiently (indexed on player_id and match_date)
**And** the records are inserted in a single transaction to ensure consistency

### Story 8.3: Player Stats Dashboard - Personal View

As a player,
I want to view my personal statistics,
So that I can track my progress and activity.

**Acceptance Criteria:**

**Given** I have played matches at the facility
**When** I navigate to my player stats page (authenticated via QR UUID)
**Then** I see my total games played count
**And** I see a list of opponents I've faced (names with play frequency)
**And** I see my session history with dates, duration, and scores (FR32)
**And** I see my win/loss record if scores were recorded
**And** I can only view my own stats, not other players' data (NFR-S8, RLS enforced)
**And** the stats are fetched from Supabase with joins on `sessions` and `match_history` tables
**And** if no match history exists, a message is shown: "No matches recorded yet"
**And** the page is optimized for tablet/desktop viewing

### Story 8.4: Historical Data Maintenance for Variety Enforcement

As a system,
I want to maintain historical match data for variety enforcement,
So that the matchmaking algorithm can avoid repeat opponents.

**Acceptance Criteria:**

**Given** match history is being recorded
**When** the variety enforcement algorithm runs
**Then** it queries the last 3 matches for each player from `match_history`
**And** the query uses the index on (player_id, match_date DESC) for performance
**And** the query completes within 500ms (NFR-P9)
**And** if a player has <3 matches, all available matches are used
**And** matches older than the last 3 are retained for stats but not used for variety logic (FR38)
**And** the data retention policy keeps all match history indefinitely for stats tracking

---

## Epic 9: Analytics & Operational Reporting

**Goal:** Court officers access operational insights and facility utilization reports

**FRs Covered:** FR33, FR34, FR35, FR36

### Story 9.1: Court Utilization Report

As a court officer,
I want to view court utilization reports,
So that I can understand how efficiently courts are being used.

**Acceptance Criteria:**

**Given** I am on the admin dashboard analytics section
**When** I click "Court Utilization Report"
**Then** I see a report showing utilization percentage for each of the 12 courts (FR33)
**And** utilization is calculated as: `(total occupied time / total operating hours) * 100` for a selected date range
**And** I can filter by date range (today, this week, this month, custom)
**And** the report shows: Court Number, Building, Utilization %, Total Sessions, Average Session Duration
**And** the data is fetched from the `sessions` table with aggregations
**And** courts with <70% utilization are highlighted in yellow
**And** courts with >90% utilization are highlighted in green
**And** the report can be exported to CSV

### Story 9.2: Load Variance Analysis Across Buildings

As a court officer,
I want to analyze load variance across the 3 buildings,
So that I can identify operational imbalances.

**Acceptance Criteria:**

**Given** I am viewing the analytics dashboard
**When** I navigate to "Building Load Variance"
**Then** I see queue depth and utilization metrics for each building (FR34)
**And** the variance is calculated as: `(max - min) / avg * 100`
**And** I see historical variance trends over the selected date range
**And** if current variance is >10%, a warning is displayed with rebalancing suggestions
**And** the report shows: Building, Queue Depth, Court Utilization %, Average Wait Time
**And** I can filter by date range and time of day
**And** a chart visualizes variance trends over time

### Story 9.3: Peak Hour Analysis

As a court officer,
I want to identify peak hours of facility usage,
So that I can optimize staffing and resources.

**Acceptance Criteria:**

**Given** I am viewing the analytics dashboard
**When** I click "Peak Hour Analysis"
**Then** I see a histogram showing player check-ins by hour of day (FR35)
**And** the analysis identifies peak hours (hours with >80% of max hourly check-ins)
**And** I see average queue depth by hour
**And** I see average wait time by hour
**And** the data is aggregated from `sessions` table grouped by hour of `start_time`
**And** I can filter by day of week (e.g., Saturday vs Tuesday patterns)
**And** peak hours are highlighted in red on the chart
**And** the report suggests optimal staffing levels per time block

### Story 9.4: Player Behavior Insights

As a court officer,
I want to track player behavior insights,
So that I can improve operational efficiency.

**Acceptance Criteria:**

**Given** I am viewing the analytics dashboard
**When** I navigate to "Player Insights"
**Then** I see metrics including: Average session duration, Return rate (% of players who return within 30 days), Average games per visit, Skill level distribution (FR36)
**And** I see preference distribution (solo vs group, gender preferences, skill preferences)
**And** I see building preference patterns (which building has highest repeat visitors)
**And** the data is aggregated from `sessions`, `players`, and `player_preferences` tables
**And** I can filter by date range and building
**And** trends are visualized with charts
**And** insights help identify patterns like "68% of players prefer Building A"
