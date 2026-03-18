# LLM Prompt Design

## VetRecords — Claude Prompt Templates

These prompts are the core of the extraction system. They were designed by analyzing real clinical history documents (Marley from Kivet, Alya from HV Costa Azahar) and observing the patterns, abbreviations, and inconsistencies that the LLM needs to handle.

---

## Prompt 1: Extract Pet Profile

**When**: After text extraction, before visit structuring.
**Input**: The header/top portion of the document (everything before the first visit date).
**Output**: Structured JSON with pet and owner information.

```
SYSTEM:
You are a veterinary medical records analyst. Your job is to extract structured patient information from veterinary clinical history documents.

You will receive the header section of a clinical history document in Spanish. Extract the pet and owner information into the exact JSON format specified below.

Rules:
- Extract ONLY information that is explicitly stated in the text.
- If a field is not found in the text, use null — never guess or infer.
- Dates should be in ISO format (YYYY-MM-DD).
- Preserve original language for names and addresses.
- "Canino" → "Canine", "Felino" → "Feline" for species. Keep breed in original language.
- Sex: normalize to "Male" or "Female". Spanish: "M" or "Macho" → "Male", "H" or "Hembra" → "Female".

Return ONLY valid JSON, no markdown, no explanation.

USER:
Extract pet and owner information from this clinical history header:

---
{header_text}
---

Return this exact JSON structure:
{
  "pet": {
    "name": "string or null",
    "species": "Canine | Feline | Avian | Exotic | null",
    "breed": "string or null",
    "date_of_birth": "YYYY-MM-DD or null",
    "sex": "Male | Female | null",
    "microchip_id": "string or null",
    "coat": "string or null"
  },
  "owner": {
    "name": "string or null",
    "phone": "string or null",
    "address": "string or null",
    "email": "string or null"
  },
  "clinic": {
    "name": "string or null",
    "address": "string or null"
  }
}
```

### Example Input (Marley)
```
PARQUE OESTE
AVDA EUROPA
28922 ALCORCÓN
Linea 4
Datos de la Mascota
Sexo M
Datos del Cliente
MARLEY
Canino
Labrador Retriever
04/10/19
941000024967769
Nombre
Especie
Raza
F/Nto
Capa
Nº Chip
BEATRIZ ABARCA
C/ ORTEGA Y GASSET 1 PORTAL 3 1F
BOADILLA
28660 MADRID
HISTORIAL COMPLETO DE MARLEY DESDE LA PRIMERA VISITA A NUESTRO CENTRO
```

### Expected Output (Marley)
```json
{
  "pet": {
    "name": "Marley",
    "species": "Canine",
    "breed": "Labrador Retriever",
    "date_of_birth": "2019-10-04",
    "sex": "Male",
    "microchip_id": "941000024967769",
    "coat": null
  },
  "owner": {
    "name": "Beatriz Abarca",
    "phone": null,
    "address": "C/ Ortega y Gasset 1 Portal 3 1F, Boadilla, 28660 Madrid",
    "email": null
  },
  "clinic": {
    "name": "Kivet Parque Oeste",
    "address": "Avda Europa, 28922 Alcorcón"
  }
}
```

### Example Input (Alya)
```
HV COSTA AZAHAR
MASCOTA
ALYA - Nacimiento: 05/07/2018
CANINA - YORKSHIRE TERRIER
Sexo: Hembra Estado: FERTIL Peso: 0
Pelo: LARGO Capa: GRIS
Chip: 00023035139 NHC: C
```

### Expected Output (Alya)
```json
{
  "pet": {
    "name": "Alya",
    "species": "Canine",
    "breed": "Yorkshire Terrier",
    "date_of_birth": "2018-07-05",
    "sex": "Female",
    "microchip_id": "00023035139",
    "coat": "Long, Grey"
  },
  "owner": {
    "name": null,
    "phone": null,
    "address": null,
    "email": null
  },
  "clinic": {
    "name": "HV Costa Azahar",
    "address": null
  }
}
```

---

## Prompt 2: Structure Visit Batch

**When**: After pet profile extraction and regex visit splitting.
**Input**: A batch of 1-15 visit text chunks.
**Output**: Structured JSON array with one object per visit.

