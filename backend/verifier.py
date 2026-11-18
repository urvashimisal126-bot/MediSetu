import json
import logging
import os
import re

from analyzer import (
    FALLBACK_MODELS,
    PrescriptionError,
    _call_gemini_structured,
    _extract_json_text,
    _get_api_credentials,
    validate_and_prepare_image,
)
from schemas import DetectedMedicine, LanguageCode, VerifyResponse

logger = logging.getLogger("medisetu.verifier")

PHARMACIST_DISCLAIMER_EN = "Please confirm with your pharmacist."
PHARMACIST_DISCLAIMER_HI = "कृपया अपने फार्मासिस्ट से पुष्टि करें।"

_mock_call_counter = 0
_mock_match_counter = 0


def parse_medicines_json(medicines_raw: str) -> list[dict]:
    if not medicines_raw or not medicines_raw.strip():
        raise PrescriptionError(
            "Prescription medicine list is required.",
            status_code=400,
            code="missing_medicines",
        )
    try:
        parsed = json.loads(medicines_raw)
    except json.JSONDecodeError:
        raise PrescriptionError(
            "Invalid medicines JSON format.",
            status_code=400,
            code="invalid_medicines_json",
        )

    if not isinstance(parsed, list) or len(parsed) == 0:
        raise PrescriptionError(
            "Medicines must be a non-empty JSON list.",
            status_code=400,
            code="empty_medicines",
        )

    normalized: list[dict] = []
    for item in parsed:
        if isinstance(item, str) and item.strip():
            normalized.append({"name": item.strip(), "dose": ""})
        elif isinstance(item, dict) and str(item.get("name") or "").strip():
            normalized.append(
                {
                    "name": str(item.get("name")).strip(),
                    "dose": str(item.get("dose") or "").strip(),
                }
            )

    if not normalized:
        raise PrescriptionError(
            "No valid medicine names found in medicines list.",
            status_code=400,
            code="invalid_medicines",
        )
    return normalized


def _split_name_and_strength(med_name: str) -> tuple[str, str]:
    match = re.search(r"(\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu|%))", med_name, flags=re.IGNORECASE)
    if match:
        strength = match.group(1).replace(" ", "")
        name = med_name[: match.start()].strip(" -–(") or med_name
        return name, strength
    return med_name, ""


def _build_mock_verify_response(
    medicines: list[dict],
    language: LanguageCode,
    filename: str = "",
) -> VerifyResponse:
    global _mock_call_counter, _mock_match_counter
    fname = (filename or "").lower()
    disclaimer = PHARMACIST_DISCLAIMER_HI if language == "hi" else PHARMACIST_DISCLAIMER_EN

    if "unclear" in fname or "blur" in fname:
        case = "unclear"
    elif "nomatch" in fname or "no_match" in fname or "mismatch" in fname or "wrong" in fname:
        case = "no_match"
    elif "match" in fname:
        case = "match"
    else:
        case = "match" if (_mock_call_counter % 2 == 0) else "no_match"
        _mock_call_counter += 1

    if case == "match":
        target_med = medicines[_mock_match_counter % len(medicines)]["name"]
        _mock_match_counter += 1
        base_name, strength = _split_name_and_strength(target_med)
        if language == "hi":
            return VerifyResponse(
                detected=DetectedMedicine(name=base_name, strength=strength or "500mg"),
                status="match",
                matched_medicine=target_med,
                message=f"यह दवा आपके पर्चे से मेल खाती है: {target_med}।",
                reason="लेबल पर लिखा दवा का नाम और पावर पर्चे से मेल खाते हैं।",
                disclaimer=disclaimer,
                language="hi",
            )
        return VerifyResponse(
            detected=DetectedMedicine(name=base_name, strength=strength or "500mg"),
            status="match",
            matched_medicine=target_med,
            message=f"This strip matches your prescription: {target_med}.",
            reason="Active ingredient name and strength match the prescription.",
            disclaimer=disclaimer,
            language="en",
        )

    if case == "unclear":
        if language == "hi":
            return VerifyResponse(
                detected=DetectedMedicine(name="", strength=""),
                status="unclear",
                matched_medicine=None,
                message="लेबल साफ नहीं पढ़ा जा सका। कृपया अच्छी रोशनी में पास से दोबारा फोटो लें।",
                reason="दवा के पत्ते पर लिखा नाम और पावर धुंधला है।",
                disclaimer=disclaimer,
                language="hi",
            )
        return VerifyResponse(
            detected=DetectedMedicine(name="", strength=""),
            status="unclear",
            matched_medicine=None,
            message="We couldn't read the label clearly. Try a closer, well-lit photo.",
            reason="Text on the medicine strip is too blurry or partial to read.",
            disclaimer=disclaimer,
            language="en",
        )

    if language == "hi":
        return VerifyResponse(
            detected=DetectedMedicine(name="Ibuprofen (इबुप्रोफेन)", strength="400mg"),
            status="no_match",
            matched_medicine=None,
            message="यह दवा आपके पर्चे की किसी भी दवा से मेल नहीं खाती। कृपया अपने फार्मासिस्ट से पूछें।",
            reason="लेबल पर लिखी दवा और पावर आपके पर्चे में शामिल नहीं हैं।",
            disclaimer=disclaimer,
            language="hi",
        )
    return VerifyResponse(
        detected=DetectedMedicine(name="Ibuprofen", strength="400mg"),
        status="no_match",
        matched_medicine=None,
        message="This doesn't match anything on your prescription. Please ask your pharmacist.",
        reason="Detected medicine and strength are not listed on your prescription.",
        disclaimer=disclaimer,
        language="en",
    )


