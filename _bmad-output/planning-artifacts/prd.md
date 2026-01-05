---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-03-success', 'step-04-journeys', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-complete']
inputDocuments:
  - README.md
  - Meeting notes (inline - stakeholder feedback)
  - Official PicklePoint rules (inline)
workflowType: 'prd'
lastStep: 11
briefCount: 0
researchCount: 0
brainstormingCount: 0
projectDocsCount: 1
workflowComplete: true
completedDate: '2025-12-31'
---

# Product Requirements Document - pickleball-queue

**Author:** Emperor Boplax
**Date:** 2025-12-31

## Executive Summary

**PicklePoint Iloilo** operates a multi-building pickleball facility (3 buildings, 12 courts total) that currently uses a basic MVP queue management system. After stakeholder review, the facility needs a complete redesign to handle operational complexity, prevent abuse, and lay the foundation for competitive play features.

### Current State Baseline

**Player Volume:**
- Average daily players: [TBD - need stakeholder data]
- Peak hours: [TBD]
- Average wait time during peak: [TBD]

**Operational Pain Points:**
- Court officers spend significant time on manual queue management
- Players exceed intended play duration without enforcement
- Player complaints about: repeat opponents, skill mismatches, unfair queue positioning

### The Challenge

The existing MVP (localStorage-based group queue with 4-court management) is operationally unsustainable:
- Manual queue management breaks down at scale across 12 courts and 3 buildings
- No player authentication or time tracking enables abuse (queue scumming, all-day camping)
- Group-only tracking prevents individual stats, blocking future ranked systems
- No skill-based matching creates poor experiences (pros vs beginners)
- Players face the same opponents repeatedly, reducing variety
- Court officers lack tools to enforce fair rotation rules

### The Solution

A **player-centric queue management system** that balances individual tracking with social flexibility:

**Core Capabilities:**

- **QR Code Authentication** - Each player receives ONE permanent QR code (unique player identifier). Scanning at check-in logs them in and starts their 5-hour facility-wide play window

- **Individual Player Profiles** - Supabase-backed profiles with photos, skill level (2-tier: Beginner/Intermediate-Advanced), gender, and complete session history

- **Hybrid Queue System** - Players can solo queue (matched with randoms) OR team up with friends (2-4 players), but individual stats always tracked for future ranked play and awards

- **Multi-Building Auto-Routing** - System routes players to shortest queue across all 3 buildings:
  - Calculates estimated wait time per building based on queue depth and average session duration
  - **Assignment rule:** Route to shortest queue UNLESS:
    - Player is physically present at a building (no forced walking)
    - Skill-appropriate match available at current building within 10 minutes
    - Player explicitly requests specific building (manual override)
  - **Building preference tracking:** System learns which building each player prefers over time, uses as tiebreaker when wait times equal
  - **Premium building emergence:** Expected that one building naturally becomes preferred; pricing strategy TBD for future phases

- **Skill-Based Matchmaking** - Algorithm follows strict priority hierarchy:
  1. **Friend Groups (Highest Priority)** - If 2-4 players queue together, keep them together
  2. **Time Window Urgency** - Players near 5-hour limit get priority matching
  3. **Skill Level** - Match within same tier (Beginner or Intermediate/Advanced)
  4. **Gender Preference** - Respect player preferences (men's, women's, mixed, random)
  5. **Variety Enforcement** - Avoid pairing players who've played together in last 3 sessions
  6. **Building Assignment** - Route to shortest queue across 3 buildings

  **Conflict Resolution:** If no valid match exists after 2 queue cycles (~20 min), relax constraints in reverse priority order until match found

- **Variety Enforcement** - Algorithm actively prevents same players from matching repeatedly (tracks last 3 sessions per player)

- **5-Hour Window Enforcement:**
  - QR code scan at check-in starts facility-wide timer
  - Timer persists across all 3 buildings
  - **Warning System:**
    - 4:30 mark - soft warning on TV display next to player name
    - 4:55 mark - court officer notified, player warned personally
  - **Mid-Game Policy:**
    - If player is called to court at 4:50, they can complete the game (grace period)
    - Max grace period: 25 minutes (allows one full game to finish)
    - At 5:25, player must leave court even if game unfinished
  - **Extension Option:**
    - Players can register for a new 5-hour session at counter (requires waiting for next available slot)
    - Same QR code used - system logs new session start time
    - Previous session must be fully completed before new session begins

- **Anti-Scumming Rules** - Cannot join queue while playing, fair rotation enforcement, name-based queuing (no paddle placing), group completeness checks, waitlist management

- **Court Officer Dashboard** - Single interface to manage 12 courts across 3 buildings, encode scores, override preferences, handle exceptions, monitor time limits

- **Database Migration Strategy:**
  - **Phase 1: Parallel Systems (Weeks 1-2)** - Deploy Supabase backend alongside existing localStorage, court officers validate data integrity
  - **Phase 2: Soft Launch (Weeks 3-4)** - QR code check-in for new players, existing players grandfathered with manual entry, test multi-building routing
  - **Phase 3: Full Cutover (Week 5)** - All players required to use QR codes, localStorage deprecated, full matchmaking enabled

### What Makes This Special

**This isn't just queue management - it's a player progression platform:**

1. **Fairness Through Intelligent Automation** - Eliminates manual queue manipulation, enforces rotation rules, prevents abuse automatically

2. **Variety Over Repetition** - Unique algorithm ensures players don't face the same opponents session after session

3. **Quality Matchmaking** - Skill-aware pairing creates better games while respecting player choice to play with friends

4. **Choice + Data** - Players maintain social flexibility (team with friends or solo) while system captures individual performance data

5. **Foundation for Competition** - Individual player tracking enables future features: ranked systems, leaderboards, player awards (most wins, most visits)

6. **Multi-Building Intelligence** - Auto-routing to shortest queue across 3 buildings optimizes court utilization and encourages player discovery of preferred locations

