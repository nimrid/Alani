# Alani

> **The second screen football actually deserves.**
> Real-time match intelligence, on-chain fan moments, and an AI analyst — built on verified live data from TxLINE.

---

## Built on Real Fan Insight

Alani didn't start with a feature list. It started with a problem: **the official World Cup 2026 app is genuinely terrible, and the broader category of "fan experience apps" is full of novelty that doesn't solve anything real.**

### The Research: 2026 World Cup Fan Frustrations

Before writing a single line of code, the founding research mapped real pain points from fans during the 2026 World Cup (ongoing across the US, Canada, and Mexico) — sourced from X/Twitter communities, app store reviews, and direct supporter feedback.

#### What fans actually complained about

**The Official App**
- Buggy, laggy navigation that traps users in dead ends
- Poor onboarding that forces a FIFA ID before showing anything useful
- Schedule view capped at ~6 fixtures with no deep filtering
- Heavy ads overlaid on actual content
- No deep stats, no player comparisons, no formation data
- Ticket management that fails at critical moments — missing tickets, broken transfers, separate apps required for different functions
- Near-universally called one of the worst major tournament apps ever shipped

**Ticketing & Access**
- Dynamic pricing with unchecked scalping driving face-value tickets out of reach
- Visa refusals blocking travelling fans and even players' families
- Enormous stadiums (NFL-scale) sitting with visible empty blocks despite "sold out" labels

**Matchday & Stadium Experience**
- Overpriced food, transport, and accommodation
- Poor pitch quality in several venues
- Hydration and ad breaks killing match momentum at critical moments
- Bad kick-off times for fans outside the host continent
- Suspicious VAR decisions with zero explanation provided to fans in-stadium or at home
- An overwhelming "TV-first, commercial-first" feel that prioritises broadcaster revenue over supporter atmosphere

**Watching From Home**
- Awful broadcast windows for fans outside North America
- Ad-saturated streams with no opt-out
- No real-time stats beyond goals and yellow cards
- No way to feel connected to other fans watching the same game across time zones

#### The Six Questions Alani Was Built to Answer

This research produced six specific questions — each a real fan experience gap — that shaped every feature decision:

---

**1. "I can't be at the stadium and my TV feels lonely — how do I feel the crowd?"**

The insight: what fans miss most watching alone isn't information, it's *feeling the room react with you*. Alani's live event feed and AI narration turn TxLINE's real-time odds-swing data into a shared atmospheric signal — rising tension you can *feel* in the card, not just read in the score.

---

**2. "VAR just overturned a goal and nobody explains why — I just feel robbed."**

The insight: VAR controversy isn't anger at the decision, it's anger at the opacity. The instant a score event reverses, Alani surfaces a plain-language explanation *plus* the real-time odds swing — showing not just *what* happened but *how much it mattered*, quantified. This reframes "the refs robbed us" into "here's the actual stakes of that decision."

---

**3. "I fell asleep during the late kickoff — how do I catch up without a boring highlight reel?"**

The insight: a highlight reel is curated by someone else's idea of what mattered. A replay built from score and odds *volatility* reconstructs the emotional arc as it actually happened. That's the Replay Engine — events in order, weighted by real impact.

---

**4. "My friends are scattered across three continents — how do we watch 'together'?"**

The insight: the international kickoff problem is fundamentally async. Watch parties built around real-time chat don't work across time zones. Alani's Watch Party Near Me addresses the local side; the Async Watch Party in the roadmap addresses the global async problem.

---

**5. "I only care about one team — why is every app built for the neutral fan?"**

The insight: most sports apps display everything equally. TxLINE's normalized cross-competition schema makes it possible to surface what matters *specifically to you* — your team's odds movement, fixture context, player stats — rather than a generic everything-feed.

---

**6. "I don't follow football closely enough to have opinions — I just want to belong in the conversation."**

The insight: every World Cup cycle brings tens of millions of casual, first-time viewers not served by deep-stats products. Alani's Technical Analysis and the roadmap "Adopt a Team" feature are explicitly for fans who need just enough context — one storyline, one player, one stat — to feel like they're part of it.

#### The Filter That Matters

> *"If the idea would work identically with any sports API, you haven't used what makes TxLINE actually different."*

Every feature in Alani passes this test. TxLINE provides real-time, normalized data across all fixtures simultaneously, with cryptographically verifiable timestamps. That specific combination — cross-competition, real-time, cryptographically anchored — is what makes on-chain event proofs, instant AI narration tied to exact match-clock moments, and replay reconstruction from verified event sequences *possible* in Alani, and not possible with a generic sports API.

