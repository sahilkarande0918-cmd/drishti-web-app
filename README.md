# Drishti

Drishti is a browser-based AI accessibility assistant prototype for hackathons, portfolio demos, and startup MVP presentations.

## Stack

- React + Vite
- TailwindCSS
- Supabase, with localStorage demo fallback
- Grok/xAI API for voice and vision intelligence
- OpenStreetMap, Leaflet, and OSRM
- Web Speech API and SpeechSynthesis API
- Framer Motion
- Lucide React

## Run Locally

```bash
npm install
npm run dev
```

## Environment Variables

Create `.env.local` for live integrations:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_XAI_API_KEY=your_xai_api_key
VITE_XAI_CHAT_MODEL=grok-4.3
VITE_XAI_VISION_MODEL=grok-4
```

Supabase is optional and falls back to localStorage. Grok is required for smart voice and AI vision responses.

## Supabase

Run the SQL in [docs/supabase-schema.sql](docs/supabase-schema.sql) to create the prototype tables.

This prototype uses light demo auth: onboarding creates or updates a demo profile without password login. Row Level Security policies are not included.

## Build

```bash
npm run build
```
