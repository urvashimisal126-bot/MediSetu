import io
import json
import os
import time
from PIL import Image, UnidentifiedImageError
from google import genai
from google.genai import errors as genai_errors
from google.genai import types

from samples import DISCLAIMER_EN, DISCLAIMER_HI, get_mock_analysis
from schemas import AnalysisResponse, GeminiPrescriptionOutput, LanguageCode

MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MB
MAX_IMAGE_DIMENSION = 1600
ALLOWED_FORMATS = {"JPEG", "JPG", "PNG", "WEBP"}


class PrescriptionError(Exception):
    def __init__(self, message: str, status_code: int = 400, code: str = "analysis_error"):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code


def is_api_key_valid_format(api_key: str | None) -> bool:
    if not api_key:
        return False
    cleaned = api_key.strip()
    if cleaned == "your_key_here":
        return False
    return (cleaned.startswith("AIza") or cleaned.startswith("AQ.")) and len(cleaned) >= 30


def validate_and_prepare_image(image_bytes: bytes) -> Image.Image:
    if not image_bytes:
        raise PrescriptionError("The uploaded file is empty.", status_code=400, code="empty_file")
    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise PrescriptionError(
            "Image is larger than 5 MB. Please choose a smaller photo.",
            status_code=413,
            code="file_too_large",
        )

    try:
        img = Image.open(io.BytesIO(image_bytes))
        img.verify()
        img = Image.open(io.BytesIO(image_bytes))
    except (UnidentifiedImageError, OSError):
        raise PrescriptionError(
            "Could not read this file as an image. Please upload a valid JPG or PNG photo.",
            status_code=400,
            code="invalid_image",
        )

    fmt = (img.format or "").upper()
    if fmt not in ALLOWED_FORMATS:
        raise PrescriptionError(
            f"Unsupported image format ({fmt or 'unknown'}). Please upload a JPG or PNG image.",
            status_code=400,
            code="unsupported_format",
        )

    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")
    elif img.mode == "L":
        img = img.convert("RGB")

    if max(img.size) > MAX_IMAGE_DIMENSION:
        img.thumbnail((MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION), Image.Resampling.LANCZOS)

    return img


def _build_prompt(language: LanguageCode) -> str:
    if language == "hi":
        lang_instruction = (
            "Write ALL patient-facing fields (purpose, dose, instructions, duration, summary, disclaimer, "
            "questions_for_doctor) in simple, warm, everyday Hindi using Devanagari script (हिंदी), easy for "
            "an elderly patient to understand. For medicine `name`, keep the medicine name clear — e.g., "
            "'पैरासिटामोल 500mg (Paracetamol)' so the pharmacist can recognize it too."
        )
        disclaimer = DISCLAIMER_HI
    else:
        lang_instruction = (
            "Write ALL patient-facing fields (name, purpose, dose, instructions, duration, summary, disclaimer, "
            "questions_for_doctor) in very simple, warm, plain everyday English that an elderly patient or "
            "caregiver can read easily without medical jargon."
        )
        disclaimer = DISCLAIMER_EN

    return f"""You are MediSetu, a careful medical communication assistant helping patients understand their own doctor's prescription.

STRICT SAFETY RULES:
1. Extract ONLY medicines and instructions visible in the image. Never invent medicines or change prescribed doses.
2. Never diagnose diseases or recommend changing a doctor's dose.
3. Translate medical abbreviations into plain words (e.g. OD -> morning, BD/1-0-1 -> morning & night, TDS/1-1-1 -> morning, afternoon & night, HS -> night, AC -> before food, PC -> after food).
4. Map `timing` strictly to values from ["morning", "afternoon", "night"].
5. If ANY medicine name, strength, or dose is messy, smudged, cut off, or uncertain, set `low_confidence: true` for that item and clearly note in `instructions` to confirm it with the doctor or pharmacist.
6. If the image is NOT a prescription or medicine label, or no medicines are legible, set `is_prescription: false` and `medicines: []`.
7. Always include 2–3 practical, simple `questions_for_doctor`.
8. Set `disclaimer` to: "{disclaimer}"

LANGUAGE REQUIREMENT:
{lang_instruction}

Return strictly valid JSON matching the requested schema."""