---

## What Alani Is

Alani is a **real-time football companion app** for the 2026 World Cup and beyond. It streams live match data from TxLINE, runs AI analysis via Claude (Anthropic), mints verifiable fan moments on Solana, and surfaces community features through Supabase.

| Pillar | What it does |
|---|---|
| **Live Intelligence** | Real-time event feed with AI narration, danger meter, probability curve |
| **On-Chain Proof** | Mint significant match events as verifiable Solana transactions |
| **Replay Engine** | Navigate completed match timelines with Alani AI tactical breakdown |
| **Fan Profile** | Wallet-linked identity, verified moments, Form Score |
| **Community** | Watch party map, geo-based fan discovery |

---

## Features

### Live Match Page (`/match/[fixtureId]`)
- **Real-time event feed** — streams TxLINE's SSE scores channel; renders every significant action (goals, cards, VAR, substitutions, shots, corners, fouls) with AI-narrated captions
- **Danger Meter** — possession-type visualisation (safe → danger → high danger → attack) driven by TxLINE's `PossessionType` field
- **Live probability bar** — home win / draw / away win percentages in real-time from TxLINE odds stream
- **Probability curve** — historical win probability chart across match duration from odds snapshot
- **Lineup panel** — starting XIs resolved from TxLINE's `lineups` SSE action
- **On-chain event proofs** — any significant event can be minted as a Solana transaction with the TxLINE timestamp embedded; verifiable permanently
- **The Analyst** — AI pundit avatar voiced via ElevenLabs TTS with Web Audio lip-sync amplitude analysis, narrating events in real-time

### Match Replay Page (`/replay`)
- **Event timeline** — all significant actions from a completed match, split into First Half / Second Half / Extra Time
- **Playback controls** — play, pause, skip, clickable scrub bar to jump to any point
- **Running score per goal** — each goal event shows the score at that exact moment
- **Team attribution** — all events labelled home/away using TxLINE's `Participant` field
- **Event details** — goal type (header, tap-in), VAR outcome (overturned/upheld), shot on/off target, substitution player IDs
- **Alani Technical Analysis** — one-click streaming AI tactical breakdown using Claude, rendered in real-time Markdown
- **Ask Alani** — conversational AI assistant (unlocks after analysis completes) for match questions

### Home Page (`/`)
- Live matches with real-time score and danger indicator
- Completed matches with final scores and replay links
- Scheduled matches with kickoff times
- Kickoff reminder notifications

### Fan Profile (`/profile`)
- **Wallet-linked identity** — connect Solana wallet for persistent fan identity
- **Form Score** — engagement metric from verified on-chain moments
- **Verified Moments** — history of on-chain proofs with match names resolved from fixture metadata

### Watch Party Near Me
- Mapbox-powered global map of fan watch parties
- Create, discover, and RSVP to local events
- Geo-based filtering

---

## Architecture

### System Overview

```mermaid
graph TD
    classDef client fill:#6d28d9,stroke:#4c1d95,color:#fff
    classDef nextapi fill:#1d4ed8,stroke:#1e3a8a,color:#fff
    classDef external fill:#047857,stroke:#064e3b,color:#fff
    classDef db fill:#b45309,stroke:#78350f,color:#fff
    classDef chain fill:#0f766e,stroke:#134e4a,color:#fff
    classDef ai fill:#be185d,stroke:#831843,color:#fff

    subgraph Browser["Browser Client"]
        UI["Next.js App Router\nReact 19 + Zustand"]:::client
        WA["Web Audio API\nLip-sync engine"]:::client
    end

    subgraph NextServer["Next.js Server"]
        SSEProxy["/api/txline/scores-stream\nSSE Proxy"]:::nextapi
        OddsProxy["/api/txline/odds-stream\nOdds Proxy"]:::nextapi
        SnapAPI["/api/txline/scores-snapshot"]:::nextapi
        FixAPI["/api/txline/fixtures"]:::nextapi
        NarrAPI["/api/narrate\nEvent narration"]:::nextapi
        AnalyzeAPI["/api/analyze\nMatch analysis"]:::nextapi
        AskAPI["/api/analyst/ask\nConversational AI"]:::nextapi
        ProofAPI["/api/txline/proof\nSolana mint"]:::nextapi
    end

    subgraph TxLINE["TxLINE Data"]
        ScoresFeed["Scores SSE Feed"]:::external
        OddsFeed["Odds SSE Feed"]:::external
        SnapshotEP["Snapshot Endpoint"]:::external
        FixturesEP["Fixtures Endpoint"]:::external
    end

    Claude["Anthropic Claude\nHaiku 4.5"]:::ai
    ElevenLabs["ElevenLabs\nStreaming TTS"]:::ai
    Supabase[("Supabase\nPostgreSQL")]:::db
    Mapbox["Mapbox GL"]:::external
    Solana(("Solana\nMainnet")):::chain

    UI -- "SSE" --> SSEProxy
    UI -- "SSE" --> OddsProxy
    SSEProxy --> ScoresFeed
    OddsProxy --> OddsFeed
    UI --> SnapAPI --> SnapshotEP
    UI --> FixAPI --> FixturesEP
    UI --> NarrAPI --> Claude
    UI --> AnalyzeAPI --> Claude
    UI --> AskAPI --> Claude
    UI --> ElevenLabs
    WA -. "amplitude" .-> UI
    UI --> Supabase
    UI --> Mapbox
    UI --> ProofAPI --> Solana
```