**The Strategic Insight:** By shifting from group-based to player-centric tracking while preserving social queuing options, PicklePoint gains both operational control (time limits, fair rotation, abuse prevention) and future competitive features (rankings, awards) - all while maintaining the social experience players expect.

### Target Users

**Primary:**
- **Pickleball Players** (casual to competitive) - Want fair games, variety in opponents, ability to play with friends, recognition for performance

**Secondary:**
- **Court Officers** - Need centralized control over 12 courts, 3 buildings, queue enforcement, score tracking
- **Facility Management** - Want operational efficiency, abuse prevention, data for business decisions, foundation for premium features

### Key Metrics for Success

**Queue Efficiency:**
- Reduce average wait time by 30% (baseline: [X] minutes)
- Achieve 85%+ court utilization across all 12 courts
- Balance load across 3 buildings within 10% variance

**Player Experience:**
- 70%+ of games with new opponents (variety target)
- 90%+ skill-appropriate matches (within same tier or ±1 level)
- Player return rate increase by 20%

**Operational:**
- 95%+ time limit compliance (players staying within 5 hours)
- Reduce court officer manual interventions by 60%
- Zero queue position disputes (system is source of truth)

## Project Classification

**Technical Type:** Web Application
**Domain:** General / Facility Management
**Complexity:** Low-to-Medium
**Project Context:** Brownfield - major enhancement to existing MVP

**Technical Architecture:**
- **Current Stack:** Next.js 16, React, TypeScript, Tailwind CSS 4, localStorage
- **Migration Target:** Supabase (database, auth), QR code generation/scanning
- **Scale:** 3 buildings, 12 courts, hundreds of daily players
- **Real-time Requirements:** Queue updates, court status, session timers
- **Multi-Location Considerations:** Building-level routing logic, cross-building time tracking

**Key Technical Challenges:**
- Matchmaking algorithm (skill-based, variety-enforcing, preference-aware, priority hierarchy)
- Multi-building queue coordination and auto-routing with physical location awareness
- 5-hour time window tracking per player across facilities with grace period handling
- QR code authentication and player check-in flow (one permanent QR per player)
- localStorage → Supabase data migration with parallel system phase
- Real-time sync across admin dashboard and TV displays (now per-building + facility-wide views)
- Anti-abuse rule enforcement in code

## Success Criteria

### User Success

**For Players:**
- **Fast Queue Entry:** Pay at cashier → QR scan → set preferences → in queue within 30 seconds
- **Informed Wait Times:** TV displays show queue position and estimated wait time (no more periodic paddle checking)
- **Preference Control:** Players choose match type at check-in (men's/women's/mixed/random, skill level) and system respects preferences
- **Fair Matches:** 90%+ of games are skill-appropriate (within same tier or ±1 level)
- **Variety in Opponents:** Algorithm prevents playing same opponents repeatedly (post-MVP)
- **Zero Queue Disputes:** System is source of truth - no arguments about position or wait time
- **Time Visibility:** Players see their remaining time on TV display, get warnings before limit

**Success Moment:** Player scans QR code, sets preferences in seconds, sees their position on the big screen, and gets called to a fair match without confusion or disputes.

**For Court Officers:**
- **Digital Upgrade:** Complete replacement of pen-and-paper paddle stacking system
- **Automated Tracking:** System handles queue order, time limits, session logging without manual intervention
- **Single Dashboard:** Manage all 12 courts across 3 buildings from one interface
- **Enforcement Without Confrontation:** System automatically warns players about time limits - officer doesn't need to be the "bad guy"
- **Zero Mental Math:** No calculations for wait times, rotations, or court utilization
- **Exception Handling:** Easy manual overrides when needed (player requests specific court, special circumstances)

**Success Moment:** Court officer opens dashboard, sees all 12 courts at a glance, clicks "Call Next" and system automatically assigns the best match - no pen, no paper, no disputes.

### Business Success

**3 Months Post-Launch:**
- **Zero queue disputes** - System eliminates all position/fairness arguments
- **70%+ QR adoption rate** - Players check in smoothly via QR codes
- **Court utilization variance < 10%** - Balanced load across all 12 courts (no courts sitting empty while others have long queues)
- **Court officer satisfaction** - Officers report significant reduction in manual workload

**12 Months Post-Launch:**
- **Player retention: 60%+ return within 30 days** - Players come back regularly
- **Premium building identified** - Clear player preference emerges for one building (NOT balanced usage)
- **Ranked system operational** - Individual stats enable rankings, leaderboards, and player awards
- **Multi-building efficiency** - Auto-routing successfully distributes players across 3 buildings based on queue depth

### Technical Success

**Performance & Reliability:**
- **99.9% uptime** - System available during all operating hours (no downtime during peak)
- **Real-time updates < 2 seconds** - Queue changes reflected on TV displays immediately
- **Matchmaking speed < 5 seconds** - Algorithm assigns matches instantly
- **Scale handling** - System supports 200+ daily players without performance degradation

**Data Integrity:**
- **Zero data loss** - localStorage → Supabase migration completes with 100% data preservation
- **100% time tracking accuracy** - No players slip past 5-hour limit undetected
- **Zero duplicate positions** - System prevents double stacking and queue position conflicts in code
- **Preference enforcement** - Matchmaking respects player preferences 100% of the time (or explicitly relaxes when no match available)

**Operational:**
- **Single dashboard control** - Court officer manages 12 courts from one interface
- **QR scan-to-queue < 30 seconds** - Check-in flow is fast and smooth
- **Multi-building coordination** - Auto-routing logic works correctly across 3 buildings
- **Grace period handling** - Mid-game policy enforced correctly (players can finish game if called near 5-hour mark)

### Measurable Outcomes

**Week 1:**
- QR code system deployed to all 3 buildings
- Court officers trained on dashboard
- 50+ players successfully check in via QR

