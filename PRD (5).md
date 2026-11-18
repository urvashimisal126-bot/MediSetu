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

# MediSetu: Feature Prompt "Match My Medicine"

> Use in Cursor Agent mode AFTER the MVP works end to end.
> Attach `@PRD.md`, `@backend/main.py`, and the result-page and upload components.
> Build in the 4 steps below. Stop after each step, tell me how to test, and wait for "next".

---

## GOAL
Add a feature to the result page: **"Check my medicine"**. The user photographs the real medicine strip or box from the pharmacy. The AI reads the label and checks it against the medicine list from the already-analyzed prescription, then shows **Match / No match / Unclear** for each photo.

## RULES
- Reuse the existing Gemini client, image resize helper, validation, error handling, `USE_MOCK` flag, and the existing design system (colors, cards, icons, framer-motion).
- Do not change existing endpoints or break the current flow.
- No database, no storage of images or results.
- Compare only the **name and strength** printed on the label. Never claim a medicine is genuine, safe, or fake. Never suggest alternatives or doses.
- Always show: "Please confirm with your pharmacist."
- Support English and Hindi, following the language already selected.

## BACKEND

**New endpoint: `POST /verify`** (multipart form)
- `image`: photo of the medicine strip or box (jpg/png/webp, max 5 MB; same validation and resize as `/analyze`)
- `medicines`: JSON string of the medicine list from the earlier `/analyze` result (names, doses)
- `language`: `en` | `hi`

**Behavior**
- If `USE_MOCK=true`, return a realistic mock (one match, one no-match case) instantly.
- Otherwise, send the image plus the medicine list to Gemini with the prompt below, request JSON only, validate it, retry once on a parse failure, and map errors as in `/analyze` (400 bad file, 422 unreadable label, 502 AI failure).

**LLM system prompt (use this)**
> You are a pharmacy label reader. You are given a photo of a medicine strip or box, and a list of medicines from a patient's prescription. Read only the text visibly printed on the label: brand name, generic or salt name, and strength. Decide whether it matches any medicine in the prescription list. Brand and generic names can differ: treat a medicine as a match if the active ingredient and strength match. If the label is blurry, partial, or unreadable, return `unclear`. Do NOT judge whether the medicine is genuine, safe, expired, or fake. Do NOT give medical advice. Explain the result in one short, simple sentence in the requested language. Return ONLY valid JSON matching the schema.

**Response schema**
```json
{
  "detected": {
    "name": "text read from the label",
    "strength": "e.g. 500mg"
  },
  "status": "match | no_match | unclear",
  "matched_medicine": "name from the prescription, or null",
  "message": "one short, simple sentence",
  "reason": "brief reason, e.g. strength differs from prescription",
  "disclaimer": "Please confirm with your pharmacist.",
  "language": "en"
}
```

## FRONTEND

**Entry point:** on the result page, below the medicine cards and timeline, add a prominent card: pill-bottle or scan icon, title "Check my medicine", subtitle "Photograph the strip or box from the pharmacy". Button: "Scan medicine".

**Flow**
1. Opens a modal or bottom sheet with camera/gallery upload and a preview (reuse the existing upload and compression component).
2. On submit, call `/verify` with the image, the current medicine list, and the language. Show a short loader ("Reading the label...").
3. Show the result card:
   - ✅ **Match** (green): "Matches your prescription: [medicine]". Highlight the matching medicine card in the list above with a green check.
   - ⚠️ **No match** (amber): "This doesn't match anything on your prescription. Please ask your pharmacist." Show what was detected on the label.
   - ❔ **Unclear** (grey): "We couldn't read the label clearly. Try a closer, well-lit photo." Offer a retry.
4. Always show the pharmacist disclaimer.
5. A Listen button reads the result message (reuse `useSpeech`).
6. Allow scanning multiple medicines in a row, keeping a small checklist: each prescription medicine shows "Verified ✓" once it has a match.

**UX**
- Large buttons, simple wording, consistent with the existing design.
- Animate the status icon (scale or check draw) with framer-motion.
- Handle errors with a friendly message and a retry button.

## STEPS (stop after each)
1. **Backend `/verify` with `USE_MOCK=true`:** validation, resize, mock response. Give me a curl command to test.
2. **Frontend UI:** the "Check my medicine" card, modal, upload, and the three result states using the mock.
3. **Checklist and highlight:** the "Verified ✓" state on matching medicine cards, multi-scan support, and Listen.
4. **Real AI:** Gemini integration using the prompt above, with retry and error mapping. Tell me which files changed.

Begin with Step 1 only.