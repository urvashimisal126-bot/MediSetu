import io
import json
import logging
import os
import re
import time
from PIL import Image, UnidentifiedImageError
from google import genai
from google.genai import errors as genai_errors
from google.genai import types

from samples import (
    DISCLAIMER_EN,
    DISCLAIMER_HI,
    PHARMACIST_NOTE_EN,
    PHARMACIST_NOTE_HI,
    get_mock_analysis,
)
from schemas import (
    AnalysisResponse,
    GeminiPrescriptionOutput,
    LanguageCode,
    TranslateRequest,
)

logger = logging.getLogger("medisetu.analyzer")

MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MB
MAX_IMAGE_DIMENSION = 1280
MAX_MEDICINE_PHOTOS = 5
ALLOWED_FORMATS = {"JPEG", "JPG", "PNG", "WEBP"}
FALLBACK_MODELS = [
    "gemini-3.8-flash",
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash-lite",
    "gemini-3.7-flash",
]
TRANSLATE_MODELS = [
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash-lite",
    "gemini-3.8-flash",
    "gemini-3.7-flash",
]

TIMING_MAP = {
    "morning": "morning",
    "am": "morning",
    "breakfast": "morning",
    "early morning": "morning",
    "सुबह": "morning",
    "प्रातः": "morning",
    "सवेरे": "morning",
    "afternoon": "afternoon",
    "noon": "afternoon",
    "midday": "afternoon",
    "lunch": "afternoon",
    "दोपहर": "afternoon",
    "night": "night",
    "evening": "night",
    "dinner": "night",
    "bedtime": "night",
    "pm": "night",
    "hs": "night",
    "रात": "night",
    "शाम": "night",
    "रात्रि": "night",
}

MATCH_STATUS_MAP = {
    "match": "match",
    "matched": "match",
    "no_match": "no_match",
    "nomatch": "no_match",
    "no match": "no_match",
    "mismatch": "no_match",
    "unclear": "unclear",
    "blurry": "unclear",
    "unreadable": "unclear",
    "no_photo": "no_photo",
    "none": "no_photo",
    "null": "no_photo",
}


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

    if img.mode != "RGB":
        img = img.convert("RGB")

    if max(img.size) > MAX_IMAGE_DIMENSION:
        img.thumbnail((MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION), Image.Resampling.LANCZOS)

    return img


def _extract_json_text(raw_text: str) -> str:
    text = raw_text.strip()
    fenced = re.match(r"^```(?:json)?\s*(.*?)\s*```$", text, flags=re.DOTALL | re.IGNORECASE)
    if fenced:
        return fenced.group(1).strip()
    return text


def _normalize_timing(raw_timing) -> list[str]:
    if not raw_timing:
        return []
    if isinstance(raw_timing, str):
        raw_timing = [raw_timing]
    normalized: list[str] = []
    for item in raw_timing:
        key = str(item or "").strip().lower()
        mapped = TIMING_MAP.get(key)
        if not mapped:
            for token, target in TIMING_MAP.items():
                if token in key:
                    mapped = target
                    break
        if mapped and mapped not in normalized:
            normalized.append(mapped)
    return normalized


def _normalize_photo_index(val, num_medicine_photos: int) -> int | None:
    if val is None or num_medicine_photos <= 0:
        return None
    try:
        idx = int(val)
    except (TypeError, ValueError):
        return None
    if 1 <= idx <= num_medicine_photos:
        return idx
    return None


def _normalize_match_status(raw_status, photo_index: int | None, num_medicine_photos: int) -> str:
    if num_medicine_photos <= 0:
        return "no_photo"
    key = str(raw_status or "").strip().lower()
    mapped = MATCH_STATUS_MAP.get(key)
    if mapped:
        if mapped == "match" and photo_index is None:
            return "no_photo"
        return mapped
    return "match" if photo_index is not None else "no_photo"