```
SYSTEM:
You are a veterinary medical records analyst. Your job is to extract structured clinical information from individual veterinary visit notes.

You will receive a batch of visit notes from a Spanish veterinary clinical history. Each visit is separated by "---VISIT---" markers. Structure each visit into the exact JSON format specified below.

Rules:
- Extract ONLY information explicitly stated in the text.
- If a field is not found, use null (for strings) or empty array [] (for lists).
- Dates: convert to ISO format (YYYY-MM-DD). Handle "dd/mm/yy" and "dd/mm/yyyy".
- Visit types: classify as one of: "consultation", "emergency", "vaccination", "follow_up", "phone_call", "hospitalization", "surgery", "administrative", "lab_results".
- Vital signs: extract temperature (°C), weight (kg), heart rate (bpm), respiratory rate (rpm) when mentioned.
- Weight: appears in many forms — "4.1kg", "pv 15kg", "Peso 7 kg", "28.1kg". Always extract as number in kg.
- Medications: extract name, dosage, frequency, duration, and route when available.
  - Routes: "SC" = subcutaneous, "IV" = intravenous, "PO" = oral, "topical" = topical.
  - Frequency: "SID" = once daily, "BID" = twice daily, "TID" = three times daily, "cada 12h" = every 12 hours, "cada 24h" = every 24 hours.
- Lab results: extract test name, result value, reference range (if given), and interpretation.
- Vaccinations: extract vaccine name and date administered.
- Diagnosis: extract as a list of conditions. Include suspected/presumptive diagnoses marked as such.

Common Spanish veterinary abbreviations:
- "EFG" or "EF" = Exploración física general (physical examination)
- "tto" = tratamiento (treatment)
- "pv" = peso vivo (body weight)
- "comp" = comprimido (tablet)
- "Tª" or "T:" = temperatura (temperature)
- "FC" = frecuencia cardíaca (heart rate)
- "FR" = frecuencia respiratoria (respiratory rate)
- "TRC" = tiempo de relleno capilar (capillary refill time)
- "DH" = deshidratación (dehydration)
- "Dx" = diagnóstico (diagnosis)
- "Rx" = radiografía (X-ray)
- "Eco" = ecografía (ultrasound)
- "AB" = antibiótico (antibiotic)
- "vac" = vacuna (vaccine)

Return ONLY a valid JSON array. No markdown, no explanation.

USER:
Structure each visit below into JSON. Visits are separated by "---VISIT---".

---VISIT---
{visit_chunk_1}
---VISIT---
{visit_chunk_2}
---VISIT---
{visit_chunk_3}
...

Return this exact JSON structure — one object per visit, in the same order:
[
  {
    "date": "YYYY-MM-DD or null",
    "time": "HH:MM or null",
    "visit_type": "consultation | emergency | vaccination | follow_up | phone_call | hospitalization | surgery | administrative | lab_results",
    "reason": "string — why the pet came in (1-2 sentences, translated to English)",
    "examination": "string — physical exam findings (translated to English) or null",
    "vital_signs": {
      "temperature_celsius": "number or null",
      "weight_kg": "number or null",
      "heart_rate_bpm": "number or null",
      "respiratory_rate_rpm": "number or null",
      "other": "string or null"
    },
    "diagnosis": ["string — each diagnosis as a separate item"],
    "treatment": {
      "medications": [
        {
          "name": "string",
          "dosage": "string or null",
          "frequency": "string or null",
          "duration": "string or null",
          "route": "oral | subcutaneous | intravenous | topical | intramuscular | other | null"
        }
      ],
      "procedures": ["string — each procedure as a separate item"],
      "diet": "string or null",
      "recommendations": ["string — each recommendation as a separate item"]
    },
    "lab_results": [
      {
        "test_name": "string",
        "result": "string",
        "reference_range": "string or null",
        "interpretation": "string or null"
      }
    ],
    "vaccinations": [
      {
        "name": "string",
        "date_administered": "YYYY-MM-DD"
      }
    ],
    "notes": "string — any additional context, owner instructions, or follow-up plans not captured above. Null if nothing extra.",
    "veterinarian": "string or null"
  }
]
```