def _build_verify_prompt(medicines: list[dict], language: LanguageCode) -> str:
    disclaimer = PHARMACIST_DISCLAIMER_HI if language == "hi" else PHARMACIST_DISCLAIMER_EN
    lang_note = (
        "Write `message`, `reason`, and `disclaimer` in simple, warm, everyday Hindi (Devanagari script). "
        "Keep `status` strictly as one of: 'match', 'no_match', or 'unclear' (in English), and `language` as 'hi'."
        if language == "hi"
        else "Write `message`, `reason`, and `disclaimer` in very simple, clear English. "
        "Keep `status` strictly as one of: 'match', 'no_match', or 'unclear', and `language` as 'en'."
    )
    meds_json = json.dumps(medicines, ensure_ascii=False)

    return f"""You are a pharmacy label reader. You are given a photo of a medicine strip or box, and a list of medicines from a patient's prescription. Read only the text visibly printed on the label: brand name, generic or salt name, and strength. Decide whether it matches any medicine in the prescription list. Brand and generic names can differ: treat a medicine as a match if the active ingredient and strength match. If the label is blurry, partial, or unreadable, return `unclear`. Do NOT judge whether the medicine is genuine, safe, expired, or fake. Do NOT give medical advice. Explain the result in one short, simple sentence in the requested language. Return ONLY valid JSON matching the schema.

PRESCRIPTION MEDICINES:
{meds_json}

LANGUAGE & FORMAT:
{lang_note}
Set `disclaimer` to: "{disclaimer}"."""


def verify_medicine_image(
    image_bytes: bytes,
    medicines_raw: str,
    language: LanguageCode = "en",
    filename: str = "",
) -> VerifyResponse:
    pil_image = validate_and_prepare_image(image_bytes)
    medicines = parse_medicines_json(medicines_raw)

    use_mock = os.getenv("USE_MOCK", "false").strip().lower() == "true"
    if use_mock:
        return _build_mock_verify_response(medicines=medicines, language=language, filename=filename)

    api_key, model_name = _get_api_credentials()
    prompt = _build_verify_prompt(medicines, language)
    disclaimer = PHARMACIST_DISCLAIMER_HI if language == "hi" else PHARMACIST_DISCLAIMER_EN

    parsed: VerifyResponse | None = None
    last_raw = ""
    for attempt in range(2):
        raw_text = _call_gemini_structured(
            api_key=api_key,
            model_name=model_name,
            contents=[prompt, pil_image],
            response_schema=VerifyResponse,
            fallback_order=FALLBACK_MODELS,
        )
        last_raw = raw_text
        try:
            data = json.loads(_extract_json_text(raw_text))
            status_raw = str(data.get("status") or "unclear").strip().lower()
            if status_raw not in ("match", "no_match", "unclear"):
                status_raw = "unclear"
            detected_raw = data.get("detected") or {}
            normalized = {
                "detected": {
                    "name": str(detected_raw.get("name") or "").strip(),
                    "strength": str(detected_raw.get("strength") or "").strip(),
                },
                "status": status_raw,
                "matched_medicine": (
                    str(data.get("matched_medicine")).strip()
                    if status_raw == "match" and data.get("matched_medicine")
                    else None
                ),
                "message": str(data.get("message") or "").strip()
                or (
                    "लेबल की जांच पूरी हुई। कृपया अपने फार्मासिस्ट से पुष्टि करें।"
                    if language == "hi"
                    else "Label check complete. Please confirm with your pharmacist."
                ),
                "reason": str(data.get("reason") or "").strip(),
                "disclaimer": disclaimer,
                "language": language,
            }
            parsed = VerifyResponse.model_validate(normalized)
            break
        except Exception:
            logger.warning("Parse attempt %s failed for /verify JSON", attempt + 1)
            if attempt == 0:
                continue

    if parsed is None:
        logger.error("Failed to parse /verify JSON after retry: %s", last_raw[:400])
        raise PrescriptionError(
            "Could not read the medicine label cleanly. Please try a clearer, closer photo.",
            status_code=502,
            code="verify_parse_error",
        )

    return parsed
