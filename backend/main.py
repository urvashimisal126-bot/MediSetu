import os
from datetime import datetime, timezone

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from analyzer import (
    PrescriptionError,
    analyze_prescription_image,
    is_api_key_valid_format,
    translate_prescription_result,
)
from samples import get_sample_analysis, list_samples, render_sample_prescription_png
from schemas import (
    AnalysisResponse,
    LanguageCode,
    SamplePrescriptionMeta,
    TranslateRequest,
    VerifyResponse,
)
from verifier import verify_medicine_image

load_dotenv(override=True)

app = FastAPI(
    title="MediSetu API",
    description="AI-powered prescription explanation in plain English & Hindi. Images are processed in memory only.",
    version="1.0.0",
)

frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
allowed_origins = {
    frontend_origin,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
}
if "localhost" in frontend_origin:
    allowed_origins.add(frontend_origin.replace("localhost", "127.0.0.1"))
elif "127.0.0.1" in frontend_origin:
    allowed_origins.add(frontend_origin.replace("127.0.0.1", "localhost"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(allowed_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(PrescriptionError)
async def prescription_error_handler(_request, exc: PrescriptionError):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.message, "code": exc.code},
    )


@app.get("/health")
def health():
    load_dotenv(override=True)
    api_key = (os.getenv("GEMINI_API_KEY") or "").strip()
    use_mock = os.getenv("USE_MOCK", "false").strip().lower() == "true"
    model_name = (os.getenv("GEMINI_MODEL") or "gemini-3.8-flash").strip()
    return {
        "status": "ok",
        "service": "MediSetu API",
        "model": model_name,
        "use_mock": use_mock,
        "api_key_configured": bool(api_key and api_key != "your_key_here"),
        "api_key_valid_format": is_api_key_valid_format(api_key),
        "privacy": "in-memory-only",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/samples", response_model=list[SamplePrescriptionMeta])
def get_samples():
    return list_samples()


@app.get("/samples/{sample_id}/image")
def get_sample_image(sample_id: str):
    png_bytes = render_sample_prescription_png(sample_id)
    if png_bytes is None:
        raise HTTPException(status_code=404, detail="Sample prescription not found.")
    return Response(content=png_bytes, media_type="image/png")


@app.post("/analyze", response_model=AnalysisResponse)
async def analyze(
    file: UploadFile | None = File(default=None),
    image: UploadFile | None = File(default=None),
    medicine_images: list[UploadFile] | None = File(default=None),
    language: LanguageCode = Form("en"),
    demo_mode: bool = Form(False),
):
    load_dotenv(override=True)
    prescription_upload = image or file
    if prescription_upload is None:
        raise PrescriptionError(
            "Prescription image is required.",
            status_code=400,
            code="missing_image",
        )

    image_bytes = await prescription_upload.read()
    medicine_bytes_list: list[bytes] = []
    if medicine_images:
        for med_upload in medicine_images:
            if med_upload is None:
                continue
            medicine_bytes_list.append(await med_upload.read())

    return analyze_prescription_image(
        image_bytes=image_bytes,
        language=language,
        force_mock=demo_mode,
        medicine_images_bytes=medicine_bytes_list,
    )


@app.post("/analyze-sample", response_model=AnalysisResponse)
def analyze_sample(
    sample_id: str = Form(...),
    language: LanguageCode = Form("en"),
):
    result = get_sample_analysis(sample_id=sample_id, language=language)
    if result is None:
        raise HTTPException(status_code=404, detail="Sample prescription not found.")
    return result


@app.post("/translate", response_model=AnalysisResponse)
def translate(payload: TranslateRequest):
    load_dotenv(override=True)
    return translate_prescription_result(payload)


@app.post("/verify", response_model=VerifyResponse)
async def verify(
    image: UploadFile = File(...),
    medicines: str = Form(...),
    language: LanguageCode = Form("en"),
):
    load_dotenv(override=True)
    image_bytes = await image.read()
    return verify_medicine_image(
        image_bytes=image_bytes,
        medicines_raw=medicines,
        language=language,
        filename=image.filename or "",
    )