### Example Input (3 visits from Marley)
```
---VISIT---
- 08/12/19 - 16:12 -
Vienen de urgencias porque tiene una costrita en la epd y les preocupa que puedan ser hongos.
Lleva con ellos desde ayer y le notan algo apatico.
4.1kg
Era el más pequeño de la camada y tiene parásitos, han visto gusanos en las heces.
Exploracion:
- muy deshidratado, ayer en el coche vomito 3 veces mucho contenido acuoso y estuvo h sin beber agua
- muy muy delgado
- dientes muy amarillos
- ligera hipotermia 37ºC
- la costra no tiene alopecia asociada, lo rapo yo y hago cura y no parecen hongos, hay inflamacion en la piel y parece un mordisco o un golpe, observar, curas con cristalmina dos veces al dia y mantener medidas de higiene.
Se queda hospitalizado con RL durante todo el día y se va un poco más hidratado y con Tª estable
Mañana volver para hospitalizar.
Dieta i/d
4.4kg
En casa:
Lata i/d 1/2 lata de aqui a mañana a las 11.30
Si hace caca coger muestra de heces, conservar en frío.
Curas en la herida de la pata 2 veces al día con cristalmina
PLAN CACHORRO BIENESTAR
---VISIT---
- 10/12/19 - 10:25 -
Exploracion todo ok
4.6kg
Las heces que ha hecho son normales.
Mañana vamos a dar la desparasitacion con milpro que tenian ellos.
Curo la herida.
Volveremos a revisar el jueves y ponemos el chip
Copro seriado: NEGATIVO
Si echa parasitos traer otra muestra para ver si vemos huevos, avisados
---VISIT---
- 04/01/20 - 10:50
7.97kg
37.7ºC
Al llegar a casa el ultimo dia echo un espejito de un cojin.
Abdomen blando depresible, no tiene dolor.
Tiene temblor en las patas delanteras cuando se sienta y gira de lado, no tiene molestias a la palpacion ni movilizacion de ninguna articulacion.
Lo observaremos de aqui a la proxima visita y si sigue igual suplementaremos con synoquin growth
PONGO VACUNA HEPTAVALENTE NOVIBAC DHPPI+L4
```

### Expected Output
```json
[
  {
    "date": "2019-12-08",
    "time": "16:12",
    "visit_type": "emergency",
    "reason": "Emergency visit. Scab on leg, owners worried about possible fungal infection. Pet has been with them since yesterday, appears apathetic.",
    "examination": "Very dehydrated — vomited 3 times in the car yesterday, went hours without drinking. Very underweight. Yellow teeth. Mild hypothermia at 37°C. Scab has no associated alopecia, shaved and cleaned — does not appear fungal, inflammation suggests a bite or impact wound.",
    "vital_signs": {
      "temperature_celsius": 37.0,
      "weight_kg": 4.1,
      "heart_rate_bpm": null,
      "respiratory_rate_rpm": null,
      "other": "Discharged at 4.4kg after rehydration"
    },
    "diagnosis": ["Dehydration", "Intestinal parasites (worms visible in feces)", "Skin wound (non-fungal, suspected bite or trauma)"],
    "treatment": {
      "medications": [
        {"name": "Cristalmina", "dosage": "topical", "frequency": "twice daily", "duration": "until healed", "route": "topical"}
      ],
      "procedures": ["Hospitalized with IV Ringer Lactate for the day", "Wound shaved and cleaned"],
      "diet": "Hill's i/d — 1/2 can until tomorrow 11:30",
      "recommendations": ["Return tomorrow for hospitalization", "Collect feces sample if defecates, keep cold", "Maintain wound hygiene"]
    },
    "lab_results": [],
    "vaccinations": [],
    "notes": "Smallest of the litter. Enrolled in PLAN CACHORRO BIENESTAR.",
    "veterinarian": null
  },
  {
    "date": "2019-12-10",
    "time": "10:25",
    "visit_type": "follow_up",
    "reason": "Follow-up after emergency hospitalization.",
    "examination": "General examination normal. Wound healing.",
    "vital_signs": {
      "temperature_celsius": null,
      "weight_kg": 4.6,
      "heart_rate_bpm": null,
      "respiratory_rate_rpm": null,
      "other": null
    },
    "diagnosis": [],
    "treatment": {
      "medications": [],
      "procedures": ["Wound care"],
      "diet": null,
      "recommendations": ["Deworming tomorrow with Milpro (owner has it)", "Review Thursday to place microchip", "If parasites appear, bring another feces sample"]
    },
    "lab_results": [
      {"test_name": "Copro seriado (serial coprological)", "result": "Negative", "reference_range": null, "interpretation": null}
    ],
    "vaccinations": [],
    "notes": "Feces are normal.",
    "veterinarian": null
  },
  {
    "date": "2020-01-04",
    "time": "10:50",
    "visit_type": "vaccination",
    "reason": "Routine visit. Owner reports pet expelled a small piece of cushion. Trembling in front legs when sitting and turning.",
    "examination": "Abdomen soft, depressible, no pain. Front leg trembling — no pain or discomfort on palpation or mobilization of any joint.",
    "vital_signs": {
      "temperature_celsius": 37.7,
      "weight_kg": 7.97,
      "heart_rate_bpm": null,
      "respiratory_rate_rpm": null,
      "other": null
    },
    "diagnosis": [],
    "treatment": {
      "medications": [],
      "procedures": [],
      "diet": null,
      "recommendations": ["Monitor leg trembling until next visit", "Supplement with Synoquin Growth if persists"]
    },
    "lab_results": [],
    "vaccinations": [
      {"name": "Heptavalente Novibac DHPPI+L4", "date_administered": "2020-01-04"}
    ],
    "notes": null,
    "veterinarian": null
  }
]
```