def _normalize_parsed_dict(
    parsed_dict: dict,
    language: LanguageCode,
    num_medicine_photos: int = 0,
) -> dict:
    default_disclaimer = DISCLAIMER_HI if language == "hi" else DISCLAIMER_EN
    default_pharmacist = PHARMACIST_NOTE_HI if language == "hi" else PHARMACIST_NOTE_EN
    default_duration = "डॉक्टर के अनुसार" if language == "hi" else "As advised by doctor"
    default_instructions = "डॉक्टर के निर्देशानुसार लें" if language == "hi" else "Take as advised by your doctor"
    default_dose = "डॉक्टर के अनुसार" if language == "hi" else "As prescribed"

    meds_out = []
    matched_photo_indices: set[int] = set()

    for med in parsed_dict.get("medicines") or []:
        if not isinstance(med, dict):
            continue
        name = str(med.get("name") or "").strip()
        if not name:
            continue
        p_idx = _normalize_photo_index(med.get("photo_index"), num_medicine_photos)
        m_status = _normalize_match_status(med.get("match_status"), p_idx, num_medicine_photos)
        m_note = str(med.get("match_note") or "").strip() if num_medicine_photos > 0 else ""

        if p_idx is not None:
            matched_photo_indices.add(p_idx)

        meds_out.append(
            {
                "name": name,
                "purpose": str(med.get("purpose") or "").strip() or (
                    "डॉक्टर द्वारा लिखी गई दवा" if language == "hi" else "Prescribed medicine"
                ),
                "dose": str(med.get("dose") or "").strip() or default_dose,
                "timing": _normalize_timing(med.get("timing")),
                "instructions": str(med.get("instructions") or "").strip() or default_instructions,
                "duration": str(med.get("duration") or "").strip() or default_duration,
                "low_confidence": bool(med.get("low_confidence", False)),
                "photo_index": p_idx,
                "match_status": m_status,
                "match_note": m_note,
            }
        )

    unmatched_out = []
    seen_unmatched: set[int] = set()
    if num_medicine_photos > 0:
        for item in parsed_dict.get("unmatched_photos") or []:
            if not isinstance(item, dict):
                continue
            p_idx = _normalize_photo_index(item.get("photo_index"), num_medicine_photos)
            if p_idx is None or p_idx in seen_unmatched or p_idx in matched_photo_indices:
                continue
            seen_unmatched.add(p_idx)
            unmatched_out.append(
                {
                    "photo_index": p_idx,
                    "detected_label": str(item.get("detected_label") or "").strip(),
                    "note": str(item.get("note") or "").strip() or (
                        "यह फोटो आपके पर्चे की किसी दवा से मेल नहीं खाती। कृपया अपने फार्मासिस्ट से पूछें।"
                        if language == "hi"
                        else "This photo does not match any medicine on your prescription. Please ask your pharmacist."
                    ),
                }
            )

    questions = [
        str(q).strip()
        for q in (parsed_dict.get("questions_for_doctor") or [])
        if str(q or "").strip()
    ]

    return {
        "is_prescription": bool(parsed_dict.get("is_prescription", bool(meds_out))),
        "medicines": meds_out,
        "unmatched_photos": unmatched_out,
        "summary": str(parsed_dict.get("summary") or "").strip() or (
            "आपके पर्चे की दवाइयों का सरल विवरण नीचे दिया गया है।"
            if language == "hi"
            else "Here is a plain-language summary of the medicines on your prescription."
        ),
        "disclaimer": str(parsed_dict.get("disclaimer") or "").strip() or default_disclaimer,
        "pharmacist_note": str(parsed_dict.get("pharmacist_note") or "").strip() or default_pharmacist,
        "questions_for_doctor": questions[:4],
    }


