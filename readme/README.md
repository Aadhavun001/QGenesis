# QGenesis

AI-powered academic question bank and paper workflow platform for colleges/universities.

QGenesis helps staff generate high-quality questions from uploaded material, route them through HOD approval, and manage question/paper workflows with role-based access and real-time sync.

## What The Project Includes

- Role-based dashboards: `staff`, `hod`, `admin`
- Material upload + extraction (PDF/DOCX/PPTX/TXT/image OCR)
- AI question generation with Google Gemini
- AI Assistant chat with per-question regenerate/edit/keep-in-chat
- HOD review/approval and notifications
- Paper creation and submission flow
- Firebase Auth + Firestore + Storage integration
- Responsive UI (mobile/tablet/laptop/desktop)

## Project Structure

```text
QGenesis/
├── frontend/                    # React + Vite + TypeScript app
├── backend/
│   └── material_extraction/     # FastAPI extraction service
├── scripts/                     # helper scripts (e.g., admin user create)
├── readme/README.md             # this file
└── README.md                    # root quick overview
```

## Tech Stack

- Frontend: React 18, TypeScript, Vite, Tailwind, Radix UI, Zustand
- AI: Google Gemini (`@google/generative-ai`)
- Backend extraction: FastAPI (Python), OCR/Textract utilities
- Realtime/Data: Firebase Auth, Firestore, Firebase Storage

## Roles And Permissions

### Staff
- Upload materials
- Generate/edit/regenerate questions
- Use AI Assistant
- Build/submit papers
- Track approvals and notifications

### HOD
- Review submitted questions/papers
- Approve/reject with feedback
- View scoped department/institution/place data
- Handle security/unlock and history workflows

### Admin
- Manage users/roles and platform settings
- Manage app logo/exam types/question types
- View system-level dashboards/analytics

## Local Development Setup

## Prerequisites

- Node.js 18+
- npm
- Python 3.10+ (for extraction backend)
- Firebase project configured
- Gemini API key

## 1) Frontend

```bash
cd "/Users/aadhi/Documents/Projects/QGenesis/frontend"
npm install
npm run dev -- --port 8081
```

Frontend URL: `http://127.0.0.1:8081`

## 2) Backend (Material Extraction API)

```bash
cd "/Users/aadhi/Documents/Projects/QGenesis/backend/material_extraction"
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8080 --reload
```

Backend URL: `http://127.0.0.1:8080`  
API docs: `http://127.0.0.1:8080/docs`

## Environment Configuration

Frontend uses Vite env vars (`frontend/.env`):

```env
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_USE_FIREBASE_EMULATOR=false
```

Firebase config is initialized in:
- `frontend/src/services/firebase/firestore-config.ts`

## Firebase Requirements

Before production:
- Enable Authentication providers you use (Email/Password, Google, Phone)
- Set Firestore Rules (role/scope based)
- Set Storage Rules (owner/scope/admin-safe)
- Add deployment domain to Firebase Auth authorized domains

## AI Assistant Workflow (High Level)

- Detects question-generation prompts
- Supports config-first and direct generation paths
- Saves generated questions to Firestore chat messages
- Supports per-question:
  - edit
  - regenerate question + answer
  - regenerate answer only
  - keep in chat (single/selected/all)
- Persists transcript and generated panel state dynamically

## Realtime Sync

App mounts realtime listeners for:
- questions
- papers
- notifications

These keep dashboard stats and lists updated live.

## Build For Production

```bash
cd "/Users/aadhi/Documents/Projects/QGenesis/frontend"
npm run build
```

## Deployment Recommendation

- Frontend: Vercel (fastest/easiest free start)
- Backend extraction API: Render (free tier friendly)
- Firebase: Auth + Firestore + Storage

## Push To GitHub

From project root:

```bash
cd "/Users/aadhi/Documents/Projects/QGenesis"
git add .
git commit -m "docs: update project README"
git push
```

## Troubleshooting

- If auth page navigation seems stale after logout, ensure latest auth/session changes are pulled.
- If another tab user session conflicts, use session persistence (already configured).
- If file extraction fails, verify backend is running on `8080`.
- If AI generation fails, verify Gemini API key and Firebase access rules.

## Notes

- Keep secrets out of Git (`.env`, service account keys).
- Do not commit `backend/material_extraction/venv/`.

---

If you are new to QGenesis, start by running backend + frontend locally, register a staff user, upload material, generate questions, then test HOD review flow.