---

## Multilingual Strategy

### The Challenge

Veterinary documents can arrive in any language. Real-world scenarios:
- A pet transfers between clinics in different countries
- Referral documents from international specialists
- Pet owners who relocate bring records in their original language

### Our Approach: Detect → Adapt Prompt → Normalize Output

```
Document (any language)
    │
    ▼
Text Extraction (language-agnostic for PDF/DOCX, language param for OCR)
    │
    ▼
Language Detection (lightweight, before LLM call)
    │
    ├── Spanish detected → load Spanish abbreviation glossary
    ├── English detected → load English abbreviation glossary
    ├── French detected  → load French abbreviation glossary
    ├── Portuguese detected → load Portuguese abbreviation glossary
    └── Other / unknown  → no glossary, rely on Claude's general knowledge
    │
    ▼
Claude Prompt (system prompt includes detected language + glossary)
    │
    ▼
Structured Output (ALWAYS in English — normalized)
    │
    ▼
Stored: structured data (English) + raw_text (original language) + detected_language
```

### Language Detection

We use a lightweight approach — no heavy NLP library needed:

```python
# services/language.py

from langdetect import detect, LangDetectException

SUPPORTED_LANGUAGES = {
    "es": "Spanish",
    "en": "English",
    "fr": "French",
    "pt": "Portuguese",
    "de": "German",
    "it": "Italian",
}

def detect_language(text: str) -> str:
    """Detect language from text. Returns ISO 639-1 code."""
    try:
        # Use first ~2000 chars for detection (faster, sufficient)
        lang = detect(text[:2000])
        return lang if lang in SUPPORTED_LANGUAGES else "unknown"
    except LangDetectException:
        return "unknown"
```

### Language-Specific Abbreviation Glossaries

