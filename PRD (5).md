# MediSetu: Product Requirements Document

**Tagline:** Understand your prescription, in your language.
**Event:** CurserFlow Mini Hackathon, 18 Nov 2026 (individual)
**Problem Statement:** AI-Powered Medical Communication Assistant

---

## 1. Problem
Patients, especially elderly and non-English speakers, struggle to understand prescriptions and medical instructions written in jargon, abbreviations, or unfamiliar languages. This leads to missed doses, wrong usage, and poor patient-provider communication.

## 2. Goal
A simple web app where a user uploads a prescription image and instantly gets a plain-language explanation in their own language, with a voice readout.

**Success criteria (demo day)**
- Works end to end on 2-3 sample prescriptions
- Result appears in under ~15 seconds
- English and Hindi output both work
- Voice readout works
- A first-time user can use it without instructions

## 3. Target Users
- **Primary:** Patients with low health or English literacy (elderly, rural, non-English speakers)
- **Secondary:** Caregivers (family members) helping them

## 4. Scope

### In scope (MVP)
| # | Feature | Description |
|---|---|---|
| 1 | Upload / capture | Upload from gallery or capture via camera |
| 2 | AI extraction | Vision LLM reads medicines, dose, timing, instructions |
| 3 | Simple explanation | Per medicine: name, what it is for, dose, when to take |
| 4 | Language toggle | English / Hindi |
| 5 | Listen | Text-to-speech readout of the result |
| 6 | Medicine timeline | Morning / afternoon / night icons |
| 7 | Verify note | "Please verify with your doctor" notice, plus a flag for unclear text |

### Out of scope
Login, history, database, doctor-view translation, share/WhatsApp export, diagnosis or dosage recommendations.

### Stretch (only if time remains)
"Questions to ask your doctor" card.

## 5. User Flow
1. **Home:** large "Upload prescription" button plus language picker
2. **Processing:** spinner with a short message
3. **Result:** medicine cards, timeline, and a large "Listen" button

## 6. Functional Requirements
- **FR1:** Accept JPG/PNG (max ~5 MB); compress client-side before upload.
- **FR2:** Backend `POST /analyze` takes the image and language, and returns structured JSON.
- **FR3:** The LLM returns only what is visible on the prescription; unreadable items are flagged `low_confidence`.
- **FR4:** The UI renders JSON into cards and a timeline.
- **FR5:** Language switch re-requests or re-renders the explanation in the chosen language.
- **FR6:** Listen button reads the explanation aloud in the selected language.
- **FR7:** Clear error states (bad image, API failure, no medicines found).

### Response schema
```json
{
  "medicines": [
    {
      "name": "Paracetamol 500mg",
      "purpose": "Reduces fever and pain",
      "dose": "1 tablet",
      "timing": ["morning", "night"],
      "instructions": "Take after food",
      "duration": "5 days",
      "low_confidence": false
    }
  ],
  "summary": "Short overall explanation",
  "disclaimer": "This is not medical advice. Please verify with your doctor."
}
```

## 7. Non-Functional Requirements
- **Usability:** large fonts and buttons, icon-led, mobile-first, one primary action per screen
- **Performance:** result in under ~15 s
- **Privacy:** no storage of images or results; images processed in memory only
- **Safety:** explain only, never diagnose or change doses; always show the disclaimer
- **Reliability:** graceful failure and a backup demo recording

## 8. Tech Stack
| Layer | Choice |
|---|---|
| Frontend | React + Vite + Tailwind |
| Backend | FastAPI (Python) with CORS enabled |
| AI | One vision-capable LLM API (Gemini or Claude), JSON output |
| Voice | Browser Web Speech API (fallback: gTTS) |
| Database | None |
| Build tool | Cursor |
| Deploy | Vercel (frontend), Render (backend) |

API keys live in the backend `.env` and are never committed.

## 9. Build Plan (test after each step)
1. Scaffold React + FastAPI, with one test endpoint connected
2. Upload UI + `/analyze` returning mock JSON
3. Replace the mock with the real LLM vision call
4. Render medicine cards and timeline
5. Language toggle + Listen button
6. Verify note, loading and error states, mobile polish
7. Deploy, record backup demo, prepare pitch

## 10. Risks and Mitigations
| Risk | Mitigation |
|---|---|
| Messy handwriting misread | Low-confidence flag, clean sample prescriptions for demo |
| Poor Hindi browser voice | Test early; fallback to gTTS |
| API latency or failure | Spinner, retry, cached sample result, backup video |
| Wrong medical info | Disclaimer, explain-only prompt, no dosage advice |
| Time overrun | Strict MVP; stretch features only after the MVP works |

## 11. Demo Script (about 2 minutes)
1. **Problem (15s):** an elderly patient cannot read an English prescription.
2. **Live demo (90s):** upload → explanation → switch to Hindi → tap Listen.
3. **Close (15s):** built with Cursor; a vision LLM powers the understanding; no data stored; next steps are more languages and a doctor-view.
