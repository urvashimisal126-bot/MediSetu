from typing import Literal
from pydantic import BaseModel, Field

TimingSlot = Literal["morning", "afternoon", "night"]
LanguageCode = Literal["en", "hi"]
MatchStatus = Literal["match", "no_match", "unclear", "no_photo"]


class MedicineItem(BaseModel):
    name: str = Field(..., description="Medicine name and strength as written on the prescription")
    purpose: str = Field(..., description="Plain-language explanation of what the medicine is commonly used for")
    dose: str = Field(..., description="Amount per intake, e.g. '1 tablet' or '5 ml'")
    timing: list[TimingSlot] = Field(
        default_factory=list,
        description="Times of day to take the medicine: morning, afternoon, night",
    )
    instructions: str = Field(..., description="Practical intake notes such as after food, before breakfast, etc.")
    duration: str = Field(..., description="How many days/weeks to take the medicine, or 'As advised by doctor'")
    low_confidence: bool = Field(
        default=False,
        description="True if handwriting or text is unclear, smudged, or ambiguous and needs doctor verification",
    )
    photo_index: int | None = Field(
        default=None,
        description="1-based index of the matching uploaded medicine photo, or null if none",
    )
    match_status: MatchStatus = Field(
        default="no_photo",
        description="Photo match result: match | no_match | unclear | no_photo",
    )
    match_note: str = Field(
        default="",
        description="Short simple sentence describing the photo match in the requested language",
    )


class UnmatchedPhoto(BaseModel):
    photo_index: int = Field(..., description="1-based index of the unmatched uploaded medicine photo")
    detected_label: str = Field(default="", description="Text visibly printed on the label")
    note: str = Field(default="", description="Short simple sentence in the requested language")


class GeminiPrescriptionOutput(BaseModel):
    is_prescription: bool = Field(
        default=True,
        description="False if the uploaded image does not appear to be a medical prescription or medicine label",
    )
    medicines: list[MedicineItem] = Field(default_factory=list)
    unmatched_photos: list[UnmatchedPhoto] = Field(default_factory=list)
    summary: str = Field(..., description="Short, warm, plain-language overall explanation of the prescription")
    disclaimer: str = Field(
        default="This is not medical advice. Please verify with your doctor.",
        description="Safety disclaimer in the target language",
    )
    pharmacist_note: str = Field(
        default="Please confirm with your pharmacist.",
        description="Pharmacist verification note in the target language",
    )
    questions_for_doctor: list[str] = Field(
        default_factory=list,
        description="2 to 3 helpful, simple questions the patient can ask their doctor or pharmacist",
    )


class AnalysisResponse(BaseModel):
    medicines: list[MedicineItem]
    unmatched_photos: list[UnmatchedPhoto] = Field(default_factory=list)
    summary: str
    disclaimer: str
    pharmacist_note: str = Field(default="Please confirm with your pharmacist.")
    questions_for_doctor: list[str] = Field(default_factory=list)
    language: LanguageCode
    source: Literal["gemini", "sample", "mock"]
    processing_ms: int


class TranslateRequest(BaseModel):
    medicines: list[MedicineItem]
    unmatched_photos: list[UnmatchedPhoto] = Field(default_factory=list)
    summary: str
    questions_for_doctor: list[str] = Field(default_factory=list)
    target_language: LanguageCode
    source: Literal["gemini", "sample", "mock"] = "gemini"


class SamplePrescriptionMeta(BaseModel):
    id: str
    title_en: str
    title_hi: str
    subtitle_en: str
    subtitle_hi: str
    medicine_count: int
    has_unclear_item: bool
    image_url: str


VerifyStatus = Literal["match", "no_match", "unclear"]


class DetectedMedicine(BaseModel):
    name: str = Field(default="", description="Brand or generic name visibly printed on the label")
    strength: str = Field(default="", description="Strength visibly printed on the label, e.g. 500mg")


class VerifyResponse(BaseModel):
    detected: DetectedMedicine
    status: VerifyStatus
    matched_medicine: str | None = Field(
        default=None,
        description="Name of the matched medicine from the prescription, or null",
    )
    message: str = Field(..., description="One short, simple sentence explaining the result")
    reason: str = Field(..., description="Brief reason, e.g. active ingredient and strength match")
    disclaimer: str = Field(..., description="Pharmacist confirmation disclaimer")
    language: LanguageCode