```python
# prompts/glossaries.py

GLOSSARIES = {
    "es": """
Common Spanish veterinary abbreviations:
- "EFG" or "EF" = Exploración física general (physical examination)
- "tto" = tratamiento (treatment)
- "pv" = peso vivo (body weight)
- "comp" = comprimido (tablet)
- "Tª" or "T:" = temperatura (temperature)
- "FC" = frecuencia cardíaca (heart rate)
- "FR" = frecuencia respiratoria (respiratory rate)
- "TRC" = tiempo de relleno capilar (capillary refill time)
- "DH" = deshidratación (dehydration)
- "Dx" = diagnóstico (diagnosis)
- "Rx" = radiografía (X-ray)
- "Eco" = ecografía (ultrasound)
- "AB" = antibiótico (antibiotic)
- "vac" = vacuna (vaccine)
- "SID" = once daily, "BID" = twice daily, "TID" = three times daily
- "SC" = subcutaneous, "IV" = intravenous, "PO" = oral, "IM" = intramuscular
- "cada Xh" = every X hours
""",

    "en": """
Common English veterinary abbreviations:
- "PE" = physical examination
- "Tx" = treatment
- "BW" = body weight
- "tab" = tablet, "cap" = capsule
- "T" or "Temp" = temperature
- "HR" = heart rate
- "RR" = respiratory rate
- "CRT" = capillary refill time
- "DH" = dehydration
- "Dx" = diagnosis
- "Rx" = prescription
- "US" or "U/S" = ultrasound
- "ABx" = antibiotic
- "SID" = once daily, "BID" = twice daily, "TID" = three times daily, "QID" = four times daily
- "SC" / "SQ" = subcutaneous, "IV" = intravenous, "PO" = oral, "IM" = intramuscular
- "q4h" = every 4 hours, "q8h" = every 8 hours, "q12h" = every 12 hours
- "prn" = as needed
- "NPO" = nothing by mouth
""",

    "fr": """
Common French veterinary abbreviations:
- "EG" = examen général (physical examination)
- "ttt" = traitement (treatment)
- "PV" = poids vif (body weight)
- "cp" or "comp" = comprimé (tablet)
- "T°" = température (temperature)
- "FC" = fréquence cardiaque (heart rate)
- "FR" = fréquence respiratoire (respiratory rate)
- "TRC" = temps de remplissage capillaire (capillary refill time)
- "DH" = déshydratation (dehydration)
- "Rx" = radiographie (X-ray)
- "Echo" = échographie (ultrasound)
- "ATB" = antibiotique (antibiotic)
- "SC" = sous-cutané, "IV" = intraveineux, "PO" = per os
- "/j" = per day (e.g., "2x/j" = twice daily)
""",

    "pt": """
Common Portuguese veterinary abbreviations:
- "EF" = exame físico (physical examination)
- "tto" = tratamento (treatment)
- "PV" = peso vivo (body weight)
- "comp" = comprimido (tablet)
- "T" = temperatura (temperature)
- "FC" = frequência cardíaca (heart rate)
- "FR" = frequência respiratória (respiratory rate)
- "TPC" = tempo de preenchimento capilar (capillary refill time)
- "Dx" = diagnóstico (diagnosis)
- "Rx" = radiografia (X-ray)
- "US" = ultrassonografia (ultrasound)
- "AB" = antibiótico (antibiotic)
- "SC" = subcutâneo, "IV" = intravenoso, "VO" = via oral
- "SID" = uma vez ao dia, "BID" = duas vezes ao dia
""",
}

def get_glossary(language_code: str) -> str:
    """Return abbreviation glossary for the detected language."""
    return GLOSSARIES.get(language_code, "")
```

### Updated Prompt Template (Language-Aware)

The visit structuring prompt dynamically includes the detected language and glossary:

```python
# prompts/structure_visit.py

def build_structure_prompt(visit_chunks: list[str], language_code: str) -> str:
    glossary = get_glossary(language_code)
    language_name = SUPPORTED_LANGUAGES.get(language_code, "unknown")

    system_prompt = f"""You are a veterinary medical records analyst. Your job is to extract structured clinical information from individual veterinary visit notes.

The document is written in {language_name}. Structure each visit into the JSON format specified below.

Rules:
- Extract ONLY information explicitly stated in the text.
- If a field is not found, use null (for strings) or empty array [] (for lists).
- Dates: convert to ISO format (YYYY-MM-DD).
- ALL structured output must be in ENGLISH, regardless of the document language.
- Preserve original language ONLY for: pet names, owner names, medication brand names, clinic names, and addresses.
- Visit types: classify as one of: "consultation", "emergency", "vaccination", "follow_up", "phone_call", "hospitalization", "surgery", "administrative", "lab_results".

{glossary}

Return ONLY a valid JSON array. No markdown, no explanation."""

    # ... rest of prompt with visit chunks
```

### OCR Language Parameter