**Month 1:**
- 70% QR adoption rate achieved
- Queue disputes reduced to near-zero
- Court utilization data validates auto-routing logic

**Month 3:**
- Zero queue disputes for 30 consecutive days
- Court variance < 10% achieved
- Player feedback shows preference for TV visibility over paddle stacking

**Month 6:**
- Building preference patterns emerging in data
- Player return rate tracking shows retention trends
- Score tracking and variety enforcement features deployed (Growth phase)

**Month 12:**
- Ranked system operational with leaderboards
- Premium building clearly identified
- Player awards program launched (most wins, most visits)
- Foundation for tournament mode validated

## Product Scope

### MVP - Minimum Viable Product

**Must Ship for Launch:**

**Player Experience:**
- QR code generation and check-in system
- Player profiles (name, photo, skill level, gender)
- Preference setting at check-in (match type for session)
- Queue visibility on TV displays (position, estimated wait time)
- 5-hour timer with warnings (4:30 soft warning, 4:55 personal warning)
- Mid-game grace period (up to 25 min to finish game)

**Matchmaking:**
- Friend group queuing (2-4 players team up)
- Solo queue with random matching
- Skill-based matching (Beginner vs Intermediate/Advanced)
- Gender preference matching (men's/women's/mixed/random)
- Priority hierarchy: Friend groups > Time urgency > Skill > Gender > Building assignment
- Conflict resolution (relax constraints after 2 queue cycles if no match)

**Multi-Building:**
- Auto-routing to shortest queue across 3 buildings
- Building assignment rules (no forced walking, 10-min local match preference, manual override)
- Queue coordination across 12 courts

**Court Officer Tools:**
- Single dashboard for 12 courts across 3 buildings
- Call next group (system auto-assigns best match)
- Complete session (log duration, free up court)
- View queue across all buildings
- Manual overrides for exceptions

**Backend:**
- Supabase database (profiles, sessions, queue state)
- Real-time sync between admin dashboard and TV displays
- localStorage → Supabase migration (3-phase strategy)

**Anti-Abuse:**
- Cannot queue while playing
- Name-based queuing (no paddle placing)
- Group completeness checks
- 5-hour facility-wide time limit enforcement

**NOT in MVP:**
- Variety enforcement (tracking last 3 sessions to avoid repeats)
- Score encoding by court officers
- Player statistics dashboard
- Building preference learning algorithm
- Advanced analytics or reporting

### Growth Features (Post-MVP)

**Phase 2 Enhancements:**
- **Variety Enforcement** - Track last 3 sessions per player, avoid matching same opponents
- **Score Tracking** - Court officers can encode final scores into system
- **Player Stats Dashboard** - Players can view their own stats (games played, win rate, etc.)
- **Building Preference Learning** - System learns which building each player prefers, uses as tiebreaker
- **Advanced Analytics** - Court utilization reports, peak hour analysis, player behavior insights

**Why Post-MVP:**
- These features enhance the experience but aren't critical for replacing the manual paddle system
- MVP proves the core value proposition first
- Variety enforcement requires historical data to work properly

### Vision (Future)

**12+ Month Roadmap:**
- **Ranked System** - ELO ratings, skill progression, tier promotions
- **Player Awards** - Most wins, most visits, most improved, building champion
- **Leaderboards** - Per building, facility-wide, monthly resets
- **Tournament Mode** - Bracket creation, tournament tracking, championship events
- **Mobile App** - Players check queue status, view stats, receive notifications on their phones
- **Premium Building Pricing** - Dynamic pricing based on building popularity
- **Reservation System** - Book specific time slots in advance (for premium users)
- **Social Features** - Friend lists, challenge matches, group messaging

**Strategic Direction:**
This vision transforms PicklePoint from a queue management system into a **player progression platform** with competitive features, social engagement, and revenue opportunities through premium tiers.

## User Journeys

### Journey 1: Marco Chen - The Competitive Regular (Player - Success Path)

Marco is a 34-year-old software engineer who discovered pickleball six months ago and is now obsessed. Every Saturday morning, he drives 20 minutes to PicklePoint Iloilo, eager to get his games in. But lately, the experience has been frustrating.

Under the old paddle-stacking system, Marco would arrive at 8 AM, stack his paddle with his name sticker, then periodically walk over every 15 minutes to check if he's close to playing. Sometimes he'd miss his turn because he was chatting with friends. Other times he'd get paired with beginners and the games weren't competitive. Once, someone accused him of cutting in line, leading to an awkward confrontation. He's been staying all day (9+ hours) because there's no enforcement, but honestly, he's getting burned out.

**The New Reality:**

Marco arrives at PicklePoint, pays at the cashier, and the cashier scans his QR code. "You're checked in, Marco. Your 5-hour window just started." Marco pulls out his phone and quickly sets his preferences on the screen: Skill Level = Intermediate/Advanced, Gender = Mixed, Playing With = Random. The system confirms: "You're in queue. Position #3. Estimated wait: 12 minutes. Check Building B's TV display."

Marco walks to Building B, grabs a coffee, and glances at the giant TV screen. There's his name - #3 in queue. He can see exactly who's ahead of him and the estimated wait time counting down. No more periodic checking. No more anxiety about missing his turn.

Twelve minutes later, the TV displays: "COURT 5 - NEXT UP: Marco Chen + Sarah Kim vs. Alex Reyes + Jamie Torres." Marco recognizes Alex - they played last week and it was a great match. The system automatically paired him with players at his skill level, and because it tracks variety, he's getting matched with different people each session.

The breakthrough moment comes at 12:45 PM when the TV shows a soft warning: "Marco Chen - 4:30 remaining." He knows exactly how much time he has left. At 12:55 PM, a court officer approaches: "Hey Marco, you've got 5 minutes. Want to squeeze in one more game?" Marco decides to call it - he's played 8 great competitive matches, faced different opponents each time, and there were zero disputes about queue position.