def _build_prompt(language: LanguageCode, num_medicine_photos: int = 0) -> str:
    if language == "hi":
        lang_instruction = (
            "Write ALL patient-facing text fields (`purpose`, `dose`, `instructions`, `duration`, `match_note`, "
            "`unmatched_photos[].note`, `summary`, `disclaimer`, `pharmacist_note`, `questions_for_doctor`) in "
            "simple, warm, everyday Hindi using Devanagari script (हिंदी), easy for an elderly patient to understand. "
            "For medicine `name`, keep it clear in Hindi with the English name in parentheses — e.g., "
            "'पैरासिटामोल 500mg (Paracetamol)' so the pharmacist can recognize it too. "
            "IMPORTANT: The `timing` array values MUST ALWAYS stay in English ('morning', 'afternoon', 'night') "
            "and `match_status` MUST ALWAYS stay in English ('match', 'no_match', 'unclear', 'no_photo')."
        )
        disclaimer = DISCLAIMER_HI
        pharmacist_note = PHARMACIST_NOTE_HI
    else:
        lang_instruction = (
            "Write ALL patient-facing fields (`name`, `purpose`, `dose`, `instructions`, `duration`, `match_note`, "
            "`unmatched_photos[].note`, `summary`, `disclaimer`, `pharmacist_note`, `questions_for_doctor`) in very "
            "simple, warm, plain everyday English that an elderly patient or caregiver can read easily without medical jargon."
        )
        disclaimer = DISCLAIMER_EN
        pharmacist_note = PHARMACIST_NOTE_EN

    photo_section = ""
    if num_medicine_photos > 0:
        photo_labels = ", ".join(f"Image {i}" for i in range(1, num_medicine_photos + 1))
        photo_section = f"""
MEDICINE PHOTO MATCHING INSTRUCTIONS:
You are given {num_medicine_photos + 1} images in order:
- Image 0 = the doctor's prescription.
- {photo_labels} = photos of the patient's actual medicine strips or boxes (numbered 1 to {num_medicine_photos} in the order provided).

You are also given photos of the patient's medicine strips or boxes, numbered from 1 in the order provided (image 0 is the prescription). For each prescription medicine, find the photo whose printed label matches it. Brand and generic names can differ: treat a photo as a match if the active ingredient and strength match. Read only the text visibly printed on the label. If no photo matches a medicine, set `photo_index` to null and `match_status` to "no_photo". If a photo is blurry or unreadable, set `match_status` to "unclear" (or list it in `unmatched_photos` with a note if it cannot be tied to a specific medicine). If a photo matches no prescription medicine (for example wrong drug or wrong strength), list it under `unmatched_photos` with its 1-based `photo_index`, `detected_label` (text read from the label), and a short `note`. Do NOT judge whether a medicine is genuine, safe, expired, or fake, and do NOT give medical advice.
"""
    else:
        photo_section = """
No separate medicine photos were provided. Set `photo_index` to null, `match_status` to "no_photo", `match_note` to "", and `unmatched_photos` to [].
"""

    return f"""You are MediSetu, a careful medical communication assistant helping patients understand their own doctor's prescription.

STRICT SAFETY RULES:
1. Extract ONLY medicines and instructions visible in the prescription (Image 0). Never invent medicines or change prescribed doses.
2. Never diagnose diseases or recommend changing a doctor's dose.
3. Translate medical abbreviations into plain words (e.g. OD -> morning, BD/1-0-1 -> morning & night, TDS/1-1-1 -> morning, afternoon & night, HS -> night, AC -> before food, PC -> after food).
4. Map `timing` strictly to values from ["morning", "afternoon", "night"] (keep these exact English keywords even when responding in Hindi).
5. Map `match_status` strictly to values from ["match", "no_match", "unclear", "no_photo"] (keep these exact English keywords even when responding in Hindi).
6. If ANY medicine name, strength, or dose on the prescription is messy, smudged, cut off, or uncertain, set `low_confidence: true` for that item and clearly note in `instructions` to confirm it with the doctor or pharmacist.
7. If Image 0 is NOT a prescription or medicine label, or no medicines are legible, set `is_prescription: false` and `medicines: []`.
8. Always include 2–3 practical, simple `questions_for_doctor`.
9. Set `disclaimer` to: "{disclaimer}"
10. Set `pharmacist_note` to: "{pharmacist_note}"
{photo_section}
LANGUAGE REQUIREMENT:
{lang_instruction}

Return ONLY valid JSON matching the requested schema."""