For image-based documents, Tesseract needs a language hint for better accuracy:

```python
# services/extraction.py

TESSERACT_LANG_MAP = {
    "es": "spa",
    "en": "eng",
    "fr": "fra",
    "pt": "por",
    "de": "deu",
    "it": "ita",
}

class ImageExtractor:
    def extract(self, file_path: str, language_hint: str = "es") -> str:
        tesseract_lang = TESSERACT_LANG_MAP.get(language_hint, "eng+spa")
        return pytesseract.image_to_string(
            Image.open(file_path),
            lang=tesseract_lang
        )
```

For the first extraction, we default to Spanish + English. If we detect a different language from the PDF/DOCX text, we can re-run OCR with the correct language for better accuracy.

### Regex Date Patterns — International

```python
# services/splitter.py

VISIT_DATE_PATTERNS = [
    # Spanish clinic styles (already supported)
    r'^-\s*(\d{1,2}/\d{1,2}/\d{2,4})\s*-\s*(\d{1,2}:\d{2})?\s*-?',
    r'VISITA\s+.*?DEL\s+D[ÍI]A\s+(\d{1,2}/\d{1,2}/\d{4})',

    # ISO format: 2024-07-17
    r'^(\d{4}-\d{2}-\d{2})\s',

    # European: 17.07.2024 or 17/07/2024
    r'^(\d{1,2}[./]\d{1,2}[./]\d{2,4})\s*[-:]',

    # English style: "Visit on July 17, 2024" or "Date: 07/17/2024"
    r'(?:Visit|Date|Consultation)\s*(?:on|:)\s*(\d{1,2}/\d{1,2}/\d{4})',

    # French style: "Consultation du 17/07/2024"
    r'Consultation\s+du\s+(\d{1,2}/\d{1,2}/\d{4})',

    # Portuguese style: "Consulta em 17/07/2024"
    r'Consulta\s+em\s+(\d{1,2}/\d{1,2}/\d{4})',
]
```

### Data Model — Language Field

```python
# models/document.py

class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    content_type = Column(String, nullable=False)
    extracted_text = Column(Text, nullable=True)
    detected_language = Column(String, default="unknown")  # ← NEW: "es", "en", "fr", etc.
    status = Column(String, default="uploading")
    ...
```

---

## Prompt Design Principles

### 1. Translate to English, preserve names
The structured output is in English for consistency, but pet names, owner names, medication brand names, and clinic names stay in their original language. This makes the data usable internationally while keeping identifiers accurate.

### 2. Language-adaptive abbreviation glossary
Abbreviation glossaries are loaded dynamically based on detected language. This prevents misinterpretation:
- Spanish: "pv 15kg" = body weight, "tto" = treatment
- English: "BW" = body weight, "Tx" = treatment
- French: "PV" = poids vif, "ttt" = traitement

### 3. Strict schema with null defaults
Every field has a clear type and null fallback. This means:
- The frontend knows exactly what to expect
- Missing data is explicit (null) not ambiguous (empty string? missing key?)
- Pydantic validation catches any schema violations before saving to DB

### 4. One prompt per task
We don't ask Claude to do pet extraction AND visit structuring in one call because:
- Smaller, focused prompts produce more reliable output
- If visit structuring fails, we still have the pet profile
- Pet extraction is always one small call; visit structuring may need batching

### 5. Few-shot examples from real data
The examples in these prompts come from Marley and Alya's actual documents. This grounds the LLM in real-world patterns rather than synthetic examples.

---

## Token Budget Estimates

| Prompt | Input tokens (approx) | Output tokens (approx) | Cost per call (Claude Sonnet) |
|--------|-----------------------|------------------------|------------------------------|
| Pet profile extraction | ~800 (system + header) | ~200 | ~$0.002 |
| Visit batch (15 visits) | ~15,000 (system + visits) | ~8,000 | ~$0.05 |
| Visit batch (5 visits) | ~5,000 | ~3,000 | ~$0.02 |

**Cost per document:**
- Small (5 visits): ~$0.03 (2 calls)
- Medium (25 visits): ~$0.10 (3 calls)
- Large (50 visits): ~$0.20 (5 calls)
