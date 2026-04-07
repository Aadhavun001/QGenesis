# QGenesis

AI-powered academic question bank generation platform.

## Project structure

- **`frontend/`** — React + Vite + TypeScript app (UI, auth, Firebase client, OpenAI integration). Run from here: `cd frontend && npm install && npm run dev`
- **`backend/`** — Backend services (Python material extraction API). Firebase Firestore will be integrated here for database and server-side logic.
- **`readme/`** — Documentation: main [README](readme/README.md), setup guides, and project docs.

## Quick start

```bash
cd frontend
npm install
npm run dev
```

Open http://127.0.0.1:8080/

See **readme/README.md** for full overview and **readme/** for setup guides (Firebase, OpenAI, etc.).