Six months later, Marco is a regular who plays 3 times per week. He's climbing the (future) ranked leaderboard, his favorite building is clearly Building A (the premium one), and he's never once argued about queue fairness. The system just works.

### Journey 2: Rita Gonzales - The Overwhelmed Organizer (Court Officer - Operations)

Rita has been a court officer at PicklePoint for 2 years. She loves pickleball and enjoys helping players have great experiences, but managing 12 courts across 3 buildings with pen, paper, and paddle stickers has become impossible.

On a typical Saturday, Rita starts her shift at 7 AM with a notebook, three clipboards, and a prayer. By 9 AM, Building A has a 45-minute wait, Building C has empty courts, but players don't know so they keep stacking at Building A. She's running between buildings trying to manually balance the load. Someone's paddle falls off the rack and now there's a dispute about queue position. A player has been here for 8 hours and refuses to leave. Another player insists they were next but Rita's notes say otherwise. She's doing mental math to track who played when, calculating wait times, and trying to remember who played together last time. By noon, she's exhausted and there have been three arguments she had to mediate.

**The New Reality:**

Rita arrives for her Saturday shift and opens the court officer dashboard on the tablet. One screen shows all 12 courts across 3 buildings in a clean grid. Green courts are available, red courts are occupied with live session timers, and the queue panel shows 47 players currently waiting, automatically distributed across the buildings.

At 9:15 AM, Court 7 in Building A finishes. Rita clicks "Complete Session" and the system logs it (18 minutes - below average). Instantly, the system displays: "COURT 7 - READY TO CALL: Sofia Martinez + Luis Garcia vs. Ryan Patel + Emma Wong." Rita glances at the suggested match - all Intermediate level, mixed gender preferences respected, none of them played together in their last 3 sessions. Perfect. She clicks "Call to Court" and the TV displays update immediately. The four players head to Court 7. No manual calculation. No disputes.

At 12:30 PM, the system alerts Rita: "5 players approaching 5-hour limit." She reviews the list - Michael Torres is at 4:55 and currently playing on Court 3. The system already sent him a TV warning at 4:30. Rita walks over: "Hey Michael, you've got 5 minutes left. You can finish this game." Michael nods - he saw the warning, he knows the rules. No confrontation needed.

The breakthrough comes when Rita realizes she hasn't looked at her notebook once. At 2 PM, her manager asks: "How's court utilization today?" Rita pulls up the analytics dashboard: "12 courts, 89% utilization, load variance is 7% across buildings. Zero queue disputes." Her manager is stunned.

Six months later, Rita manages the entire facility from one dashboard. The system handles matchmaking, time enforcement, and queue distribution automatically. She spends her time greeting players, handling special requests, and actually enjoying her job instead of being a referee and calculator. She can even take bathroom breaks without the system falling apart.

### Journey 3: Linda Reyes - From Chaos to Clarity (Cashier - Check-In)

Linda works the front desk at PicklePoint. Her job used to involve: collecting payment, writing down player names on a clipboard, checking if they have their paddle sticker, explaining the queue system to confused newcomers, and directing them to check the paddle rack "every 10-15 minutes."

On busy mornings, the check-in line gets backed up because she's explaining the manual system over and over. "So you stack your paddle here, write your name on a sticker, then check the rack to see your position..." New players are confused. International visitors don't understand the system. She's constantly answering "How do I know when it's my turn?" with "Just check the paddle rack periodically."

**The New Reality:**

A new player, David, approaches Linda's desk at 8 AM. "First time here! How does this work?"

Linda smiles: "Welcome to PicklePoint! It's $15 for a 5-hour session. I'll scan your QR code to check you in, then you'll set your game preferences on this tablet, and you're in the queue. The TV displays will show your position and wait time."

David pays, Linda scans his unique QR code (generated when he registered online), and his 5-hour timer starts. The tablet prompts: "Set your preferences for today's session." David selects: Beginner, Mixed, Random. Done. "You're #8 in queue. Check Building B's TV - about 15 minutes."

The whole process took 45 seconds. No clipboard. No explaining the paddle system. No confusion.

When a regular, Maria, checks in, Linda recognizes her: "Welcome back, Maria!" Scan. Her preferences auto-load from last session (Intermediate, Women's Doubles). "Same as last time?" Maria nods. Done. 20 seconds.

The breakthrough comes during the Saturday rush - Linda checks in 40 players in 30 minutes with zero confusion. Every single person understands the system immediately because it's familiar (like any queue system they've seen at restaurants or airports). No one asks "How do I know when it's my turn?" because the TV displays make it obvious.

Six months later, Linda's job is smooth and professional. Check-in is fast, players understand the system immediately, and she never has to explain the confusing paddle-stacking ritual to bewildered newcomers.

### Journey 4: Ana Rodriguez - The All-Day Hustler (Player - Edge Case - Time Limit Enforcement)

Ana is a 28-year-old nurse with irregular shifts who discovered a loophole in the old system: no time enforcement. On her days off, she'd arrive at 8 AM and play until 6 PM (10 hours!) because no one stopped her. She'd just keep stacking her paddle after each game. It was cheap entertainment for a whole day.

**The New Reality:**

Ana checks in at 8 AM. The cashier scans her QR code: "5-hour window starts now, Ana. Enjoy!" Ana thinks: "Yeah, but I'll just stay longer like I always do."

She plays great games all morning. At 12:30 PM, the TV display shows a soft warning next to her name: "Ana Rodriguez - 4:30 remaining." Ana notices but ignores it. She's planning to stay until evening.

At 12:55 PM, while she's sitting in the queue for her next game, a court officer approaches: "Hey Ana, just a heads up - you have 5 minutes left in your session. If you get called to a court, you can finish that game, but after that you'll need to register for a new session if you want to keep playing."

Ana is surprised: "Wait, you're actually enforcing the 5-hour limit now?"

Court officer: "Yep! It's in the system. Everyone gets 5 hours per session to keep it fair for everyone. You can register for another session at the desk if you want to extend, but you'll have to wait in queue like everyone else."

