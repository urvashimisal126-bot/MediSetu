import io
from PIL import Image, ImageDraw, ImageFont

from schemas import AnalysisResponse, LanguageCode, MedicineItem, SamplePrescriptionMeta

DISCLAIMER_EN = "This is not medical advice. Please verify every medicine and dose with your doctor or pharmacist."
DISCLAIMER_HI = "यह चिकित्सीय सलाह नहीं है। कृपया हर दवा और उसकी खुराक की पुष्टि अपने डॉक्टर या फार्मासिस्ट से करें।"

SAMPLES_DATA: dict[str, dict] = {
    "fever-care": {
        "meta": SamplePrescriptionMeta(
            id="fever-care",
            title_en="Viral Fever & Throat Care",
            title_hi="वायरल बुखार और गले की देखभाल",
            subtitle_en="3 medicines · Clear printed Rx",
            subtitle_hi="3 दवाइयाँ · स्पष्ट प्रिंटेड पर्चा",
            medicine_count=3,
            has_unclear_item=False,
            image_url="/samples/fever-care/image",
        ),
        "rx_lines": [
            ("CLINIC", "Arogya Care Clinic · Dr. R. Sharma (MBBS, MD)"),
            ("META", "Patient: Rajesh Verma (Age 62)   Date: 18 Nov 2026"),
            ("DIAG", "C/O: Fever x 2 days, sore throat, mild cold"),
            ("RX", "1. Tab. Paracetamol 500mg — 1-1-1 (TDS) x 3 days [PC]"),
            ("RX", "2. Tab. Azithromycin 500mg — 1-0-0 (OD) x 3 days [1 hr AC]"),
            ("RX", "3. Tab. Cetirizine 10mg — 0-0-1 (HS) x 5 days [After dinner]"),
            ("ADV", "Advice: Drink warm fluids, adequate rest. Review if fever > 3 days."),
        ],
        "en": {
            "medicines": [
                MedicineItem(
                    name="Paracetamol 500mg",
                    purpose="Reduces fever, body ache, and headache",
                    dose="1 tablet",
                    timing=["morning", "afternoon", "night"],
                    instructions="Take after food with water",
                    duration="3 days",
                    low_confidence=False,
                ),
                MedicineItem(
                    name="Azithromycin 500mg",
                    purpose="Antibiotic that helps clear throat or bacterial infection",
                    dose="1 tablet",
                    timing=["morning"],
                    instructions="Take 1 hour before breakfast (or 2 hours after a meal). Complete all 3 days.",
                    duration="3 days",
                    low_confidence=False,
                ),
                MedicineItem(
                    name="Cetirizine 10mg",
                    purpose="Relieves runny nose, sneezing, and allergy symptoms",
                    dose="1 tablet",
                    timing=["night"],
                    instructions="Take after dinner. May cause mild sleepiness.",
                    duration="5 days",
                    low_confidence=False,
                ),
            ],
            "summary": "This prescription is for fever, throat infection, and cold relief. Take Paracetamol three times a day after meals, Azithromycin once each morning for 3 days, and Cetirizine at night for 5 days.",
            "disclaimer": DISCLAIMER_EN,
            "questions_for_doctor": [
                "Should I finish all 3 days of Azithromycin even if my fever goes away tomorrow?",
                "Can I stop Paracetamol early once my fever stays normal?",
                "Is Cetirizine safe to take alongside my regular daily medicines?",
            ],
        },
        "hi": {
            "medicines": [
                MedicineItem(
                    name="पैरासिटामोल 500mg (Paracetamol)",
                    purpose="बुखार, शरीर दर्द और सिरदर्द को कम करने के लिए",
                    dose="1 गोली",
                    timing=["morning", "afternoon", "night"],
                    instructions="खाना खाने के बाद पानी के साथ लें",
                    duration="3 दिन",
                    low_confidence=False,
                ),
                MedicineItem(
                    name="एज़िथ्रोमाइसिन 500mg (Azithromycin)",
                    purpose="एंटीबायोटिक दवा, जो गले और बैक्टीरिया के संक्रमण को ठीक करती है",
                    dose="1 गोली",
                    timing=["morning"],
                    instructions="नाश्ते से 1 घंटे पहले (या भोजन के 2 घंटे बाद) लें। पूरे 3 दिन का कोर्स पूरा करें।",
                    duration="3 दिन",
                    low_confidence=False,
                ),
                MedicineItem(
                    name="सेटिरिज़िन 10mg (Cetirizine)",
                    purpose="जुकाम, छींक और एलर्जी से राहत के लिए",
                    dose="1 गोली",
                    timing=["night"],
                    instructions="रात के खाने के बाद लें। इससे हल्की नींद आ सकती है।",
                    duration="5 दिन",
                    low_confidence=False,
                ),
            ],
            "summary": "यह पर्चा बुखार, गले के संक्रमण और जुकाम के इलाज के लिए है। पैरासिटामोल दिन में तीन बार खाने के बाद लें, एज़िथ्रोमाइसिन रोज़ सुबह 3 दिन तक लें, और सेटिरिज़िन रात को 5 दिन तक लें।",
            "disclaimer": DISCLAIMER_HI,
            "questions_for_doctor": [
                "क्या बुखार ठीक होने पर भी एज़िथ्रोमाइसिन का पूरा 3 दिन का कोर्स करना ज़रूरी है?",
                "क्या बुखार उतरने के बाद मैं पैरासिटामोल बंद कर सकता/सकती हूँ?",
                "अगर 3 दिन बाद भी बुखार बना रहे तो मुझे कब दोबारा दिखाना चाहिए?",
            ],
        },
    },
    "chronic-care": {
        "meta": SamplePrescriptionMeta(
            id="chronic-care",
            title_en="Blood Pressure & Sugar Routine",
            title_hi="ब्लड प्रेशर और शुगर की नियमित दवा",
            subtitle_en="3 medicines · Monthly schedule",
            subtitle_hi="3 दवाइयाँ · मासिक रूटीन",
            medicine_count=3,
            has_unclear_item=False,
            image_url="/samples/chronic-care/image",
        ),
        "rx_lines": [
            ("CLINIC", "Jeevan Setu Polyclinic · Dr. M. Kulkarni (MD Medicine)"),
            ("META", "Patient: Savitri Devi (Age 68)   Date: 18 Nov 2026"),
            ("DIAG", "Follow-up: T2DM & Essential Hypertension"),
            ("RX", "1. Tab. Metformin 500mg SR — 1-0-1 (BD) x 30 days [With meals]"),
            ("RX", "2. Tab. Amlodipine 5mg — 1-0-0 (OD) x 30 days [Morning]"),
            ("RX", "3. Tab. Atorvastatin 10mg — 0-0-1 (HS) x 30 days [After dinner]"),
            ("ADV", "Advice: Low salt diet, 20 min daily walk. Review with FBS/PPBS in 1 month."),
        ],
        "en": {
            "medicines": [
                MedicineItem(
                    name="Metformin 500mg SR",
                    purpose="Helps keep blood sugar levels under control",
                    dose="1 tablet",
                    timing=["morning", "night"],
                    instructions="Take with or right after breakfast and dinner. Swallow whole, do not crush.",
                    duration="30 days",
                    low_confidence=False,
                ),
                MedicineItem(
                    name="Amlodipine 5mg",
                    purpose="Helps lower and control high blood pressure",
                    dose="1 tablet",
                    timing=["morning"],
                    instructions="Take at the same time every morning, with or without food",
                    duration="30 days",
                    low_confidence=False,
                ),
                MedicineItem(
                    name="Atorvastatin 10mg",
                    purpose="Helps lower cholesterol and protect heart health",
                    dose="1 tablet",
                    timing=["night"],
                    instructions="Take once at night after dinner",
                    duration="30 days",
                    low_confidence=False,
                ),
            ],
            "summary": "This is a 30-day daily routine for managing blood sugar, blood pressure, and cholesterol. Take Metformin morning and night with meals, Amlodipine every morning, and Atorvastatin at night.",
            "disclaimer": DISCLAIMER_EN,
            "questions_for_doctor": [
                "What should I do if I accidentally miss my morning blood pressure tablet?",
                "Do I need to check my fasting blood sugar before my next 30-day visit?",
                "Are there any foods or painkillers I should avoid with these medicines?",
            ],
        },
        "hi": {
            "medicines": [
                MedicineItem(
                    name="मेटफॉर्मिन 500mg SR (Metformin)",
                    purpose="ब्लड शुगर (मधुमेह) को नियंत्रित रखने के लिए",
                    dose="1 गोली",
                    timing=["morning", "night"],
                    instructions="सुबह नाश्ते और रात के खाने के साथ या तुरंत बाद लें। गोली को पूरा निगलें, तोड़ें नहीं।",
                    duration="30 दिन",
                    low_confidence=False,
                ),
                MedicineItem(
                    name="एम्लोडिपिन 5mg (Amlodipine)",
                    purpose="उच्च रक्तचाप (हाई ब्लड प्रेशर) को कम और सामान्य रखने के लिए",
                    dose="1 गोली",
                    timing=["morning"],
                    instructions="रोज़ सुबह एक ही समय पर लें (खाने के साथ या बिना खाने के)",
                    duration="30 दिन",
                    low_confidence=False,
                ),
                MedicineItem(
                    name="एटोरवास्टेटिन 10mg (Atorvastatin)",
                    purpose="कोलेस्ट्रॉल को कम करने और हृदय को स्वस्थ रखने के लिए",
                    dose="1 गोली",
                    timing=["night"],
                    instructions="रोज़ रात को खाने के बाद लें",
                    duration="30 दिन",
                    low_confidence=False,
                ),
            ],
            "summary": "यह ब्लड शुगर, ब्लड प्रेशर और कोलेस्ट्रॉल को नियंत्रित रखने के लिए 30 दिन की नियमित दवाइयों का शेड्यूल है। मेटफॉर्मिन सुबह-शाम खाने के साथ, एम्लोडिपिन रोज़ सुबह, और एटोरवास्टेटिन रात को लें।",
            "disclaimer": DISCLAIMER_HI,
            "questions_for_doctor": [
                "अगर सुबह की ब्लड प्रेशर की गोली छूट जाए, तो मुझे क्या करना चाहिए?",
                "क्या अगले महीने की विज़िट से पहले खाली पेट शुगर की जांच करानी होगी?",
                "क्या इन दवाइयों के साथ किसी खास खाने या दर्द की दवा से परहेज़ करना है?",
            ],
        },
    },
    "handwritten-unclear": {
        "meta": SamplePrescriptionMeta(
            id="handwritten-unclear",
            title_en="Clinic Note (1 Unclear Item)",
            title_hi="क्लिनिक पर्चा (1 अस्पष्ट दवा)",
            subtitle_en="3 medicines · Shows safety flag",
            subtitle_hi="3 दवाइयाँ · सुरक्षा चेतावनी सहित",
            medicine_count=3,
            has_unclear_item=True,
            image_url="/samples/handwritten-unclear/image",
        ),
        "rx_lines": [
            ("CLINIC", "City Medical Centre · Dr. A. Nair (MBBS)"),
            ("META", "Patient: Mohan Lal (Age 54)   Date: 18 Nov 2026"),
            ("DIAG", "C/O: Acidity, chest congestion & cough"),
            ("RX", "1. Cap. Pantoprazole 40mg — 1-0-0 (OD) x 14 days [30 min AC]"),
            ("RX", "2. Tab. Amoxyclav 625mg — 1-0-1 (BD) x 5 days [PC]"),
            ("UNCLEAR", "3. Tab. M~nteluk~st (?) 10mg — 0-0-1 [handwriting smudged] x 10d"),
            ("ADV", "Advice: Avoid spicy food. Confirm item #3 with pharmacist."),
        ],
        "en": {
            "medicines": [
                MedicineItem(
                    name="Pantoprazole 40mg",
                    purpose="Reduces stomach acid, heartburn, and protects the stomach lining",
                    dose="1 capsule",
                    timing=["morning"],
                    instructions="Take 30 minutes before breakfast on an empty stomach",
                    duration="14 days",
                    low_confidence=False,
                ),
                MedicineItem(
                    name="Amoxicillin + Clavulanate 625mg",
                    purpose="Antibiotic used to treat bacterial chest or throat infections",
                    dose="1 tablet",
                    timing=["morning", "night"],
                    instructions="Take after meals to avoid stomach upset. Complete the full 5-day course.",
                    duration="5 days",
                    low_confidence=False,
                ),
                MedicineItem(
                    name="Montelukast 10mg (Unclear text)",
                    purpose="Often used for breathing allergies or nighttime cough — please confirm exact medicine",
                    dose="1 tablet",
                    timing=["night"],
                    instructions="The written name is partially smudged. Confirm exact spelling and dose with your pharmacist before taking.",
                    duration="10 days",
                    low_confidence=True,
                ),
            ],
            "summary": "This prescription treats acidity and a chest infection. Pantoprazole goes before breakfast, Amoxyclav goes morning and night after food, and the third medicine has unclear handwriting that must be verified before taking.",
            "disclaimer": DISCLAIMER_EN,
            "questions_for_doctor": [
                "Could you confirm the exact name and strength of the 3rd medicine written at the bottom?",
                "Should I take Pantoprazole 30 minutes before eating every morning?",
                "What warning signs mean I should come back before the 5-day antibiotic finishes?",
            ],
        },
        "hi": {
            "medicines": [
                MedicineItem(
                    name="पैंटोप्राज़ोल 40mg (Pantoprazole)",
                    purpose="पेट की गैस, एसिडिटी और जलन को कम करने के लिए",
                    dose="1 कैप्सूल",
                    timing=["morning"],
                    instructions="सुबह खाली पेट, नाश्ते से 30 मिनट पहले लें",
                    duration="14 दिन",
                    low_confidence=False,
                ),
                MedicineItem(
                    name="एमॉक्सिक्लैव 625mg (Amoxyclav)",
                    purpose="छाती या गले के बैक्टीरियल संक्रमण के इलाज के लिए एंटीबायोटिक",
                    dose="1 गोली",
                    timing=["morning", "night"],
                    instructions="सुबह और रात खाना खाने के बाद लें। 5 दिन का पूरा कोर्स करें।",
                    duration="5 दिन",
                    low_confidence=False,
                ),
                MedicineItem(
                    name="मोंटेलुकास्ट 10mg (लिखावट अस्पष्ट)",
                    purpose="संभवतः खांसी या सांस की एलर्जी के लिए — कृपया दवा का सही नाम जांच लें",
                    dose="1 गोली",
                    timing=["night"],
                    instructions="पर्चे पर इस दवा का नाम थोड़ा धुंधला है। इसे लेने से पहले डॉक्टर या मेडिकल स्टोर से नाम और मात्रा की पुष्टि ज़रूर करें।",
                    duration="10 दिन",
                    low_confidence=True,
                ),
            ],
            "summary": "यह पर्चा एसिडिटी और छाती के संक्रमण के लिए है। पैंटोप्राज़ोल सुबह खाली पेट लें, एमॉक्सिक्लैव सुबह-रात खाने के बाद लें, और तीसरी दवा की लिखावट अस्पष्ट है — लेने से पहले डॉक्टर या फार्मासिस्ट से ज़रूर पूछें।",
            "disclaimer": DISCLAIMER_HI,
            "questions_for_doctor": [
                "कृपया पर्चे में लिखी तीसरी दवा का सही नाम और पावर (mg) बता दीजिए।",
                "क्या पैंटोप्राज़ोल रोज़ सुबह नाश्ते से आधा घंटा पहले लेना है?",
                "एंटीबायोटिक लेते समय किन बातों का ध्यान रखना चाहिए?",
            ],
        },
    },
}


