# Alani

Alani is a real-time football (soccer) dashboard that ingests live data from TxLINE and visualizes match momentum, odds shifts, and events on an interactive, immersive interface. It includes verifiable event proofs minted on the Solana blockchain, community-focused features, and an AI-driven commentator.

## Built on Real Fan Insights

We didn't just build based on vibes. Before writing code, we surveyed fans on X (Twitter) during the 2026 World Cup to understand their actual pain points with the official apps and the overall viewing experience. The feedback revealed clear gaps:
- **Official App Issues:** Buggy, ad-heavy navigation that traps users, lacks deep stats, and fails at personalization.
- **Matchday & Viewing Experience:** A hyper-commercial, TV-first feel that lacks atmosphere for remote viewers and fails to explain crucial moments (like VAR decisions) clearly.
- **Community Disconnect:** Awful broadcast times for international fans and a lack of tools to foster real community beyond generic chat rooms.

Instead of building a generic sports app, we asked how TxLINE's real-time, normalized, and timestamped data could solve these specific frustrations. We mapped these insights directly to Alani's core features:

- **"I can't be at the stadium and my TV feels lonely."**
  *The Insight:* Fans watching remotely don't just miss information—they miss feeling the room react with them.
  *Our Solution:* **The Danger Meter & Pulse**. A live atmosphere layer that visualizes match momentum and stats swings in real-time, syncing viewers to the actual tension of the match.

- **"VAR just overturned a goal and nobody explains why—I just feel robbed."**
  *The Insight:* Fans need to understand not just *what* happened, but *how much it mattered* to the game's outcome.
  *Our Solution:* **The Analyst**. An AI football pundit that instantly provides plain-language explanations of complex events and real-time odds swings, quantifying the exact impact of every decision.

- **"My friends are scattered across time zones, and the community aspect is missing."**
  *The Insight:* Official apps feel corporate, ad-heavy, and lack tools for fans to connect locally when matches are at awkward hours.
  *Our Solution:* **Watch Party Near Me**. A geo-based community map that empowers fans to find, pin, and organize local watch parties, turning a disconnected global broadcast into a shared local experience.

## Features

- **Real-time Event Feed**: Streaming match events with narrative generation and odds impact analysis.
- **Danger Meter**: Dynamic possession visualization indicating the immediate threat level of the current play.
- **Match Replay Engine**: Test and demonstrate system capabilities using historical match data.
- **On-chain Event Proofs**: Verify significant match events on the Solana blockchain directly from the UI.
- **The Analyst (New!)**: A dynamic, picture-in-picture AI football pundit that narrates match events in real-time using ElevenLabs TTS and Web Audio lip-syncing.
- **Watch Party Near Me (New!)**: A community map powered by Mapbox to discover and register local fan watch parties around the world.

## Architecture

Alani is built using a modern, scalable Web3 technology stack:

```mermaid
graph TD
    %% Styling
    classDef client fill:#3b82f6,stroke:#1d4ed8,stroke-width:2px,color:#fff
    classDef api fill:#8b5cf6,stroke:#6d28d9,stroke-width:2px,color:#fff
    classDef external fill:#10b981,stroke:#047857,stroke-width:2px,color:#fff
    classDef db fill:#f59e0b,stroke:#b45309,stroke-width:2px,color:#fff
    classDef blockchain fill:#14b8a6,stroke:#0f766e,stroke-width:2px,color:#fff

    %% Nodes
    Client[Next.js Client App<br/>React 19 / Zustand]:::client
    NextAPI[Next.js Edge API<br/>SSE Proxy]:::api
    TxLINE[TxLINE<br/>Raw TCP Feed]:::external
    
    ElevenLabs[ElevenLabs<br/>Streaming TTS]:::external
    Mapbox[Mapbox<br/>Maps & Geo]:::external
    Supabase[(Supabase<br/>PostgreSQL)]:::db
    Solana((Solana<br/>Devnet)):::blockchain

    %% Edges
    Client -- "Match Events (SSE)" --> NextAPI
    NextAPI -- "TCP Stream" --> TxLINE
    
    Client -- "Real-time Narration" --> ElevenLabs
    Client -- "Watch Parties" --> Supabase
    Client -- "Map Rendering" --> Mapbox
    Client -- "Mint Event Proofs" --> Solana
```