def _call_gemini_structured(
    api_key: str,
    model_name: str,
    contents: list,
    response_schema=GeminiPrescriptionOutput,
    fallback_order: list[str] | None = None,
) -> str:
    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=response_schema,
        temperature=0.1,
    )

    order = fallback_order or FALLBACK_MODELS
    candidate_models = [model_name] + [m for m in order if m != model_name]

    last_error: Exception | None = None
    saw_high_demand = False

    for candidate in candidate_models:
        try:
            client = genai.Client(
                api_key=api_key,
                http_options=types.HttpOptions(
                    timeout=25000,
                    retry_options=types.HttpRetryOptions(attempts=1),
                ),
            )
            response = client.models.generate_content(
                model=candidate,
                contents=contents,
                config=config,
            )
            raw_text = (response.text or "").strip()
            if raw_text:
                if candidate != model_name:
                    logger.info("Succeeded using fallback model %s", candidate)
                return raw_text
            last_error = RuntimeError(f"Empty AI response from {candidate}")
        except genai_errors.ClientError as exc:
            err_text = str(exc)
            if "API_KEY_INVALID" in err_text or "API key not valid" in err_text or "401" in err_text:
                raise PrescriptionError(
                    "The GEMINI_API_KEY in backend/.env was rejected by Google Gemini API. Please paste a valid API key into backend/.env, or try the built-in Sample Prescriptions.",
                    status_code=502,
                    code="api_key_invalid",
                )
            if "429" in err_text or "RESOURCE_EXHAUSTED" in err_text or "404" in err_text or "no longer available" in err_text.lower():
                logger.warning("Model %s unavailable (%s); trying fallback...", candidate, err_text[:140])
                saw_high_demand = True
                last_error = exc
                continue
            logger.exception("Gemini ClientError on model %s", candidate)
            raise PrescriptionError(
                f"AI request failed: {exc.message if hasattr(exc, 'message') else err_text}",
                status_code=502,
                code="ai_client_error",
            )
        except genai_errors.ServerError as exc:
            logger.warning("Gemini ServerError (503/504) on %s; switching to fallback model...", candidate)
            saw_high_demand = True
            last_error = exc
            continue
        except Exception as exc:
            logger.warning("Transient Gemini error on %s (%s); trying fallback...", candidate, type(exc).__name__)
            last_error = exc
            time.sleep(0.3)
            continue

    if saw_high_demand:
        raise PrescriptionError(
            "Google Gemini AI is temporarily experiencing high demand. Please wait a few seconds and tap Try Again.",
            status_code=503,
            code="ai_overloaded",
        )

    raise PrescriptionError(
        f"Could not reach the AI service cleanly. Please check your internet connection and tap Try Again. ({type(last_error).__name__ if last_error else 'UnknownError'})",
        status_code=502,
        code="ai_service_error",
    )


def _get_api_credentials() -> tuple[str, str]:
    api_key = (os.getenv("GEMINI_API_KEY") or "").strip()
    model_name = (os.getenv("GEMINI_MODEL") or "gemini-3.8-flash").strip()
    if not api_key or api_key == "your_key_here":
        raise PrescriptionError(
            "GEMINI_API_KEY is not configured in backend/.env. Add a valid Google Gemini API key or test with a Sample Prescription.",
            status_code=503,
            code="api_key_missing",
        )
    return api_key, model_name