def analyze_prescription_image(
    image_bytes: bytes,
    language: LanguageCode = "en",
    force_mock: bool = False,
) -> AnalysisResponse:
    started = time.perf_counter()

    # Always validate the image in memory first (privacy: never written to disk)
    pil_image = validate_and_prepare_image(image_bytes)

    use_mock_env = os.getenv("USE_MOCK", "false").strip().lower() == "true"
    if force_mock or use_mock_env:
        return get_mock_analysis(language)

    api_key = (os.getenv("GEMINI_API_KEY") or "").strip()
    model_name = (os.getenv("GEMINI_MODEL") or "gemini-3.8-flash").strip()

    if not api_key or api_key == "your_key_here":
        raise PrescriptionError(
            "GEMINI_API_KEY is not configured in backend/.env. Add a valid Google AI Studio API key (starts with AIza) or test with a Sample Prescription.",
            status_code=503,
            code="api_key_missing",
        )

    prompt = _build_prompt(language)

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model=model_name,
            contents=[prompt, pil_image],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=GeminiPrescriptionOutput,
                temperature=0.1,
            ),
        )
    except genai_errors.ClientError as exc:
        err_text = str(exc)
        if "API_KEY_INVALID" in err_text or "API key not valid" in err_text or "401" in err_text:
            raise PrescriptionError(
                "The GEMINI_API_KEY in backend/.env was rejected by Google Gemini API. Please paste a valid Google AI Studio key (starts with AIza...) into backend/.env, or try the built-in Sample Prescriptions.",
                status_code=502,
                code="api_key_invalid",
            )
        if "429" in err_text or "RESOURCE_EXHAUSTED" in err_text:
            raise PrescriptionError(
                "Gemini API rate limit reached. Please wait a few seconds and retry, or try a Sample Prescription.",
                status_code=429,
                code="rate_limited",
            )
        raise PrescriptionError(
            f"AI vision request failed: {exc.message if hasattr(exc, 'message') else err_text}",
            status_code=502,
            code="ai_client_error",
        )
    except Exception as exc:
        raise PrescriptionError(
            f"Could not reach the AI vision service. Please check your internet connection and retry. ({type(exc).__name__})",
            status_code=502,
            code="ai_service_error",
        )

    raw_text = (response.text or "").strip()
    if not raw_text:
        raise PrescriptionError(
            "The AI returned an empty response. Please try uploading a clearer photo.",
            status_code=502,
            code="empty_ai_response",
        )

    try:
        parsed_dict = json.loads(raw_text)
        parsed = GeminiPrescriptionOutput.model_validate(parsed_dict)
    except Exception:
        raise PrescriptionError(
            "We could not structure the prescription details cleanly. Please retry with a clearer, well-lit photo.",
            status_code=502,
            code="parse_error",
        )

    if not parsed.is_prescription or not parsed.medicines:
        no_meds_msg = (
            "इस फोटो में कोई दवा स्पष्ट रूप से दिखाई नहीं दी। कृपया अच्छी रोशनी में पर्चे की साफ फोटो अपलोड करें।"
            if language == "hi"
            else "No medicines were detected in this image. Please upload a clearer, well-lit photo of a medical prescription."
        )
        raise PrescriptionError(no_meds_msg, status_code=422, code="no_medicines_found")

    elapsed_ms = int((time.perf_counter() - started) * 1000)
    default_disclaimer = DISCLAIMER_HI if language == "hi" else DISCLAIMER_EN

    return AnalysisResponse(
        medicines=parsed.medicines,
        summary=parsed.summary,
        disclaimer=parsed.disclaimer or default_disclaimer,
        questions_for_doctor=parsed.questions_for_doctor[:4],
        language=language,
        source="gemini",
        processing_ms=elapsed_ms,
    )