Ana gets called to Court 9 at 1:02 PM (7 minutes past her limit - the grace period allows her to finish this game). She plays the game, completes it at 1:20 PM, and decides: "Okay, 5 hours is actually plenty. I'm exhausted anyway."

The breakthrough comes when Ana realizes the new system is actually fair. Under the old system, people like her were hogging courts all day while newcomers gave up after long waits. Now everyone gets equal opportunity. Three months later, Ana comes 2-3 times per week for 5-hour sessions and respects the limit. The court officer never had to be confrontational - the system enforced the rule automatically.

### Journey Requirements Summary

These four user journeys reveal the following capability areas needed for the system:

**Player Experience Capabilities:**
- QR code check-in with session timer activation
- Preference setting interface (skill, gender, match type)
- Real-time queue visibility on TV displays (position, wait time)
- Automatic skill-based matchmaking
- Variety enforcement (avoid repeat opponents)
- Multi-building queue coordination
- Time warning system (soft + personal notifications)
- Player profile persistence

**Court Officer Capabilities:**
- Unified dashboard for 12 courts across 3 buildings
- Visual court status grid with session timers
- One-click session completion and match calling
- Auto-generated match suggestions
- Time limit alerts and enforcement tools
- Real-time analytics (utilization, variance, disputes)
- Queue distribution management

**Cashier Capabilities:**
- Fast QR code scanning system
- Preference setting tablet interface
- Preference persistence for returning players
- Instant queue entry confirmation
- Building assignment with wait time display

**System-Wide Capabilities:**
- 5-hour facility-wide time limit enforcement with grace periods
- Real-time synchronization across all interfaces
- Supabase backend for profiles, sessions, queue state
- Matchmaking priority algorithm
- Anti-abuse rules enforcement
- Session logging and history tracking

## Web Application Specific Requirements

### Project-Type Overview

**pickleball-queue** is a **single-page application (SPA)** built with Next.js 16, designed for three distinct interfaces:
1. **Court Officer Dashboard** - Admin interface for managing 12 courts across 3 buildings
2. **TV Displays** - Read-only real-time queue visualization for players (large-format, wall-mounted)
3. **Cashier Check-In Interface** - QR scanning and player preference setting

All interfaces are **private, authenticated applications** with no public-facing pages or SEO requirements.

### Technical Architecture Considerations

**Application Architecture:**
- **SPA Pattern** - Client-side routing, dynamic updates without page reloads
- **Next.js 16 App Router** - Modern React framework with server components where beneficial
- **Real-time Updates** - Server-Sent Events (SSE) for pushing queue changes to TV displays
- **State Management** - React hooks + Supabase real-time subscriptions for data sync
- **API Layer** - Supabase backend handles data persistence, authentication, and real-time events

**Real-Time Architecture:**
- **TV Displays** - SSE connection to receive queue updates (read-only, 1-2 second latency max)
- **Court Officer Dashboard** - Real-time subscriptions for court status, queue changes, time alerts
- **Cashier Interface** - Standard request/response (no real-time needed for check-in flow)
- **Fallback Strategy** - If SSE connection drops, fall back to 2-second polling until reconnection

### Browser Matrix

**Supported Browsers:**
- **Chrome** - Latest 2 versions (evergreen)
- **Firefox** - Latest 2 versions (evergreen)
- **Safari** - Latest 2 versions (evergreen)
- **Edge** - Latest 2 versions (Chromium-based)

**Not Supporting:**
- Internet Explorer (deprecated)
- Legacy browser versions
- Mobile browsers on phones (court officers use tablets, TV displays are fixed installations)

**Rationale:** PicklePoint controls all hardware (court officer tablets, TV displays, cashier terminals), so browser targeting can be narrow and modern.

### Responsive Design Requirements

**Three Interface Targets:**

1. **Court Officer Dashboard (Tablet)**
   - **Target Resolution:** 1024×768 to 1920×1080
   - **Orientation:** Landscape preferred
   - **Layout:** Multi-column grid showing 12 courts, queue panel, alerts
   - **Touch Targets:** Minimum 44×44px for touch interactions

2. **TV Displays (Large Format)**
   - **Target Resolution:** 1920×1080 (Full HD) to 3840×2160 (4K)
   - **Orientation:** Landscape only
   - **Layout:** Queue list with large text (readable from 10+ feet), court status grid
   - **Font Sizes:** Minimum 24px for body text, 48px+ for headers
   - **High Contrast:** Ensure readability from distance

3. **Cashier Check-In (Desktop/Tablet)**
   - **Target Resolution:** 1280×720 to 1920×1080
   - **Orientation:** Landscape
   - **Layout:** Simple check-in flow, preference selection, confirmation
   - **Large Touch Targets:** For tablet use at check-in counter

**Not Optimized For:**
- Mobile phones (not a use case for this system)
- Portrait orientation
- Small screens below 1024px width

### Performance Targets

**Page Load Performance:**
- **Initial Load** - Court officer dashboard: < 2 seconds on broadband
- **Initial Load** - TV display: < 1 second (minimal interactivity)
- **Initial Load** - Cashier interface: < 1.5 seconds
- **Time to Interactive (TTI):** < 3 seconds for all interfaces

**Real-Time Update Performance:**
- **Queue Update Latency:** 1-2 seconds maximum from action to TV display
- **SSE Message Processing:** < 100ms to render update on screen
- **Court Status Changes:** Reflected within 2 seconds across all interfaces
- **Matchmaking Algorithm:** < 5 seconds to generate match suggestions

**Data Performance:**
- **Supabase Query Response:** < 500ms for player lookups
- **Session Logging:** < 200ms to write session data
- **Queue Position Calculation:** Real-time, < 100ms

**Network Resilience:**
- **Offline Handling:** Show "Connection Lost" message if SSE drops, attempt reconnect every 5 seconds
- **Stale Data Indicator:** Flag data older than 5 seconds on TV displays
- **Graceful Degradation:** Fall back to polling if SSE unavailable

