from app.prompts.glossaries import get_glossary

SUPPORTED_LANGUAGES = {
    "es": "Spanish",
    "en": "English",
    "fr": "French",
    "pt": "Portuguese",
    "de": "German",
    "it": "Italian",
}

SYSTEM_PROMPT_TEMPLATE = """You are a veterinary medical records analyst. Your job is to extract structured clinical information from individual veterinary visit notes.

The document is written in {language_name}. Structure each visit into the JSON format specified below.

Rules:
- Extract ONLY information explicitly stated in the text.
- If a field is not found, use null (for strings) or empty array [] (for lists).
- Dates: convert to ISO format (YYYY-MM-DD). Handle "dd/mm/yy" and "dd/mm/yyyy".
- ALL structured output must be in ENGLISH, regardless of the document language.
- Preserve original language ONLY for: pet names, owner names, medication brand names, clinic names, and addresses.
- Visit types: classify as one of: "consultation", "emergency", "vaccination", "follow_up", "phone_call", "hospitalization", "surgery", "administrative", "lab_results".
- Vital signs: extract temperature (°C), weight (kg), heart rate (bpm), respiratory rate (rpm).
- Weight: appears in many forms — "4.1kg", "pv 15kg", "Peso 7 kg". Always extract as number in kg.
- Medications: extract name, dosage, frequency, duration, and route when available.
- Lab results: extract test name, result value, reference range (if given), and interpretation.
- Vaccinations: extract vaccine name and date administered.
- Diagnosis: extract as a list of conditions.

{glossary}

Return ONLY a valid JSON array. No markdown, no explanation."""

USER_PROMPT_TEMPLATE = """Structure each visit below into JSON. Visits are separated by "---VISIT---".

{visits_text}

Return this exact JSON structure — one object per visit, in the same order:
[
  {{
    "date": "YYYY-MM-DD or null",
    "time": "HH:MM or null",
    "visit_type": "consultation | emergency | vaccination | follow_up | phone_call | hospitalization | surgery | administrative | lab_results",
    "reason": "string — why the pet came in (1-2 sentences, in English)",
    "examination": "string — physical exam findings (in English) or null",
    "vital_signs": {{
      "temperature_celsius": "number or null",
      "weight_kg": "number or null",
      "heart_rate_bpm": "number or null",
      "respiratory_rate_rpm": "number or null",
      "other": "string or null"
    }},
    "diagnosis": ["string — each diagnosis as a separate item"],
    "treatment": {{
      "medications": [
        {{
          "name": "string",
          "dosage": "string or null",
          "frequency": "string or null",
          "duration": "string or null",
          "route": "oral | subcutaneous | intravenous | topical | intramuscular | other | null"
        }}
      ],
      "procedures": ["string — each procedure as a separate item"],
      "diet": "string or null",
      "recommendations": ["string — each recommendation as a separate item"]
    }},
    "lab_results": [
      {{
        "test_name": "string",
        "result": "string",
        "reference_range": "string or null",
        "interpretation": "string or null"
      }}
    ],
    "vaccinations": [
      {{
        "name": "string",
        "date_administered": "YYYY-MM-DD"
      }}
    ],
    "notes": "string — additional context or follow-up plans, or null",
    "veterinarian": "string or null"
  }}
]"""


def build_visit_structuring_prompt(
    visit_chunks: list[dict], language_code: str
) -> tuple[str, str]:
    """Build prompts for visit structuring."""
    glossary = get_glossary(language_code)
    language_name = SUPPORTED_LANGUAGES.get(language_code, "unknown")

    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(
        language_name=language_name,
        glossary=glossary,
    )

    # Join visit chunks with separator
    visits_text = "\n---VISIT---\n".join(
        chunk["text"] for chunk in visit_chunks
    )
    visits_text = "---VISIT---\n" + visits_text

    user_prompt = USER_PROMPT_TEMPLATE.format(visits_text=visits_text)

    return system_prompt, user_prompt