def list_samples() -> list[SamplePrescriptionMeta]:
    return [entry["meta"] for entry in SAMPLES_DATA.values()]


def get_sample_analysis(sample_id: str, language: LanguageCode) -> AnalysisResponse | None:
    entry = SAMPLES_DATA.get(sample_id)
    if not entry:
        return None
    lang_data = entry[language]
    return AnalysisResponse(
        medicines=lang_data["medicines"],
        summary=lang_data["summary"],
        disclaimer=lang_data["disclaimer"],
        questions_for_doctor=lang_data["questions_for_doctor"],
        language=language,
        source="sample",
        processing_ms=280,
    )


def get_mock_analysis(language: LanguageCode) -> AnalysisResponse:
    base = get_sample_analysis("fever-care", language)
    assert base is not None
    return base.model_copy(update={"source": "mock", "processing_ms": 340})


def _load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = (
        ["C:/Windows/Fonts/arialbd.ttf", "C:/Windows/Fonts/segoeuib.ttf", "DejaVuSans-Bold.ttf"]
        if bold
        else ["C:/Windows/Fonts/arial.ttf", "C:/Windows/Fonts/segoeui.ttf", "DejaVuSans.ttf"]
    )
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def render_sample_prescription_png(sample_id: str) -> bytes | None:
    entry = SAMPLES_DATA.get(sample_id)
    if not entry:
        return None

    width, height = 960, 680
    img = Image.new("RGB", (width, height), color=(253, 252, 248))
    draw = ImageDraw.Draw(img)

    # Subtle paper border & header band
    draw.rectangle([0, 0, width, 118], fill=(15, 118, 110))
    draw.rectangle([16, 16, width - 16, height - 16], outline=(203, 213, 225), width=2)

    title_font = _load_font(28, bold=True)
    sub_font = _load_font(19, bold=False)
    rx_symbol_font = _load_font(54, bold=True)
    body_font = _load_font(23, bold=False)
    bold_body_font = _load_font(23, bold=True)
    note_font = _load_font(19, bold=False)

    y = 32
    rx_y = 250
    for kind, text in entry["rx_lines"]:
        if kind == "CLINIC":
            draw.text((40, y), text, fill=(255, 255, 255), font=title_font)
            y += 42
            draw.text((40, y), "Reg. No: MCI-48219  ·  Outpatient Prescription Slip", fill=(204, 251, 241), font=sub_font)
        elif kind == "META":
            draw.text((40, 140), text, fill=(30, 41, 59), font=sub_font)
            draw.line([(40, 174), (width - 40, 174)], fill=(203, 213, 225), width=2)
        elif kind == "DIAG":
            draw.text((40, 190), text, fill=(71, 85, 105), font=sub_font)
            draw.text((40, 232), "Rx", fill=(15, 118, 110), font=rx_symbol_font)
            rx_y = 305
        elif kind == "RX":
            draw.text((70, rx_y), text, fill=(15, 23, 42), font=bold_body_font)
            draw.line([(70, rx_y + 36), (width - 60, rx_y + 36)], fill=(241, 245, 249), width=1)
            rx_y += 62
        elif kind == "UNCLEAR":
            draw.rounded_rectangle([58, rx_y - 8, width - 58, rx_y + 38], radius=8, fill=(254, 243, 199), outline=(245, 158, 11), width=2)
            draw.text((70, rx_y), text, fill=(146, 64, 14), font=body_font)
            rx_y += 64
        elif kind == "ADV":
            draw.line([(40, height - 118), (width - 40, height - 118)], fill=(203, 213, 225), width=2)
            draw.text((40, height - 96), text, fill=(51, 65, 85), font=note_font)
            draw.text((width - 270, height - 56), "Signature: Dr. Clinic", fill=(100, 116, 139), font=sub_font)

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()