### SEO Strategy

**Not Applicable** - This is a private, authenticated application with no public-facing pages.

**Rationale:**
- All pages require authentication (court officer login, cashier login)
- TV displays auto-load and don't need discoverability
- No marketing pages or public content
- No need for search engine indexing

### Accessibility Level

**Basic Accessibility** - WCAG 2.1 Level A compliance (minimum)

**Included:**
- **Keyboard Navigation** - Tab order for dashboard controls, Enter/Space for actions
- **Focus Indicators** - Clear visual focus states for interactive elements
- **Color Contrast** - Minimum 4.5:1 for normal text, 3:1 for large text
- **Alt Text** - For any icons or images used in UI

**Not Included:**
- **Screen Reader Optimization** - Not required (users are on-site staff, not vision-impaired)
- **WCAG AA or AAA Compliance** - Not necessary for internal facility tool
- **ARIA Labels** - Only where semantically essential
- **Extensive Keyboard Shortcuts** - Basic navigation only

**Rationale:** This is an internal operational tool for facility staff and players physically present at the venue, not a public-facing product requiring extensive accessibility compliance.

### Implementation Considerations

**Technology Stack:**
- **Frontend Framework:** Next.js 16 (App Router, React 18+)
- **UI Library:** Tailwind CSS 4 (existing choice, maintain consistency)
- **State Management:** React hooks + Zustand or Jotai (lightweight, SPA-friendly)
- **Real-Time:** Supabase real-time subscriptions + SSE for TV displays
- **API Client:** Supabase JS SDK
- **Build Tool:** Next.js built-in (Turbopack)
- **Deployment:** Vercel or similar edge platform for low latency

**SPA-Specific Considerations:**
- **Client-Side Routing:** Use Next.js App Router with client-side navigation
- **Code Splitting:** Lazy-load court officer dashboard features to optimize initial load
- **State Persistence:** LocalStorage for court officer session state (fallback if network drops)
- **Bundle Size:** Monitor bundle size, target < 500KB for initial JS payload

**Migration from MVP:**
- **Current:** Next.js 16 with localStorage
- **Target:** Next.js 16 SPA with Supabase + SSE
- **Strategy:** Incremental migration - replace localStorage with Supabase API calls, add SSE layer for TV displays
- **Backward Compatibility:** Not required (clean cutover during deployment)

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Complete Queue Management Platform

PicklePoint is pursuing a comprehensive MVP that delivers the full operational experience from day 1. Rather than a minimal feature set, this MVP includes all capabilities needed to replace the manual paddle system AND provide the data foundation for competitive features.

**Strategic Rationale:**
- The problem set is well-understood and not technically complex
- Stakeholders need immediate relief from manual management chaos
- Players expect modern features (stats, variety, fairness) from launch
- Building the data foundation now (stats, scores, variety tracking) enables faster iteration toward ranked play
- 4-5 month timeline is acceptable given operational pain of current manual system

**Resource Requirements:**
- **Team Size:** 2-3 full-stack developers
- **Skills Needed:** Next.js/React, Supabase, real-time systems (SSE), matchmaking algorithms
- **Timeline:** 4-5 months to MVP launch
- **PM/Design:** 1 person (can be part-time if developer-led)

### MVP Feature Set (Comprehensive Phase 1)