def analyze_prescription_image(
    image_bytes: bytes,
    language: LanguageCode = "en",
    force_mock: bool = False,
    medicine_images_bytes: list[bytes] | None = None,
) -> AnalysisResponse:
    started = time.perf_counter()

    # Always validate & resize prescription image in memory first (privacy: never written to disk)
    pil_image = validate_and_prepare_image(image_bytes)

    extra_photos = medicine_images_bytes or []
    if len(extra_photos) > MAX_MEDICINE_PHOTOS:
        raise PrescriptionError(
            f"You can upload up to {MAX_MEDICINE_PHOTOS} medicine photos at a time.",
            status_code=400,
            code="too_many_medicine_images",
        )

    prepared_medicine_images: list[Image.Image] = []
    for idx, photo_bytes in enumerate(extra_photos, start=1):
        try:
            prepared_medicine_images.append(validate_and_prepare_image(photo_bytes))
        except PrescriptionError as exc:
            raise PrescriptionError(
                f"Medicine photo #{idx}: {exc.message}",
                status_code=exc.status_code,
                code=exc.code,
            )

    num_med_photos = len(prepared_medicine_images)

    use_mock_env = os.getenv("USE_MOCK", "false").strip().lower() == "true"
    if force_mock or use_mock_env:
        return get_mock_analysis(language, num_medicine_photos=num_med_photos)

    api_key, model_name = _get_api_credentials()
    prompt = _build_prompt(language, num_medicine_photos=num_med_photos)

    # Build single Gemini request containing prescription (Image 0) + all medicine photos (Image 1..N)
    contents: list = [prompt, "Image 0 (Prescription):", pil_image]
    for idx, med_img in enumerate(prepared_medicine_images, start=1):
        contents.append(f"Image {idx} (Medicine strip/box photo #{idx}):")
        contents.append(med_img)

    # Validate & parse JSON, retrying once on a parse failure
    parsed: GeminiPrescriptionOutput | None = None
    last_raw = ""
    for parse_attempt in range(2):
        raw_text = _call_gemini_structured(
            api_key=api_key,
            model_name=model_name,
            contents=contents,
            response_schema=GeminiPrescriptionOutput,
            fallback_order=FALLBACK_MODELS,
        )
        last_raw = raw_text
        try:
            parsed_dict = json.loads(_extract_json_text(raw_text))
            normalized = _normalize_parsed_dict(
                parsed_dict,
                language,
                num_medicine_photos=num_med_photos,
            )
            parsed = GeminiPrescriptionOutput.model_validate(normalized)
            break
        except Exception:
            logger.warning("Parse attempt %s failed for /analyze JSON", parse_attempt + 1)
            if parse_attempt == 0:
                continue

    if parsed is None:
        logger.error("Failed to parse Gemini vision JSON after retry: %s", last_raw[:400])
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
    default_pharmacist = PHARMACIST_NOTE_HI if language == "hi" else PHARMACIST_NOTE_EN

    return AnalysisResponse(
        medicines=parsed.medicines,
        unmatched_photos=parsed.unmatched_photos,
        summary=parsed.summary,
        disclaimer=parsed.disclaimer or default_disclaimer,
        pharmacist_note=parsed.pharmacist_note or default_pharmacist,
        questions_for_doctor=parsed.questions_for_doctor[:4],
        language=language,
        source="gemini",
        processing_ms=elapsed_ms,
    )


