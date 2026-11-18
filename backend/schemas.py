from typing import Literal
from pydantic import BaseModel, Field

TimingSlot = Literal["morning", "afternoon", "night"]
LanguageCode = Literal["en", "hi"]


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


class GeminiPrescriptionOutput(BaseModel):
    is_prescription: bool = Field(
        default=True,
        description="False if the uploaded image does not appear to be a medical prescription or medicine label",
    )
    medicines: list[MedicineItem] = Field(default_factory=list)
    summary: str = Field(..., description="Short, warm, plain-language overall explanation of the prescription")
    disclaimer: str = Field(
        default="This is not medical advice. Please verify with your doctor.",
        description="Safety disclaimer in the target language",
    )
    questions_for_doctor: list[str] = Field(
        default_factory=list,
        description="2 to 3 helpful, simple questions the patient can ask their doctor or pharmacist",
    )


class AnalysisResponse(BaseModel):
    medicines: list[MedicineItem]
    summary: str
    disclaimer: str
    questions_for_doctor: list[str] = Field(default_factory=list)
    language: LanguageCode
    source: Literal["gemini", "sample", "mock"]
    processing_ms: int


class SamplePrescriptionMeta(BaseModel):
    id: str
    title_en: str
    title_hi: str
    subtitle_en: str
    subtitle_hi: str
    medicine_count: int
    has_unclear_item: bool
    image_url: str