### Live Match Data Flow

```mermaid
sequenceDiagram
    participant Browser
    participant Proxy as Next.js SSE Proxy
    participant TxLINE
    participant Zustand as Zustand Stores
    participant Claude
    participant ElevenLabs

    Browser->>Proxy: Open SSE /api/txline/scores-stream?fixtureId=X
    Proxy->>TxLINE: Connect scores TCP feed
    TxLINE-->>Proxy: Continuous event stream
    Proxy-->>Browser: Proxied SSE

    loop Each significant event
        Browser->>Zustand: detectEvents() → EventStore.addEvent()
        Zustand-->>Browser: Re-render event cards
        Browser->>Claude: POST /api/narrate (streaming)
        Claude-->>Browser: Streamed narration text
        Browser->>ElevenLabs: POST TTS
        ElevenLabs-->>Browser: Audio stream
        Browser->>Browser: Web Audio lip-sync
    end

    Browser->>Zustand: Score → ScoreStore
    Browser->>Zustand: Possession → PossessionStore
    Browser->>Zustand: Lineups → LineupStore
```

### Zustand State Architecture

```mermaid
graph LR
    classDef store fill:#7c3aed,stroke:#5b21b6,color:#fff
    classDef ui fill:#1d4ed8,stroke:#1e3a8a,color:#fff

    SS["ScoreStore\nhome/away goals\nstatusId / minute"]:::store
    ES["EventStore\nevents[]\npendingProof\nverifiedTimestamps"]:::store
    LS["LineupStore\nteam lineups\nplayer data"]:::store
    PS["PossessionStore\npossessionType"]:::store
    CS["ConnectionStore\nscores/odds status"]:::store
    AS["AudioStore\nvolume level"]:::store

    MH["Match Header"]:::ui
    EF["Event Feed"]:::ui
    DM["Danger Meter"]:::ui
    LP["Lineup Panel"]:::ui
    PB["Probability Bar"]:::ui

    SS --> MH
    ES --> EF
    LS --> LP
    PS --> DM
    CS --> MH
    SS --> PB
```

### Key Technical Decisions

| Decision | Rationale |
|---|---|
| **SSE over WebSocket** | TxLINE exposes a TCP SSE feed; Next.js Edge routes proxy it cleanly without raw socket management |
| **Zustand over Context/Redux** | High-frequency TxLINE updates (~800ms) need zero-overhead state. `getState()` outside React avoids re-render thrashing in hot paths |
| **Streaming AI via ReadableStream** | Claude and ElevenLabs responses stream directly to the client — no buffering, no waiting for full completion |
| **Score from `Score` object, never `Stats`** | TxLINE's `Stats` numeric keys map to different things per context — `Stats['2']` is **corners**, not goals. We exclusively read from the `Score` object |
| **Solana Devnet** | On-chain event proofs are minted on devnet during development. Swapping to mainnet is a single env var change when ready to ship |

---

## Getting Started

### Prerequisites

API keys for: TxLINE, Anthropic, Supabase, Mapbox, ElevenLabs

### Environment Variables

Create `.env.local` in the project root:

```env
# TxLINE
TXLINE_API_ORIGIN=https://txline-dev.txodds.com
TXLINE_API_BASE=https://txline-dev.txodds.com/api
TXLINE_DEV_JWT=your_txline_dev_jwt
TXLINE_DEV_API_TOKEN=your_txline_api_token

# Anthropic
ANTHROPIC_API_KEY=your_anthropic_api_key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key

# ElevenLabs
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_VOICE_ID=your_voice_id
ELEVENLABS_MODEL_ID=eleven_flash_v2_5

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_public_token

# Solana
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com
DEV_WALLET_PUBKEY=your_dev_wallet_pubkey
DEV_WALLET_SECRET=your_dev_wallet_secret_base64

# Demo
NEXT_PUBLIC_DEMO_FIXTURE_ID=18202701
```

### Database Setup

Run from the Supabase SQL Editor:

```bash
scripts/setup_watch_parties.sql   # Watch Party Near Me
scripts/setup_fan_profiles.sql    # Fan Profiles & Form Score
```

> App has graceful fallbacks if tables aren't present — demos won't break.

### Run

```bash
npm install
npm run dev
# Open http://localhost:3000
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2 (App Router) |
| UI | React 19, Tailwind CSS v4, Lucide React |
| State | Zustand 5 |
| Live Data | TxLINE SSE → Next.js Edge proxy |
| AI | Anthropic Claude (Haiku 4.5) |
| Voice | ElevenLabs Streaming TTS + Web Audio API |
| Database | Supabase (PostgreSQL) |
| Maps | Mapbox GL / react-map-gl |
| Blockchain | Solana Web3.js + Anchor (devnet) |
| Charts | Recharts |
| Markdown | react-markdown |

---

## Known Limitations

**Replay speed is approximate.** Historical batch events are dispatched at a fixed interval. A real burst of three events in 30 seconds will be spread evenly across the replay tick. The emotional arc is accurate; the exact timing is not.

**Replay player names show as IDs.** TxLINE's `scores/snapshot` endpoint for historical matches doesn't include lineup data — that arrives only via the `lineups` SSE action during a live match. Player IDs appear as `#ID` in replay; team attribution (home/away) is derived correctly from the `Participant` field.

**Formation inference.** TxLINE provides player position and unit IDs but no formation string. Formation labels are derived from grouping players by `unitId`. Correct for standard shapes; occasionally wrong for hybrid formations.

**On-chain proof is async.** Solana devnet confirmation can lag 10–30 seconds under network congestion. The UI does not block while waiting.

**SSE proxy adds one hop.** The Next.js Edge route adds a network hop between TxLINE and the browser. A dedicated WebSocket gateway in Rust or Go would cut 20–40ms in production.

---

## Roadmap

*Every item below passes the same research filter: does it solve a real fan problem that TxLINE's specific data shape makes uniquely possible?*

### Longshot — Underdog Discovery Engine
Watches odds drift across *all active fixtures simultaneously* and surfaces the moment a rank outsider becomes a genuine threat. One feed: *"A team you've never heard of just became a 40% chance to beat a former champion — watch now."* Turns TxLINE's cross-competition normalised schema into the product itself.

### The Recap Engine
Reconstructs the emotional arc of a missed match from score and odds *volatility* — pacing the spoiler reveal so tension builds the way it did live, even six hours later. Requires companion video content synced to TxLINE timestamps; the data infrastructure already exists.

### Async Watch Parties
Friends record short reactions pinned to match-clock timestamps. The app surfaces your friend's reaction at the exact moment *you* reach that point — even if they watched eight hours earlier. TxLINE's verified timestamps make "the exact moment" possible. Core constraint: spoiler management must be ironclad.

### Adopt a Team
For casual fans. A 30-second quiz assigns a team for the tournament, then feeds just enough context before each match — one storyline, one player to watch, one stat that matters. Explicitly the top-of-funnel feature built for the millions of newcomers every World Cup brings.

### Pulse — Shared Atmosphere Layer
TxLINE's odds-swing data becomes a wordless crowd signal: a colour shift and shared gasp animation firing the instant a stat swings hard — synced to the exact event timestamp so it feels simultaneous across time zones. Lives or dies on latency; if the "shared gasp" lands 8 seconds late, the product breaks.

### Deep Solana Integration
Upgrade on-chain event proofs from raw transactions to compressed NFTs (cNFTs), creating a persistent **Fan Passport**. Each minted moment becomes a collectible credential with the verified TxLINE timestamp as the source of truth.