- **Frontend Core**: Next.js 16 (App Router) with React 19, offering hybrid SSR/SSG rendering for rapid load times.
- **Styling**: Tailwind CSS combined with highly-customized CSS variables for a dynamic, modern aesthetic.
- **State Management**: Zustand for global, lightning-fast store updates (essential for processing the high-frequency event stream).
- **Live Data Ingestion**: Next.js Edge API routes handle Server-Sent Events (SSE), bridging raw TxLINE data directly to the client.
- **Geospatial & Community**: Mapbox SDK (`react-map-gl/mapbox`) handles watch party localization, with Supabase (PostgreSQL) managing geospatial storage and CRUD operations.
- **AI Integration**: ElevenLabs Streaming API and native Web Audio APIs are used for real-time TTS narration and synchronized lip-sync amplitude analysis.
- **Blockchain/Web3**: Solana Web3.js and Anchor handle the minting of on-chain verifiable event proofs.

---

## Getting Started

### 1. Prerequisites

Before running the application, you'll need API keys for the following services:
- **Supabase**: For database hosting (Watch Parties feature).
- **Mapbox**: For rendering maps (Watch Parties feature).
- **ElevenLabs**: For AI voice generation (The Analyst feature).

### 2. Environment Variables

Create a `.env.local` file in the root directory and add the following variables:

```env
# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_public_token

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key

# ElevenLabs (The Analyst)
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_VOICE_ID=your_elevenlabs_voice_id
ELEVENLABS_MODEL_ID=eleven_flash_v2_5

# Solana & Dev
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
NEXT_PUBLIC_SOLANA_RPC=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_DEMO_FIXTURE_ID=18202701
```

### 3. Database Setup

To use the Watch Party Near Me and Fan Profile (Form Score) features, you need to configure your Supabase database:

1. Open your Supabase Dashboard and navigate to the **SQL Editor**.
2. Run the SQL script located in `scripts/setup_watch_parties.sql` to enable Watch Parties.
3. Run the SQL script located in `scripts/setup_fan_profiles.sql` to enable Fan Profiles and Form Scores.
*(Note: If the tables aren't created, the application has local fallbacks so demos won't break!)*

### 4. Running the Development Server

Install dependencies and start the Next.js development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Known Limitations

- **Replay speed is approximate.** Historical batch events are dispatched at a fixed interval rather than true wall-clock timing. A 5-minute batch that had 3 events fires them evenly spaced — in reality they may have been bunched in 30 seconds. The emotional arc is accurate; the exact timing is not.
- **Lineup formation is inferred, not sourced.** TxLINE provides player position IDs and unit IDs but not a formation string (e.g. "4-3-3"). The formation label is derived from grouping players by unitId. It is correct for standard shapes but occasionally wrong for teams using hybrid shapes.
- **On-chain proof runs asynchronously.** Verification can lag 10–30 seconds depending on Solana devnet congestion. We do not block the UI while waiting for confirmation.
- **SSE proxy adds one network hop.** We tunnel the raw TxLINE TCP feed through a Next.js Edge route to convert it to SSE for the browser. In production, a dedicated WebSocket gateway in Rust or Go would slice 20-40ms off the delivery time.

## What's Next (Future Vision)

Our roadmap is driven by the same philosophy: solving real fan problems using TxLINE's unique data shape. Future features we are exploring include:

- **"Longshot" (Underdog Discovery):** Why is every app built for the neutral fan? Longshot surfaces giant-killing opportunities as they happen by watching odds drift across *all* active games at once. It turns TxLINE's cross-competition schema into a discovery engine: *"A team you've never heard of just became a 40% chance to beat a former champion—watch now."*
- **The Recap Engine:** For fans who fell asleep during the late kickoff, this generates a personalized, spoiler-paced digest built from the actual score/odds event timeline rather than a human-edited highlight reel. It reconstructs the emotional arc of the match based on market volatility, pacing the reveal so tension builds just as it did live.
- **Asynchronous Watch Parties:** Solving the international kickoff problem. Friends record short reactions pinned to match-clock timestamps. The app resurfaces your friend's reaction to you at the *exact moment* you hit that point in the match, even if they watched it eight hours earlier, using TxLINE's cryptographically verified event timestamps.
- **Adopt a Team:** A top-of-funnel feature for casual fans. Based on a quick quiz, the app assigns you a team and feeds you just enough context before each match—one storyline, one player, one stat that matters—sourced directly from TxLINE data to make the tournament accessible to newcomers.
- **Predictive Event Queuing:** Using historical sequences to pre-warm the UI for likely upcoming events before the TCP packet arrives.
- **Deep Solana Integration:** Minting the verifiable event proofs as compressed NFTs (cNFTs) to serve as a persistent "Fan Passport" across the ecosystem.