def translate_prescription_result(payload: TranslateRequest) -> AnalysisResponse:
    started = time.perf_counter()
    target_lang = payload.target_language
    max_photo_idx = max(
        [m.photo_index or 0 for m in payload.medicines]
        + [u.photo_index for u in payload.unmatched_photos]
        + [0]
    )

    use_mock_env = os.getenv("USE_MOCK", "false").strip().lower() == "true"
    if payload.source == "mock" or use_mock_env:
        return get_mock_analysis(target_lang, num_medicine_photos=max_photo_idx)

    api_key, _model_name = _get_api_credentials()

    source_json = json.dumps(
        {
            "is_prescription": True,
            "medicines": [m.model_dump() for m in payload.medicines],
            "unmatched_photos": [u.model_dump() for u in payload.unmatched_photos],
            "summary": payload.summary,
            "questions_for_doctor": payload.questions_for_doctor,
        },
        ensure_ascii=False,
    )

    if target_lang == "hi":
        target_instruction = (
            "Translate ALL patient-facing text fields (`purpose`, `dose`, `instructions`, `duration`, `match_note`, "
            "`unmatched_photos[].note`, `summary`, `questions_for_doctor`) into simple, warm, natural everyday Hindi "
            "in Devanagari script (हिंदी) that an elderly Indian patient can easily understand. "
            "For each medicine `name`, write the Hindi name followed by the original English name in parentheses, "
            "e.g. 'पैरासिटामोल 500mg (Paracetamol 500mg)'. "
            "CRITICAL: Keep EVERY medicine's `timing` array values strictly in English ('morning', 'afternoon', 'night'), "
            "`match_status` strictly in English ('match', 'no_match', 'unclear', 'no_photo'), "
            "and keep `photo_index` and `low_confidence` identical to the input. "
            f"Set `disclaimer` to: \"{DISCLAIMER_HI}\" and `pharmacist_note` to: \"{PHARMACIST_NOTE_HI}\"."
        )
    else:
        target_instruction = (
            "Translate ALL patient-facing text fields (`name`, `purpose`, `dose`, `instructions`, `duration`, "
            "`match_note`, `unmatched_photos[].note`, `summary`, `questions_for_doctor`) into simple, warm, plain "
            "everyday English without medical jargon. "
            "CRITICAL: Keep EVERY medicine's `timing` array values strictly in English ('morning', 'afternoon', 'night'), "
            "`match_status` strictly in English ('match', 'no_match', 'unclear', 'no_photo'), "
            "and keep `photo_index` and `low_confidence` identical to the input. "
            f"Set `disclaimer` to: \"{DISCLAIMER_EN}\" and `pharmacist_note` to: \"{PHARMACIST_NOTE_EN}\"."
        )

    prompt = f"""You are MediSetu's medical translator.
Translate the following already-extracted prescription JSON accurately WITHOUT adding, removing, or changing any medicine, dose, timing, photo_index, match_status, or safety flag.

{target_instruction}

INPUT JSON:
{source_json}

Return strictly valid JSON matching the requested schema."""

    raw_text = _call_gemini_structured(
        api_key=api_key,
        model_name=TRANSLATE_MODELS[0],
        contents=[prompt],
        response_schema=GeminiPrescriptionOutput,
        fallback_order=TRANSLATE_MODELS,
    )

    try:
        parsed_dict = json.loads(_extract_json_text(raw_text))
        normalized = _normalize_parsed_dict(
            parsed_dict,
            target_lang,
            num_medicine_photos=max_photo_idx,
        )
        if len(normalized["medicines"]) == len(payload.medicines):
            for idx, orig_med in enumerate(payload.medicines):
                normalized["medicines"][idx]["timing"] = list(orig_med.timing)
                normalized["medicines"][idx]["low_confidence"] = bool(orig_med.low_confidence)
                normalized["medicines"][idx]["photo_index"] = orig_med.photo_index
                normalized["medicines"][idx]["match_status"] = orig_med.match_status
        parsed = GeminiPrescriptionOutput.model_validate(normalized)
    except Exception:
        logger.exception("Failed to parse Gemini translation JSON: %s", raw_text[:400])
        raise PrescriptionError(
            "Could not translate the prescription right now. Please tap Retry.",
            status_code=502,
            code="translation_parse_error",
        )

    elapsed_ms = int((time.perf_counter() - started) * 1000)
    default_disclaimer = DISCLAIMER_HI if target_lang == "hi" else DISCLAIMER_EN
    default_pharmacist = PHARMACIST_NOTE_HI if target_lang == "hi" else PHARMACIST_NOTE_EN

    return AnalysisResponse(
        medicines=parsed.medicines,
        unmatched_photos=parsed.unmatched_photos,
        summary=parsed.summary,
        disclaimer=parsed.disclaimer or default_disclaimer,
        pharmacist_note=parsed.pharmacist_note or default_pharmacist,
        questions_for_doctor=parsed.questions_for_doctor[:4],
        language=target_lang,
        source=payload.source,
        processing_ms=elapsed_ms,
    )
