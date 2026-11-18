# MediSetu

**Understand your prescription, in your language.**

MediSetu is an AI-powered medical communication assistant that turns prescription photos into clear, plain-language explanations in **English** and **Hindi (हिंदी)** — complete with a visual Morning / Afternoon / Night schedule, low-confidence handwriting flags, doctor questions, and voice readout.

## Features
- **Upload or Camera Capture:** Drag-and-drop JPG/PNG upload or mobile camera capture with client-side image optimization.
- **Gemini Vision Extraction:** FastAPI backend powered by Google Gemini (`gemini-3.8-flash`) with strict structured JSON output.
- **English & Hindi Toggle:** Instant bilingual UI and prescription explanations.
- **Daily Medicine Timeline:** Icon-led Morning, Afternoon, and Night schedule.
- **Voice Readout:** Built-in Web Speech API readout with Play/Pause/Stop and Slow (`0.85×`) / Normal (`1×`) speed controls.
- **Safety First:** Unclear handwriting warnings (`low_confidence`), "Questions to Ask Your Doctor" checklist, always-visible medical disclaimer, and in-memory-only image processing (nothing stored).
- **Sample Prescriptions:** 3 built-in bilingual sample prescriptions ready to try in one click.

## Tech Stack
- **Frontend:** React 19, Vite, Tailwind CSS v4, Framer Motion, Lucide Icons, Axios
- **Backend:** FastAPI, Uvicorn, Pydantic v2, Pillow, Google GenAI SDK (`google-genai`)

## Quick Start

### 1. Backend (FastAPI)
```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
# source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Add your GEMINI_API_KEY in backend/.env
uvicorn main:app --host 127.0.0.1 --port 8001
```

### 2. Frontend (React + Vite)
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5173/` in your browser.