**Core User Journeys Supported:**
- Player check-in and preference setting (Marco's journey)
- Court officer dashboard and queue management (Rita's journey)
- Cashier QR scanning and session start (Linda's journey)
- Time limit enforcement with grace periods (Ana's journey)

**Must-Have Capabilities:**

**Player Experience:**
- QR code generation and check-in system
- Player profiles (name, photo, skill level, gender)
- Preference setting at check-in AND mid-session editing
- Queue visibility on TV displays (position, estimated wait time)
- 5-hour timer with warnings (4:30 soft warning, 4:55 personal notification)
- Mid-game grace period handling
- **Player Stats Dashboard** - View personal stats (games played, opponents faced, session history)

**Matchmaking & Queue:**
- Friend group queuing (2-4 players team up)
- Solo queue with random matching
- Skill-based matching (Beginner vs Intermediate/Advanced)
- Gender preference matching (men's/women's/mixed/random)
- **Variety enforcement** - Track last 3 sessions per player, avoid matching same opponents repeatedly
- Priority hierarchy: Friend groups > Time urgency > Skill > Gender > Variety > Building assignment
- Conflict resolution (relax constraints after 2 queue cycles if no match)

**Multi-Building:**
- Auto-routing to shortest queue across 3 buildings
- Building assignment rules (no forced walking, 10-min local match preference, manual override)
- Queue coordination across 12 courts
- Real-time wait time calculation per building

**Court Officer Tools:**
- Unified dashboard for 12 courts across 3 buildings
- Visual court status grid with session timers
- One-click session completion and match calling
- Auto-generated match suggestions
- **Score tracking** - Encode final scores for completed matches
- Time limit alerts and enforcement tools
- **Advanced Analytics** - Court utilization reports, load variance, peak hour analysis, player behavior insights
- Queue distribution management
- Manual overrides for exceptions

**Cashier Tools:**
- Fast QR code scanning system
- Preference setting tablet interface
- Preference persistence for returning players (auto-load last session's preferences)
- Instant queue entry confirmation
- Building assignment with wait time display

**Backend & Infrastructure:**
- Supabase database (profiles, sessions, queue state, scores, stats)
- Real-time sync between admin dashboard and TV displays
- localStorage → Supabase migration (3-phase strategy)
- SSE (Server-Sent Events) for TV display updates
- Session logging with scores and durations
- Historical data tracking for variety enforcement and stats

**Anti-Abuse:**
- Cannot queue while playing
- Name-based queuing (no paddle placing)
- Group completeness checks
- 5-hour facility-wide time limit enforcement
- Grace period policy (can finish game if called near limit)

### Post-MVP Features (Future Phases)

**Phase 2 (6-12 Months Post-Launch):**
- **Ranked System** - ELO ratings, skill progression, tier promotions
- **Player Awards** - Most wins, most visits, most improved, building champion
- **Leaderboards** - Per building, facility-wide, monthly resets
- **Tournament Mode** - Bracket creation, tournament tracking, championship events

**Phase 3 (12+ Months):**
- **Mobile App** - Players check queue status, view stats, receive notifications on phones
- **Premium Building Pricing** - Dynamic pricing based on building popularity (once premium building emerges)
- **Reservation System** - Book specific time slots in advance for premium users
- **Social Features** - Friend lists, challenge matches, group messaging
- **Advanced Matchmaking** - ML-based skill assessment, dynamic tier adjustments

**Removed from Roadmap:**
- ~~Building preference learning~~ (Users manually set/edit preferences each session instead - simpler UX, full user control)

### Risk Mitigation Strategy

**Technical Risks:**

**Risk:** Matchmaking algorithm complexity (variety + skill + gender + groups + time urgency)
- **Mitigation:** Build incrementally - start with basic skill matching, add variety enforcement once historical data exists (week 2+), test with synthetic data
- **Fallback:** If variety algorithm causes performance issues, make it optional toggle in court officer dashboard

**Risk:** Real-time sync across 12 courts and 3 buildings with SSE
- **Mitigation:** Design with graceful degradation - if SSE fails, fall back to 2-second polling
- **Testing:** Load test with 200+ concurrent players before launch
- **Fallback:** Manual refresh button on TV displays if real-time breaks

**Risk:** localStorage → Supabase migration data loss
- **Mitigation:** 3-phase migration (parallel systems, soft launch, cutover), export localStorage backup before migration
- **Contingency:** Keep old system as emergency fallback for first 2 weeks

**Market Risks:**

**Risk:** Players resist QR code system, prefer familiar paddle stacking
- **Validation:** Soft launch with volunteers (week 3-4 of migration), gather feedback
- **Mitigation:** Court officers trained to assist with onboarding, prominent "How It Works" signage
- **Fallback:** Hybrid system during transition - allow manual entry if QR issues occur

**Risk:** Court officers find dashboard too complex vs pen/paper
- **Validation:** Extensive training sessions before launch, UX testing with Rita (actual court officer)
- **Mitigation:** Progressive disclosure in UI - hide advanced features until needed
- **Success Metric:** If Rita says "this is easier than notebooks" within 1 week, we've won

**Resource Risks:**

**Risk:** 4-5 month timeline slips due to unforeseen complexity
- **Contingency:** Prioritize core queue + matchmaking first, delay stats dashboard to month 5 if needed
- **Critical path:** QR check-in, basic matchmaking, court officer dashboard = must ship by month 4

**Risk:** Developer shortage or key person leaving
- **Mitigation:** Document architecture decisions, use standard tech stack (Next.js, Supabase - common skills)
- **Contingency:** Can ship with 2 devs if we cut advanced analytics from MVP (move to post-launch)

**Risk:** Budget constraints force scope reduction
- **Minimum Viable Reduction:** Cut player stats dashboard + advanced analytics, keep core queue + variety enforcement + score tracking
- **Rationale:** Stats can be added post-launch once historical data exists; core queue management is non-negotiable

## Functional Requirements

### Player Management & Check-In

- **FR1:** Players can register with a unique QR code for facility access
- **FR2:** Players can maintain a profile with name, photo, skill level (Beginner or Intermediate/Advanced), and gender
- **FR3:** Cashiers can scan a player's QR code to check them in for a 5-hour session
- **FR4:** Players can set match preferences at check-in (skill level, gender preference, match type)
- **FR5:** Players can edit their match preferences mid-session
- **FR6:** Cashiers can view returning player preferences from previous sessions
- **FR7:** Players can view their remaining session time

### Queue & Matchmaking

- **FR8:** Players can join the queue as individuals or in groups (2-4 players)
- **FR9:** Players can see their queue position and estimated wait time on TV displays
- **FR10:** The system can match players based on skill level preferences
- **FR11:** The system can match players based on gender preferences (men's, women's, mixed, random)
- **FR12:** The system can keep friend groups together when matching
- **FR13:** The system can avoid matching players who have played together in their last 3 sessions (variety enforcement)
- **FR14:** The system can prioritize time-urgent players (approaching 5-hour limit) in matchmaking
- **FR15:** The system can relax matchmaking constraints if no valid match exists after 2 queue cycles
- **FR16:** The system can prevent players from joining the queue while currently playing

### Court Management & Operations

- **FR17:** Court officers can view all 12 courts across 3 buildings in a unified dashboard
- **FR18:** Court officers can see real-time court status (available, occupied, session duration)
- **FR19:** Court officers can call the next matched group to a specific court
- **FR20:** Court officers can complete a session and log its duration
- **FR21:** Court officers can encode final scores for completed matches
- **FR22:** Court officers can manually override matchmaking suggestions
- **FR23:** Court officers can view auto-generated match suggestions with skill/gender/variety details
- **FR24:** The system can sync court status updates to TV displays within 2 seconds

### Session & Time Tracking

- **FR25:** The system can start a 5-hour session timer when a player checks in
- **FR26:** The system can track session time across all 3 buildings facility-wide
- **FR27:** The system can display a soft warning at the 4:30 mark on TV displays
- **FR28:** The system can alert court officers when players reach the 4:55 mark
- **FR29:** The system can allow players called to court near their 5-hour limit to finish their game (grace period up to 25 minutes)
- **FR30:** The system can prevent players from re-entering the queue after their 5-hour limit expires
- **FR31:** Players can register for a new 5-hour session at the counter after completing their current session

### Statistics & Analytics

- **FR32:** Players can view their personal stats (total games played, opponents faced, session history)
- **FR33:** Court officers can view court utilization reports across all 12 courts
- **FR34:** Court officers can view load variance across the 3 buildings
- **FR35:** Court officers can view peak hour analysis
- **FR36:** The system can track and display player behavior insights
- **FR37:** The system can log session durations with scores
- **FR38:** The system can maintain historical data for variety enforcement (last 3 sessions per player)

### Multi-Building Coordination

- **FR39:** The system can calculate estimated wait time per building based on queue depth
- **FR40:** The system can auto-route players to the building with the shortest queue
- **FR41:** The system can respect player physical location (no forced walking between buildings)
- **FR42:** The system can offer skill-appropriate matches at the current building within 10 minutes before routing elsewhere
- **FR43:** Court officers can manually assign players to specific buildings
- **FR44:** The system can balance queue load across 3 buildings within 10% variance

### Real-Time Synchronization

- **FR45:** TV displays can show real-time queue updates (position, wait time, next matches)
- **FR46:** TV displays can show time warnings for players approaching their limit
- **FR47:** The court officer dashboard can receive real-time court status updates
- **FR48:** The cashier interface can confirm queue entry instantly after check-in
- **FR49:** The system can gracefully degrade to polling if real-time connection fails
- **FR50:** The system can display connection status indicators when data is stale (>5 seconds old)

## Non-Functional Requirements

### Performance

**Page Load & Response:**
- **NFR-P1:** Court officer dashboard must load within 2 seconds on broadband
- **NFR-P2:** TV displays must load within 1 second
- **NFR-P3:** Cashier check-in interface must load within 1.5 seconds
- **NFR-P4:** All interfaces must achieve Time to Interactive (TTI) within 3 seconds

**Real-Time Operations:**
- **NFR-P5:** Queue updates must be reflected on TV displays within 1-2 seconds of action
- **NFR-P6:** SSE message processing must complete within 100ms
- **NFR-P7:** Court status changes must sync across all interfaces within 2 seconds
- **NFR-P8:** Matchmaking algorithm must generate match suggestions within 5 seconds

**Data Operations:**
- **NFR-P9:** Supabase query responses must complete within 500ms for player lookups
- **NFR-P10:** Session logging must complete within 200ms
- **NFR-P11:** Queue position calculation must complete in real-time (< 100ms)

### Reliability & Availability

**Uptime:**
- **NFR-R1:** System must maintain 99.9% uptime during facility operating hours
- **NFR-R2:** Planned maintenance must occur outside operating hours or with 48-hour notice

**Fault Tolerance:**
- **NFR-R3:** If SSE connection fails, system must gracefully degrade to 2-second polling within 5 seconds
- **NFR-R4:** TV displays must show "Connection Lost" indicator if data is stale (>5 seconds old)
- **NFR-R5:** Court officer dashboard must allow manual refresh if real-time sync fails
- **NFR-R6:** System must attempt automatic reconnection every 5 seconds during connection loss

**Data Integrity:**
- **NFR-R7:** localStorage → Supabase migration must achieve 100% data preservation with zero loss
- **NFR-R8:** System must maintain queue state consistency across all 3 buildings at all times
- **NFR-R9:** Session timers must remain accurate across browser refreshes and connection interruptions

### Security & Privacy

**Data Protection:**
- **NFR-S1:** Player profile data (name, photo, skill level, gender) must be stored securely in Supabase with access controls
- **NFR-S2:** QR codes must be unique and non-guessable
- **NFR-S3:** Court officer and cashier interfaces must require authentication
- **NFR-S4:** Session tokens must expire after 8 hours of inactivity

**Access Control:**
- **NFR-S5:** Only court officers can access the unified dashboard
- **NFR-S6:** Only cashiers can access check-in interface
- **NFR-S7:** TV displays must be read-only (no data modification capabilities)
- **NFR-S8:** Players can only view their own stats (not other players' data)

### Scalability

**Current Scale:**
- **NFR-SC1:** System must support 200+ concurrent daily players without performance degradation
- **NFR-SC2:** System must handle 12 courts across 3 buildings simultaneously
- **NFR-SC3:** Queue system must support up to 100 players in queue at any given time

**Growth Capacity:**
- **NFR-SC4:** System architecture must support 2x player growth (400 daily players) with minimal infrastructure changes
- **NFR-SC5:** Database schema must support addition of new buildings/courts without major refactoring

### Usability

**Interface-Specific:**
- **NFR-U1:** TV displays must use minimum 24px body text and 48px+ headers for readability from 10+ feet
- **NFR-U2:** Court officer dashboard touch targets must be minimum 44×44px for tablet interaction
- **NFR-U3:** Cashier check-in flow must complete in under 45 seconds for new players, under 20 seconds for returning players
- **NFR-U4:** System must provide clear visual feedback for all user actions within 200ms

**Error Handling:**
- **NFR-U5:** All error messages must be user-friendly and actionable (no technical jargon)
- **NFR-U6:** System must prevent invalid state transitions (e.g., queuing while playing)

### Browser Compatibility

**Supported Browsers:**
- **NFR-B1:** System must fully support latest 2 versions of Chrome, Firefox, Safari, and Edge (Chromium-based)
- **NFR-B2:** System must degrade gracefully in unsupported browsers with clear messaging
- **NFR-B3:** No support required for Internet Explorer or mobile phone browsers

### Accessibility

**Minimum Compliance:**
- **NFR-A1:** System must meet WCAG 2.1 Level A compliance
- **NFR-A2:** All interactive elements must support keyboard navigation (Tab, Enter, Space)
- **NFR-A3:** Color contrast must be minimum 4.5:1 for normal text, 3:1 for large text
- **NFR-A4:** All icons and images must have appropriate alt text

**Explicitly Out of Scope:**
- Screen reader optimization beyond basic semantic HTML
- WCAG AA or AAA compliance
- Extensive ARIA labels (only where semantically essential)
